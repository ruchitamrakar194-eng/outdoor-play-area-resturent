const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL ? {
    uri: process.env.MYSQL_URL || process.env.DATABASE_URL
  } : {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 3306
  };

  const connection = await mysql.createConnection(connectionConfig);

  // Get list of tables
  const [tables] = await connection.execute('SHOW TABLES');
  console.log('Tables in database:');
  const tableNames = tables.map(r => Object.values(r)[0]);
  console.log(tableNames);

  for (const name of tableNames) {
    const [[{ count }]] = await connection.execute(`SELECT COUNT(*) AS count FROM \`${name}\``);
    console.log(`Table: ${name} - Rows: ${count}`);
    if (count > 0) {
      const [rows] = await connection.execute(`SELECT * FROM \`${name}\` LIMIT 3`);
      console.log(`Sample from ${name}:`, rows);
    }
  }

  await connection.end();
}

run().catch(console.error);
