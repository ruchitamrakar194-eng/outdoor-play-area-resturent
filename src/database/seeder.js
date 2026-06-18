const pool = require('./connection');
const { seedAuthUsers } = require('./seedAuthUsers');

const seed = async () => {
  try {
    console.log('Seeding database...');
    const connection = await pool.getConnection();
    try {
      await seedAuthUsers(connection);
      console.log('Demo auth users seeded.');
    } finally {
      connection.release();
    }
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
