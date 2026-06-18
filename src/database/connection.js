const mysql = require('mysql2/promise');
require('dotenv').config();

const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL ? {
  uri: process.env.MYSQL_URL || process.env.DATABASE_URL
} : {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 3306
};

const pool = mysql.createPool({
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.MYSQL_URL || process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

// Wrapper to prevent "undefined" in bind parameters
const originalExecute = pool.execute.bind(pool);
const originalQuery = pool.query.bind(pool);

pool.execute = async (sql, params) => {
  const processedParams = Array.isArray(params) 
    ? params.map(p => p === undefined ? null : p) 
    : params;
  return originalExecute(sql, processedParams);
};

pool.query = async (sql, params) => {
  const processedParams = Array.isArray(params) 
    ? params.map(p => p === undefined ? null : p) 
    : params;
  return originalQuery(sql, processedParams);
};

// Test connection
(async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to MySQL database: ' + (process.env.DB_NAME || 'restaurantpos'));
    
    // Auto-fix schema for settlements.id if AUTO_INCREMENT is missing
    try {
      const [columns] = await connection.execute('DESCRIBE settlements');
      const idCol = columns.find(col => col.Field === 'id');
      if (idCol && !idCol.Extra.includes('auto_increment')) {
        console.log('Fixing settlements table: adding AUTO_INCREMENT to id column...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('ALTER TABLE settlements MODIFY COLUMN id INT AUTO_INCREMENT');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('settlements table schema fixed successfully.');
      }
    } catch (schemaErr) {
      console.error('Failed to verify or fix settlements schema on startup:', schemaErr.message);
    }

    // Ensure demo login users exist and are active (restores soft-deleted accounts)
    try {
      const { seedAuthUsers } = require('./seedAuthUsers');
      await seedAuthUsers(connection);
      console.log('Demo auth users verified.');
    } catch (authSeedErr) {
      console.error('Failed to seed demo auth users:', authSeedErr.message);
    }

    // Auto-create and seed arena tables
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS arena_visitors (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          mobile VARCHAR(50) NOT NULL,
          email VARCHAR(255),
          visits INT DEFAULT 1,
          lastVisit DATE,
          waiver TINYINT(1) DEFAULT 0,
          isGroup TINYINT(1) DEFAULT 0,
          groupSize INT DEFAULT 1,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      try {
        await connection.execute('ALTER TABLE arena_visitors ADD COLUMN isGroup TINYINT(1) DEFAULT 0');
      } catch (e) {
        // column might already exist
      }

      try {
        await connection.execute('ALTER TABLE arena_visitors ADD COLUMN groupSize INT DEFAULT 1');
      } catch (e) {
        // column might already exist
      }

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS arena_cards (
          id VARCHAR(50) PRIMARY KEY,
          cardNumber VARCHAR(100) UNIQUE NOT NULL,
          holderName VARCHAR(255) NOT NULL,
          holderId VARCHAR(50),
          balance DECIMAL(10, 2) DEFAULT 0.00,
          type VARCHAR(50) DEFAULT 'Standard',
          status VARCHAR(50) DEFAULT 'Active',
          logs JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const [visitorCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_visitors');
      if (visitorCount[0].cnt === 0) {
        console.log('Seeding arena_visitors table...');
        await connection.execute(`
          INSERT INTO arena_visitors (id, name, mobile, email, visits, lastVisit, waiver) VALUES
          ('V-001', 'Aarav Patel', '+91 9876543210', 'aarav@example.com', 5, '2026-06-10', 1),
          ('V-002', 'Diya Sharma', '+91 9876543211', 'diya@example.com', 2, '2026-06-11', 1),
          ('V-003', 'Rohan Gupta', '+91 9876543212', 'rohan@example.com', 1, '2026-06-12', 0),
          ('V-004', 'Ananya Singh', '+91 9876543213', 'ananya@example.com', 8, '2026-06-09', 1)
        `);
      }

      const [cardCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_cards');
      if (cardCount[0].cnt === 0) {
        console.log('Seeding arena_cards table...');
        const cardsSeed = [
          ['C-001', '13691736', 'Aarav Patel', 'V-001', 1500.00, 'VIP', 'Active', JSON.stringify([
            { date: '2026-06-16 11:30', type: 'Top-up', amount: '₹1000.00', desc: 'Counter Cash Recharge' },
            { date: '2026-06-16 12:15', type: 'Excursion', amount: '₹400.00', desc: 'Go-Kart Track Entry' },
            { date: '2026-06-16 14:02', type: 'Top-up', amount: '₹900.00', desc: 'UPI Online Recharge' }
          ])],
          ['C-002', '13691737', 'Diya Sharma', 'V-002', 450.00, 'Standard', 'Active', JSON.stringify([
            { date: '2026-06-15 15:40', type: 'Top-up', amount: '₹500.00', desc: 'Initial Top-up' },
            { date: '2026-06-15 16:20', type: 'Dining', amount: '₹50.00', desc: 'Beverage purchase at Bar' }
          ])],
          ['C-003', '13691738', 'Rohan Gupta', 'V-003', 0.00, 'Standard', 'Blocked', JSON.stringify([
            { date: '2026-06-12 10:00', type: 'Top-up', amount: '₹100.00', desc: 'Initial Top-up' },
            { date: '2026-06-12 10:15', type: 'Block', amount: '₹0.00', desc: 'Blocked by Staff: Lost Card Reported' }
          ])]
        ];

        for (const c of cardsSeed) {
          await connection.execute(`
            INSERT INTO arena_cards (id, cardNumber, holderName, holderId, balance, type, status, logs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, c);
        }
      }

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS arena_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          type VARCHAR(50) NOT NULL,
          color VARCHAR(100) NOT NULL,
          acts JSON NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const [packageCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_packages');
      if (packageCount[0].cnt === 0) {
        console.log('Seeding arena_packages table...');
        const packagesSeed = [
          ['Silver Combo', 1200.00, 'Individual', 'from-slate-400 to-slate-500', JSON.stringify(['Go Karting', 'Sky Cycle', 'Zipline'])],
          ['Gold Combo', 2000.00, 'Individual', 'from-amber-400 to-amber-600', JSON.stringify(['Go Karting (x2)', 'ATV', 'Rope Course', 'Bumper Car'])],
          ['Family Pack', 4500.00, 'Family (4 pax)', 'from-arena-primary to-arena-dark', JSON.stringify(['Any 10 Activities', 'Free Snacks', 'Priority Entry'])]
        ];

        for (const p of packagesSeed) {
          await connection.execute(`
            INSERT INTO arena_packages (name, price, type, color, acts)
            VALUES (?, ?, ?, ?, ?)
          `, p);
        }
      }

      // Auto-create/seed table_zones and restaurant_tables
      try {
        const [zoneCount] = await connection.execute('SELECT COUNT(*) as cnt FROM table_zones');
        if (zoneCount[0].cnt === 0) {
          console.log('Seeding table_zones table...');
          await connection.execute("INSERT INTO table_zones (id, zone_name) VALUES (1, 'Main Hall'), (2, 'VIP Lounge'), (3, 'Garden Area')");
        }

        const [tablesCount] = await connection.execute('SELECT COUNT(*) as cnt FROM restaurant_tables');
        if (tablesCount[0].cnt === 0) {
          console.log('Seeding restaurant_tables table...');
          const tablesSeed = [
            ['T-1', 4, 1, 'available'],
            ['T-2', 4, 1, 'available'],
            ['T-3', 2, 1, 'available'],
            ['T-4', 6, 1, 'available'],
            ['T-5', 2, 2, 'available'],
            ['T-6', 4, 2, 'available'],
            ['T-7', 8, 2, 'available'],
            ['T-8', 4, 3, 'available'],
            ['T-9', 4, 3, 'available'],
            ['T-10', 6, 3, 'available']
          ];
          for (const t of tablesSeed) {
            await connection.execute(`
              INSERT INTO restaurant_tables (table_code, capacity, zone_id, status)
              VALUES (?, ?, ?, ?)
            `, t);
          }
        }
      } catch (err) {
        console.error('Failed to seed restaurant tables:', err.message);
      }

      // Auto-create/seed analytics_logs
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS analytics_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            module VARCHAR(50),
            activity VARCHAR(255),
            revenue DECIMAL(12, 2) DEFAULT 0,
            user_id INT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deletedAt TIMESTAMP NULL
          )
        `);

        const [logCount] = await connection.execute('SELECT COUNT(*) as cnt FROM analytics_logs');
        if (logCount[0].cnt === 0) {
          console.log('Seeding analytics_logs table...');
          const logsSeed = [
            ['reservations', 'Sarah Jenkins reservation confirmed', 0],
            ['rooms', 'Room LENA status updated to Reserved', 0],
            ['inventory', 'New inventory order for Premium Coffee', 0],
            ['staff', 'Staff Vikram Das clocked in', 0],
            ['POS', 'New order completed at Table T-1', 450.00],
            ['arena', 'Arena visitor Aarav Patel card recharged', 1500.00]
          ];

          for (const l of logsSeed) {
            await connection.execute(`
              INSERT INTO analytics_logs (module, activity, revenue)
              VALUES (?, ?, ?)
            `, l);
          }
        }
      } catch (err) {
        console.error('Failed to seed analytics logs:', err.message);
      }

      // Auto-create/seed arena_activities
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            weekendPrice DECIMAL(10, 2) NOT NULL,
            duration VARCHAR(50) NOT NULL,
            capacity INT NOT NULL,
            status VARCHAR(50) DEFAULT 'Active',
            category VARCHAR(100) DEFAULT 'Adventure',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        try {
          await connection.execute("ALTER TABLE arena_activities ADD COLUMN category VARCHAR(100) DEFAULT 'Adventure'");
        } catch (e) {
          // ignore
        }

        try {
          await connection.execute("UPDATE arena_activities SET category = 'Thrill' WHERE name IN ('Go Karting', 'Dune Buggy', 'Rocket Ejector')");
          await connection.execute("UPDATE arena_activities SET category = 'Adventure' WHERE name IN ('ATV', 'Zipline', 'Sky Cycle', 'Rope Course', 'Wall Climbing')");
          await connection.execute("UPDATE arena_activities SET category = 'Sports' WHERE name IN ('Human Foosball')");
        } catch (e) {
          // ignore
        }
        const [activityCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_activities');
        if (activityCount[0].cnt === 0) {
          console.log('Seeding arena_activities table...');
          const activitiesSeed = [
            ['Go Karting', 500.00, 750.00, '15 mins', 15, 'Active'],
            ['ATV', 800.00, 1000.00, '20 mins', 5, 'Active'],
            ['Dune Buggy', 900.00, 1200.00, '20 mins', 2, 'Active'],
            ['Zipline', 400.00, 500.00, '5 mins', 1, 'Active'],
            ['Sky Cycle', 350.00, 450.00, '10 mins', 2, 'Active'],
            ['Rocket Ejector', 600.00, 800.00, '5 mins', 1, 'Maintenance'],
            ['Rope Course', 300.00, 400.00, '30 mins', 20, 'Active'],
            ['Wall Climbing', 250.00, 350.00, '15 mins', 4, 'Active'],
            ['Human Foosball', 500.00, 600.00, '30 mins', 12, 'Active']
          ];
          for (const a of activitiesSeed) {
            await connection.execute(`
              INSERT INTO arena_activities (name, price, weekendPrice, duration, capacity, status)
              VALUES (?, ?, ?, ?, ?, ?)
            `, a);
          }
        }
      } catch (err) {
        console.error('Failed to create/seed arena_activities:', err.message);
      }

      // Auto-create/seed arena_memberships
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_memberships (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tier VARCHAR(100) NOT NULL,
            points INT DEFAULT 0,
            discount INT NOT NULL,
            birthdayOffer VARCHAR(255) DEFAULT 'No',
            price DECIMAL(10, 2) NOT NULL,
            colorClass VARCHAR(255) DEFAULT 'bg-slate-50',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        const [membershipCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_memberships');
        if (membershipCount[0].cnt === 0) {
          console.log('Seeding arena_memberships table...');
          const membershipsSeed = [
            ['Bronze', 0, 5, 'No', 2000.00, 'bg-slate-50'],
            ['Gold', 500, 15, 'Free Cake', 5000.00, 'bg-amber-50 border border-amber-100 text-amber-600'],
            ['Platinum', 2000, 25, 'Party Package', 15000.00, 'bg-slate-900 text-white']
          ];
          for (const m of membershipsSeed) {
            await connection.execute(`
              INSERT INTO arena_memberships (tier, points, discount, birthdayOffer, price, colorClass)
              VALUES (?, ?, ?, ?, ?, ?)
            `, m);
          }
        }
      } catch (err) {
        console.error('Failed to create/seed arena_memberships:', err.message);
      }

      // Auto-create/seed arena_staff
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'Active',
            shift VARCHAR(50) DEFAULT 'Morning',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        const [staffCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_staff');
        if (staffCount[0].cnt === 0) {
          console.log('Seeding arena_staff table...');
          const staffSeed = [
            ['Arjun Kumar', 'Arena Manager', 'Active', 'Morning'],
            ['Priya Singh', 'Activity Operator', 'Active', 'Evening'],
            ['Rahul Dev', 'Game Attendant', 'Off Duty', 'Night'],
            ['Sneha Patel', 'Card Operator', 'Active', 'Morning']
          ];
          for (const s of staffSeed) {
            await connection.execute(`
              INSERT INTO arena_staff (name, role, status, shift)
              VALUES (?, ?, ?, ?)
            `, s);
          }
        } else {
          // Revert/Migrate legacy roles back to proper Arena-specific names
          const roleMapping = [
            ['Admin', 'Super Admin'],
            ['Manager', 'Arena Manager'],
            ['Chef', 'Activity Operator'],
            ['Waiter', 'Game Attendant'],
            ['Cashier', 'Card Operator'],
            ['Game Tech', 'Game Attendant'],
            ['Attendant', 'Game Attendant'],
            ['Supervisor', 'Arena Manager'],
            ['Security Guard', 'Game Attendant'],
            ['Arena Manager', 'Arena Manager'],
            ['Activity Operator', 'Activity Operator'],
            ['Game Attendant', 'Game Attendant'],
            ['Visitor Desk', 'Game Attendant'],
            ['Card Operator', 'Card Operator']
          ];
          for (const [oldRole, newRole] of roleMapping) {
            await connection.execute(
              'UPDATE arena_staff SET role = ? WHERE role = ?',
              [newRole, oldRole]
            );
          }
        }
      } catch (err) {
        console.error('Failed to create/seed arena_staff:', err.message);
      }

      // Auto-create/seed arena_settings
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            arenaName VARCHAR(255) DEFAULT 'Outdoor Play Arena',
            phone VARCHAR(50) DEFAULT '+91 98765 43210',
            termsUrl VARCHAR(255) DEFAULT 'https://outdoorplayarena.com/terms',
            baseTokenValue DECIMAL(10, 2) DEFAULT 10.00,
            minRecharge DECIMAL(10, 2) DEFAULT 100.00,
            taxRate DECIMAL(5, 2) DEFAULT 18.00,
            operatingHours JSON,
            entranceScannerIp VARCHAR(50) DEFAULT '192.168.1.101',
            gokartScannerIp VARCHAR(50) DEFAULT '192.168.1.102',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        const [settingsCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_settings');
        if (settingsCount[0].cnt === 0) {
          console.log('Seeding arena_settings table...');
          const defaultHours = [
            { day: 'Monday', open: '10:00', close: '22:00' },
            { day: 'Tuesday', open: '10:00', close: '22:00' },
            { day: 'Wednesday', open: '10:00', close: '22:00' },
            { day: 'Thursday', open: '10:00', close: '22:00' },
            { day: 'Friday', open: '10:00', close: '22:00' },
            { day: 'Saturday', open: '10:00', close: '22:00' },
            { day: 'Sunday', open: '10:00', close: '22:00' }
          ];
          await connection.execute(`
            INSERT INTO arena_settings (arenaName, phone, termsUrl, baseTokenValue, minRecharge, taxRate, operatingHours, entranceScannerIp, gokartScannerIp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'Outdoor Play Arena',
            '+91 98765 43210',
            'https://outdoorplayarena.com/terms',
            10.00,
            100.00,
            18.00,
            JSON.stringify(defaultHours),
            '192.168.1.101',
            '192.168.1.102'
          ]);
        }
      } catch (err) {
        console.error('Failed to create/seed arena_settings:', err.message);
      }

      // Auto-create/seed arena_transactions
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoiceId VARCHAR(50) UNIQUE NOT NULL,
            customerName VARCHAR(255) NOT NULL,
            cardNumber VARCHAR(100),
            items VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            paymentType VARCHAR(50) DEFAULT 'Cash',
            status VARCHAR(50) DEFAULT 'Paid',
            transactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        const [txnCount] = await connection.execute('SELECT COUNT(*) as cnt FROM arena_transactions');
        if (txnCount[0].cnt === 0) {
          console.log('Seeding arena_transactions table...');
          const txnSeed = [
            ['INV-1001', 'Aarav Patel', '13691736', 'Card Recharge', 1500.00, 'UPI', 'Paid'],
            ['INV-1002', 'Diya Sharma', '13691737', 'Family Package', 4500.00, 'Card', 'Paid'],
            ['INV-1003', 'Rohan Gupta', '13691738', 'Go Karting', 400.00, 'Cash', 'Paid'],
            ['INV-1004', 'Ananya Singh', null, 'Membership - Gold', 5000.00, 'UPI', 'Paid'],
            ['INV-1005', 'Aarav Patel', '13691736', 'ATV Ride', 800.00, 'Wallet', 'Paid'],
            ['INV-1006', 'Diya Sharma', '13691737', 'Card Recharge', 500.00, 'Cash', 'Paid']
          ];
          for (const t of txnSeed) {
            await connection.execute(`
              INSERT INTO arena_transactions (invoiceId, customerName, cardNumber, items, amount, paymentType, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, t);
          }
        }
      } catch (err) {
        console.error('Failed to create/seed arena_transactions:', err.message);
      }

      // Auto-create/seed arena_activity_sessions
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS arena_activity_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cardUid VARCHAR(100) NOT NULL,
            visitorName VARCHAR(255) NOT NULL,
            activityId INT NOT NULL,
            activityName VARCHAR(255) NOT NULL,
            startTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            endTime TIMESTAMP NULL,
            originalDuration INT NOT NULL,
            extendedTime INT DEFAULT 0,
            totalDuration INT NOT NULL,
            amountCharged DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'Active',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
      } catch (err) {
        console.error('Failed to create arena_activity_sessions:', err.message);
      }

    } catch (arenaErr) {
      console.error('Failed to create or seed arena tables:', arenaErr.message);
    }
  } catch (err) {
    console.error('Database connection failed: ' + err.message);
  } finally {
    if (connection) connection.release();
  }
})();

module.exports = pool;
