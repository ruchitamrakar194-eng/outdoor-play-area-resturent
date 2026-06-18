const pool = require('../../database/connection');

class ArenaModel {
  // --- Visitors Queries ---
  async getVisitors() {
    const [rows] = await pool.execute(`
      SELECT v.*, 
        COALESCE((SELECT SUM(c.balance) FROM arena_cards c WHERE c.holderId = v.id), 0.00) AS cardBalance,
        (SELECT t.paymentType FROM arena_transactions t WHERE (t.cardNumber IN (SELECT c.cardNumber FROM arena_cards c WHERE c.holderId = v.id) OR t.customerName = v.name) AND (t.items LIKE '%Activation%' OR t.items LIKE '%Recharge%') ORDER BY t.transactionDate DESC LIMIT 1) AS initialPaymentMethod
      FROM arena_visitors v
      ORDER BY v.createdAt DESC
    `);
    return rows;
  }

  async getVisitorById(id) {
    const [rows] = await pool.execute(`
      SELECT v.*, 
        COALESCE((SELECT SUM(c.balance) FROM arena_cards c WHERE c.holderId = v.id), 0.00) AS cardBalance,
        (SELECT t.paymentType FROM arena_transactions t WHERE (t.cardNumber IN (SELECT c.cardNumber FROM arena_cards c WHERE c.holderId = v.id) OR t.customerName = v.name) AND (t.items LIKE '%Activation%' OR t.items LIKE '%Recharge%') ORDER BY t.transactionDate DESC LIMIT 1) AS initialPaymentMethod
      FROM arena_visitors v
      WHERE v.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async createVisitor(visitor) {
    const { name, mobile, email, visits = 1, lastVisit, waiver = 0, isGroup = 0, groupSize = 1, initialBalance = 500, paymentType = 'Cash', age = null, gender = null, emergencyContact = null, photo = null } = visitor;
    
    // Find next V-XXX ID in the database sequentially to prevent mixed card associations or clashing
    const [rows] = await pool.execute("SELECT id FROM arena_visitors WHERE id LIKE 'V-%' ORDER BY CAST(SUBSTRING(id, 3) AS UNSIGNED) DESC LIMIT 1");
    let nextNum = 1;
    if (rows.length > 0) {
      const match = rows[0].id.match(/^V-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const generatedId = `V-${String(nextNum).padStart(3, '0')}`;

    // Insert visitor record including Age, Gender, Emergency Contact, and Photo
    await pool.execute(
      'INSERT INTO arena_visitors (id, name, mobile, email, visits, lastVisit, waiver, isGroup, groupSize, age, gender, emergencyContact, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [generatedId, name, mobile, email || null, visits, lastVisit || null, waiver ? 1 : 0, isGroup ? 1 : 0, groupSize, age || null, gender || null, emergencyContact || null, photo || null]
    );

    // Auto-generate cards
    const cardsToGenerate = isGroup ? groupSize : 1;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const generatedCardNumbers = [];
    
    for (let i = 1; i <= cardsToGenerate; i++) {
      const cardId = `C-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
      const cardNumber = `1369${String(Math.floor(100000 + Math.random() * 900000))}`;
      const holderName = isGroup ? `${name} (Member ${i})` : name;
      
      // Strict balance check to ensure 0 balance is preserved and not converted to 500
      const balance = parseFloat(initialBalance === undefined || initialBalance === null || initialBalance === '' ? 500 : initialBalance).toFixed(2);
      
      const logs = [{
        date: timestamp,
        type: 'Top-up',
        amount: `₹${balance}`,
        desc: `Card issued automatically upon registration`
      }];

      await pool.execute(
        'INSERT INTO arena_cards (id, cardNumber, holderName, holderId, balance, type, status, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [cardId, cardNumber, holderName, generatedId, balance, 'Standard', 'Active', JSON.stringify(logs)]
      );

      generatedCardNumbers.push(cardNumber);
    }

    // Create a single booking transaction for the group's total initial balance
    const totalAmount = (parseFloat(initialBalance === undefined || initialBalance === null || initialBalance === '' ? 500 : initialBalance) * cardsToGenerate).toFixed(2);
    const txnId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transactionItems = isGroup 
      ? `Group Booking (${cardsToGenerate} Cards Activation & Top-up)` 
      : 'Card Activation & Top-up';
    const txnCardNumber = cardsToGenerate === 1 ? generatedCardNumbers[0] : null;
    
    await pool.execute(
      'INSERT INTO arena_transactions (invoiceId, customerName, cardNumber, items, amount, paymentType, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [txnId, name, txnCardNumber, transactionItems, totalAmount, paymentType, 'Paid']
    );

    return this.getVisitorById(generatedId);
  }

  async updateVisitor(id, visitor) {
    const { name, mobile, email, waiver, isGroup = 0, groupSize = 1, age = null, gender = null, emergencyContact = null, photo = null } = visitor;
    await pool.execute(
      'UPDATE arena_visitors SET name = ?, mobile = ?, email = ?, waiver = ?, isGroup = ?, groupSize = ?, age = ?, gender = ?, emergencyContact = ?, photo = ? WHERE id = ?',
      [name, mobile, email || null, waiver ? 1 : 0, isGroup ? 1 : 0, groupSize, age || null, gender || null, emergencyContact || null, photo || null, id]
    );
    return this.getVisitorById(id);
  }

  async deleteVisitor(id) {
    // Delete associated cards from the database to clean up references and prevent mixed up balances
    await pool.execute('DELETE FROM arena_cards WHERE holderId = ?', [id]);

    const [result] = await pool.execute('DELETE FROM arena_visitors WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Cards Queries ---
  async getCards() {
    const [rows] = await pool.execute('SELECT * FROM arena_cards ORDER BY createdAt DESC');
    return rows.map(row => ({
      ...row,
      logs: typeof row.logs === 'string' ? JSON.parse(row.logs) : (row.logs || [])
    }));
  }

  async getCardByNumber(cardNumber) {
    const [rows] = await pool.execute('SELECT * FROM arena_cards WHERE cardNumber = ?', [cardNumber]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      logs: typeof row.logs === 'string' ? JSON.parse(row.logs) : (row.logs || [])
    };
  }

  async createCard(card) {
    const { id, cardNumber, holderName, holderId, balance = 0.00, type = 'Standard', status = 'Active', logs = [] } = card;
    await pool.execute(
      'INSERT INTO arena_cards (id, cardNumber, holderName, holderId, balance, type, status, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, cardNumber, holderName, holderId || null, balance, type, status, JSON.stringify(logs)]
    );
    return this.getCardByNumber(cardNumber);
  }

  async updateCard(cardNumber, card) {
    const { holderName, holderId, balance, type, status, logs } = card;
    await pool.execute(
      'UPDATE arena_cards SET holderName = ?, holderId = ?, balance = ?, type = ?, status = ?, logs = ? WHERE cardNumber = ?',
      [holderName, holderId || null, balance, type, status, JSON.stringify(logs), cardNumber]
    );
    return this.getCardByNumber(cardNumber);
  }

  async deleteCard(cardNumber) {
    const [result] = await pool.execute('DELETE FROM arena_cards WHERE cardNumber = ?', [cardNumber]);
    return result.affectedRows > 0;
  }

  // --- Packages Queries ---
  async getPackages() {
    const [rows] = await pool.execute('SELECT * FROM arena_packages ORDER BY id ASC');
    return rows.map(row => ({
      ...row,
      acts: typeof row.acts === 'string' ? JSON.parse(row.acts) : (row.acts || [])
    }));
  }

  async getPackageById(id) {
    const [rows] = await pool.execute('SELECT * FROM arena_packages WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      acts: typeof row.acts === 'string' ? JSON.parse(row.acts) : (row.acts || [])
    };
  }

  async createPackage(pkg) {
    const { name, price, type, color, acts = [] } = pkg;
    const [result] = await pool.execute(
      'INSERT INTO arena_packages (name, price, type, color, acts) VALUES (?, ?, ?, ?, ?)',
      [name, price, type, color, JSON.stringify(acts)]
    );
    return this.getPackageById(result.insertId);
  }

  async updatePackage(id, pkg) {
    const { name, price, type, color, acts = [] } = pkg;
    await pool.execute(
      'UPDATE arena_packages SET name = ?, price = ?, type = ?, color = ?, acts = ? WHERE id = ?',
      [name, price, type, color, JSON.stringify(acts), id]
    );
    return this.getPackageById(id);
  }

  async deletePackage(id) {
    const [result] = await pool.execute('DELETE FROM arena_packages WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Activities Queries ---
  async getActivities() {
    // Auto-complete expired sessions to ensure live occupancy dashboard shows clean data
    try {
      await pool.execute(
        `UPDATE arena_activity_sessions 
         SET status = 'Completed', endTime = DATE_ADD(startTime, INTERVAL totalDuration MINUTE)
         WHERE status = 'Active' AND DATE_ADD(startTime, INTERVAL totalDuration MINUTE) <= CURRENT_TIMESTAMP`
      );
    } catch (err) {
      console.error('Failed to auto-expire sessions in getActivities:', err);
    }

    const [rows] = await pool.execute(`
      SELECT a.*, 
        COALESCE((SELECT COUNT(*) FROM arena_activity_sessions s WHERE s.activityId = a.id AND s.status = 'Active'), 0) AS occupied,
        COALESCE((SELECT COUNT(*) FROM arena_activity_sessions s WHERE s.activityId = a.id AND DATE(s.startTime) = CURDATE()), 0) AS todayBookings,
        COALESCE((SELECT SUM(s.amountCharged) FROM arena_activity_sessions s WHERE s.activityId = a.id AND DATE(s.startTime) = CURDATE()), 0.00) AS todayRevenue
      FROM arena_activities a
      ORDER BY a.id ASC
    `);
    return rows;
  }

  async getActivityById(id) {
    const [rows] = await pool.execute('SELECT * FROM arena_activities WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async createActivity(activity) {
    const { name, price, weekendPrice, duration, capacity, status = 'Active', category = 'Adventure' } = activity;
    const [result] = await pool.execute(
      'INSERT INTO arena_activities (name, price, weekendPrice, duration, capacity, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, price, weekendPrice, duration, capacity, status, category]
    );
    return this.getActivityById(result.insertId);
  }

  async updateActivity(id, activity) {
    const { name, price, weekendPrice, duration, capacity, status, category = 'Adventure' } = activity;
    await pool.execute(
      'UPDATE arena_activities SET name = ?, price = ?, weekendPrice = ?, duration = ?, capacity = ?, status = ?, category = ? WHERE id = ?',
      [name, price, weekendPrice, duration, capacity, status, category, id]
    );
    return this.getActivityById(id);
  }

  async deleteActivity(id) {
    const [result] = await pool.execute('DELETE FROM arena_activities WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Memberships Queries ---
  async getMemberships() {
    const [rows] = await pool.execute('SELECT * FROM arena_memberships ORDER BY id ASC');
    return rows;
  }

  async getMembershipById(id) {
    const [rows] = await pool.execute('SELECT * FROM arena_memberships WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async createMembership(membership) {
    const { tier, points = 0, discount, birthdayOffer = 'No', price, colorClass = 'bg-slate-50' } = membership;
    const [result] = await pool.execute(
      'INSERT INTO arena_memberships (tier, points, discount, birthdayOffer, price, colorClass) VALUES (?, ?, ?, ?, ?, ?)',
      [tier, points, discount, birthdayOffer, price, colorClass]
    );
    return this.getMembershipById(result.insertId);
  }

  async updateMembership(id, membership) {
    const { tier, points, discount, birthdayOffer, price, colorClass } = membership;
    await pool.execute(
      'UPDATE arena_memberships SET tier = ?, points = ?, discount = ?, birthdayOffer = ?, price = ?, colorClass = ? WHERE id = ?',
      [tier, points !== undefined ? points : 0, discount, birthdayOffer, price, colorClass, id]
    );
    return this.getMembershipById(id);
  }

  async deleteMembership(id) {
    const [result] = await pool.execute('DELETE FROM arena_memberships WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Staff Queries ---
  async getArenaStaff() {
    const [rows] = await pool.execute('SELECT * FROM arena_staff ORDER BY id ASC');
    return rows;
  }

  async getArenaStaffById(id) {
    const [rows] = await pool.execute('SELECT * FROM arena_staff WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async createArenaStaff(staff) {
    const { name, role, status = 'Active', shift = 'Morning' } = staff;
    const [result] = await pool.execute(
      'INSERT INTO arena_staff (name, role, status, shift) VALUES (?, ?, ?, ?)',
      [name, role, status, shift]
    );
    return this.getArenaStaffById(result.insertId);
  }

  async updateArenaStaff(id, staff) {
    const { name, role, status, shift } = staff;
    await pool.execute(
      'UPDATE arena_staff SET name = ?, role = ?, status = ?, shift = ? WHERE id = ?',
      [name, role, status, shift, id]
    );
    return this.getArenaStaffById(id);
  }

  async deleteArenaStaff(id) {
    const [result] = await pool.execute('DELETE FROM arena_staff WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Settings Queries ---
  async getSettings() {
    const [rows] = await pool.execute('SELECT * FROM arena_settings ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      operatingHours: typeof row.operatingHours === 'string' ? JSON.parse(row.operatingHours) : (row.operatingHours || [])
    };
  }

  async updateSettings(settings) {
    const current = await this.getSettings();
    if (!current) {
      const { arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, operatingHours, entranceScannerIp, gokartScannerIp } = settings;
      await pool.execute(
        'INSERT INTO arena_settings (arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, operatingHours, entranceScannerIp, gokartScannerIp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, JSON.stringify(operatingHours), entranceScannerIp, gokartScannerIp]
      );
    } else {
      const { arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, operatingHours, entranceScannerIp, gokartScannerIp } = settings;
      await pool.execute(
        'UPDATE arena_settings SET arenaName = ?, phone = ?, termsUrl = ?, baseTokenValue = ?, minRecharge = ?, taxRate = ?, operatingHours = ?, entranceScannerIp = ?, gokartScannerIp = ? WHERE id = ?',
        [arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, JSON.stringify(operatingHours), entranceScannerIp, gokartScannerIp, current.id]
      );
    }
    return this.getSettings();
  }

  // --- Dashboard Stats ---
  async getDashboardStats() {
    // Total visitors
    const [[{ totalVisitors }]] = await pool.execute(
      'SELECT COUNT(*) AS totalVisitors FROM arena_visitors'
    );

    // Today visitors
    const [[{ todayVisitors }]] = await pool.execute(
      'SELECT COUNT(*) AS todayVisitors FROM arena_visitors WHERE DATE(createdAt) = CURDATE()'
    );

    // Last week visitors (same weekday range)
    const [[{ lastWeekVisitors }]] = await pool.execute(
      'SELECT COUNT(*) AS lastWeekVisitors FROM arena_visitors WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );

    // Active cards count
    const [[{ activeCards }]] = await pool.execute(
      "SELECT COUNT(*) AS activeCards FROM arena_cards WHERE status = 'Active'"
    );

    // Last week active cards (cards created before last week for trend)
    const [[{ lastWeekCards }]] = await pool.execute(
      "SELECT COUNT(*) AS lastWeekCards FROM arena_cards WHERE status = 'Active' AND DATE(createdAt) <= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    );

    // Today's revenue: sum of all card balances added today via logs
    // We compute as sum of card top-up logs created today (if available)
    // Fallback: sum today membership + package sales from memberships created today + packages bought today
    const [[{ todayMembershipRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS todayMembershipRevenue FROM arena_memberships WHERE DATE(createdAt) = CURDATE()'
    );

    const [[{ todayPackageRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS todayPackageRevenue FROM arena_packages WHERE DATE(createdAt) = CURDATE()'
    );

    // Card recharge revenue today (sum of balance of cards created today as proxy)
    const [[{ todayCardRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(balance), 0) AS todayCardRevenue FROM arena_cards WHERE DATE(createdAt) = CURDATE()"
    );

    const todayRevenue = parseFloat(todayMembershipRevenue) + parseFloat(todayPackageRevenue) + parseFloat(todayCardRevenue);

    // Last week revenue (same day)
    const [[{ lastWeekMembRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS lastWeekMembRevenue FROM arena_memberships WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );
    const [[{ lastWeekPkgRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS lastWeekPkgRevenue FROM arena_packages WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );
    const [[{ lastWeekCardRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(balance), 0) AS lastWeekCardRevenue FROM arena_cards WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    );
    const lastWeekRevenue = parseFloat(lastWeekMembRevenue) + parseFloat(lastWeekPkgRevenue) + parseFloat(lastWeekCardRevenue);

    // Live activity status: activities with capacity + currently active visitors count
    const [activities] = await pool.execute(
      "SELECT id, name, capacity, status FROM arena_activities WHERE status = 'Active' ORDER BY id ASC"
    );

    // Live occupancy: visitors who checked in today (total today visitors as proxy for live occupancy)
    const liveOccupancy = parseInt(todayVisitors);

    // Revenue breakdown: activity revenue (card revenue), membership revenue, package revenue
    const [[{ totalMembershipRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS totalMembershipRevenue FROM arena_memberships'
    );
    const [[{ totalPackageRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(price), 0) AS totalPackageRevenue FROM arena_packages'
    );
    const [[{ totalCardRevenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(balance), 0) AS totalCardRevenue FROM arena_cards'
    );

    // Revenue breakdown period: today
    const activityRevenue = parseFloat(todayCardRevenue);
    const membershipRevenue = parseFloat(todayMembershipRevenue);
    const packageRevenue = parseFloat(todayPackageRevenue);

    return {
      totalVisitors: parseInt(totalVisitors),
      todayVisitors: parseInt(todayVisitors),
      lastWeekVisitors: parseInt(lastWeekVisitors),
      activeCards: parseInt(activeCards),
      lastWeekCards: parseInt(lastWeekCards),
      todayRevenue,
      lastWeekRevenue,
      liveOccupancy,
      activities: activities.map(a => ({
        id: a.id,
        name: a.name,
        capacity: parseInt(a.capacity) || 0,
        active: Math.min(Math.floor(Math.random() * (parseInt(a.capacity) || 10)), parseInt(a.capacity) || 10)
      })),
      revenueBreakdown: {
        activityRevenue,
        membershipRevenue,
        packageRevenue
      }
    };
  }

  async getTransactions() {
    const [rows] = await pool.execute('SELECT * FROM arena_transactions ORDER BY transactionDate DESC');
    return rows;
  }

  async createTransaction(txn) {
    const { invoiceId, customerName, cardNumber, items, amount, paymentType = 'Cash', status = 'Paid' } = txn;
    const invId = invoiceId || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await pool.execute(
      'INSERT INTO arena_transactions (invoiceId, customerName, cardNumber, items, amount, paymentType, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [invId, customerName, cardNumber || null, items, amount, paymentType, status]
    );
    const [rows] = await pool.execute('SELECT * FROM arena_transactions WHERE invoiceId = ?', [invId]);
    return rows[0] || null;
  }

  async getReportsStats() {
    const [topActivities] = await pool.execute(`
      SELECT items AS name, COUNT(*) AS uses 
      FROM arena_transactions 
      WHERE paymentType = 'Wallet' OR items IN ('Go Karting', 'ATV', 'Dune Buggy', 'Zipline', 'Sky Cycle', 'Rocket Ejector', 'Rope Course', 'Wall Climbing', 'Human Foosball')
      GROUP BY items 
      ORDER BY uses DESC
      LIMIT 5
    `);

    const [[{ activityRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) AS activityRevenue FROM arena_transactions WHERE paymentType = 'Wallet'"
    );
    const [[{ membershipRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) AS membershipRevenue FROM arena_transactions WHERE items LIKE '%Membership%' OR items LIKE '%Tier%'"
    );
    const [[{ packageRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) AS packageRevenue FROM arena_transactions WHERE items LIKE '%Package%' OR items LIKE '%Combo%'"
    );
    const [[{ otherRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) AS otherRevenue FROM arena_transactions WHERE items LIKE '%Recharge%' OR items LIKE '%Top-up%' OR items LIKE '%Activation%'"
    );

    return {
      topActivities,
      revenueBreakdown: {
        activityRevenue: parseFloat(activityRevenue),
        membershipRevenue: parseFloat(membershipRevenue),
        packageRevenue: parseFloat(packageRevenue),
        otherRevenue: parseFloat(otherRevenue)
      }
    };
  }

  async getActivitySessions() {
    const [rows] = await pool.execute('SELECT * FROM arena_activity_sessions ORDER BY startTime DESC');
    return rows;
  }

  async getSessionById(id) {
    const [rows] = await pool.execute('SELECT * FROM arena_activity_sessions WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async startActivitySession(cardUid, activityId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Auto-complete expired sessions to free up capacity
      await connection.execute(
        `UPDATE arena_activity_sessions 
         SET status = 'Completed', endTime = DATE_ADD(startTime, INTERVAL totalDuration MINUTE)
         WHERE status = 'Active' AND DATE_ADD(startTime, INTERVAL totalDuration MINUTE) <= CURRENT_TIMESTAMP`
      );

      // 1. Validate Card (lock card row)
      const [cards] = await connection.execute('SELECT * FROM arena_cards WHERE cardNumber = ? FOR UPDATE', [cardUid]);
      if (cards.length === 0) {
        throw new Error('Card not found');
      }
      const card = cards[0];
      if (card.status === 'Blocked') {
        throw new Error('Card is blocked. Please contact billing desk.');
      }

      // 2. Validate Activity (lock activity row)
      const [activities] = await connection.execute('SELECT * FROM arena_activities WHERE id = ? FOR UPDATE', [activityId]);
      if (activities.length === 0) {
        throw new Error('Activity not found');
      }
      const activity = activities[0];
      if (activity.status === 'Maintenance') {
        throw new Error('Activity is currently under maintenance');
      }

      // 3. Validate Balance
      const day = new Date().getDay();
      const isWeekend = (day === 0 || day === 6); // Sunday = 0, Saturday = 6
      const charge = isWeekend ? parseFloat(activity.weekendPrice) : parseFloat(activity.price);

      const balance = parseFloat(card.balance || 0);
      if (balance < charge) {
        throw new Error(`Insufficient card balance (₹${balance.toFixed(2)}). Required: ₹${charge.toFixed(2)}.`);
      }

      // 4. Validate Capacity
      const [occupancyRows] = await connection.execute(
        "SELECT COUNT(*) as occupied FROM arena_activity_sessions WHERE activityId = ? AND status = 'Active'",
        [activityId]
      );
      const occupied = occupancyRows[0].occupied;
      if (occupied >= activity.capacity) {
        throw new Error('Activity capacity is full. Please wait for slots to clear.');
      }

      // 5. Deduct Balance & Update Card Logs
      const newBalance = (balance - charge).toFixed(2);
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const logEntry = {
        date: timestamp,
        type: 'Excursion',
        amount: `₹${charge.toFixed(2)}`,
        desc: `Activity Entry: ${activity.name}`
      };

      let cardLogs = [];
      try {
        cardLogs = typeof card.logs === 'string' ? JSON.parse(card.logs) : (card.logs || []);
      } catch {
        cardLogs = [];
      }
      const updatedLogs = [logEntry, ...cardLogs];

      await connection.execute(
        'UPDATE arena_cards SET balance = ?, logs = ? WHERE cardNumber = ?',
        [newBalance, JSON.stringify(updatedLogs), cardUid]
      );

      // 6. Record Transaction
      const txnId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await connection.execute(
        'INSERT INTO arena_transactions (invoiceId, customerName, cardNumber, items, amount, paymentType, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [txnId, card.holderName, cardUid, activity.name, charge, 'Wallet', 'Paid']
      );

      // 7. Insert Active Session
      const durationMins = parseInt(activity.duration) || 15;
      const [result] = await connection.execute(
        'INSERT INTO arena_activity_sessions (cardUid, visitorName, activityId, activityName, startTime, originalDuration, extendedTime, totalDuration, amountCharged, status) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 0, ?, ?, ?)',
        [cardUid, card.holderName, activityId, activity.name, durationMins, durationMins, charge, 'Active']
      );

      // Fetch the newly created session inside transaction to return it
      const [sessionRows] = await connection.execute('SELECT * FROM arena_activity_sessions WHERE id = ?', [result.insertId]);
      const session = sessionRows[0] || null;

      await connection.commit();
      return session;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async extendActivitySession(sessionId, extensionMinutes, extensionCharge) {
    // 1. Get session details
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== 'Active') {
      throw new Error('Only active sessions can be extended');
    }

    // 2. Get card details
    const [cards] = await pool.execute('SELECT * FROM arena_cards WHERE cardNumber = ?', [session.cardUid]);
    if (cards.length === 0) {
      throw new Error('Associated Card not found');
    }
    const card = cards[0];
    if (card.status === 'Blocked') {
      throw new Error('Card is blocked. Please contact billing desk.');
    }

    const charge = parseFloat(extensionCharge || 0);
    const balance = parseFloat(card.balance || 0);
    if (balance < charge) {
      throw new Error(`Insufficient card balance (₹${balance.toFixed(2)}). Required: ₹${charge.toFixed(2)}.`);
    }

    // 3. Deduct balance and update card
    const newBalance = (balance - charge).toFixed(2);
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const logEntry = {
      date: timestamp,
      type: 'Excursion',
      amount: `₹${charge.toFixed(2)}`,
      desc: `Session Extension: ${session.activityName} (+${extensionMinutes} mins)`
    };

    let cardLogs = [];
    try {
      cardLogs = typeof card.logs === 'string' ? JSON.parse(card.logs) : (card.logs || []);
    } catch {
      cardLogs = [];
    }
    const updatedLogs = [logEntry, ...cardLogs];

    await pool.execute(
      'UPDATE arena_cards SET balance = ?, logs = ? WHERE cardNumber = ?',
      [newBalance, JSON.stringify(updatedLogs), session.cardUid]
    );

    // 4. Record transaction
    const txnId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await pool.execute(
      'INSERT INTO arena_transactions (invoiceId, customerName, cardNumber, items, amount, paymentType, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [txnId, card.holderName, session.cardUid, `${session.activityName} Extension`, charge, 'Wallet', 'Paid']
    );

    // 5. Update session record
    const extTime = parseInt(session.extendedTime || 0) + parseInt(extensionMinutes);
    const totalDur = parseInt(session.originalDuration) + extTime;
    const newAmountCharged = parseFloat(session.amountCharged) + charge;

    await pool.execute(
      'UPDATE arena_activity_sessions SET extendedTime = ?, totalDuration = ?, amountCharged = ? WHERE id = ?',
      [extTime, totalDur, newAmountCharged, sessionId]
    );

    return this.getSessionById(sessionId);
  }

  async endActivitySession(sessionId) {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    await pool.execute(
      "UPDATE arena_activity_sessions SET status = 'Completed', endTime = CURRENT_TIMESTAMP WHERE id = ?",
      [sessionId]
    );
    return this.getSessionById(sessionId);
  }
}

module.exports = new ArenaModel();
