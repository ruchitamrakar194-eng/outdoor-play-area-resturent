const bcrypt = require('bcryptjs');

const ROLES = [
  ['admin', 'Full System Access'],
  ['manager', 'Operational Control'],
  ['waiter', 'Order Handling'],
  ['chef', 'Kitchen Operations'],
  ['cashier', 'Billing & Payments'],
  ['customer', 'QR Ordering & Guest Access'],
];

const DEMO_USERS = [
  { full_name: 'System Admin', email: 'admin@gilahouse.com', password: 'Admin@123', role: 'admin' },
  { full_name: 'Kitchen Manager', email: 'manager@gilahouse.com', password: 'Manager@123', role: 'manager' },
  { full_name: 'Service Waiter', email: 'waiter@gilahouse.com', password: 'Waiter@123', role: 'waiter' },
  { full_name: 'Head Chef', email: 'chef@gilahouse.com', password: 'Chef@123', role: 'chef' },
  { full_name: 'Billing Cashier', email: 'cashier@gilahouse.com', password: 'Cashier@123', role: 'cashier' },
  { full_name: 'Guest Customer', email: 'customer@gilahouse.com', password: 'Customer@123', role: 'customer' },
];

async function seedAuthUsers(connection) {
  for (const role of ROLES) {
    await connection.execute(
      'INSERT IGNORE INTO roles (role_name, description) VALUES (?, ?)',
      role
    );
  }

  for (const user of DEMO_USERS) {
    const [roleRows] = await connection.execute(
      'SELECT id FROM roles WHERE role_name = ? AND deletedAt IS NULL LIMIT 1',
      [user.role]
    );
    if (roleRows.length === 0) continue;

    const passwordHash = await bcrypt.hash(user.password, 10);
    await connection.execute(
      `INSERT INTO users (full_name, email, password, role_id, status, deletedAt)
       VALUES (?, ?, ?, ?, 'active', NULL)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         password = VALUES(password),
         role_id = VALUES(role_id),
         status = 'active',
         deletedAt = NULL`,
      [user.full_name, user.email, passwordHash, roleRows[0].id]
    );
  }
}

module.exports = { seedAuthUsers, DEMO_USERS };
