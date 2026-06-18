async function generateOrderNumber(connection) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await connection.execute(
    'SELECT COUNT(*) as cnt FROM orders WHERE DATE(createdAt) = CURDATE()'
  );
  const seq = String((rows[0]?.cnt || 0) + 1).padStart(3, '0');
  return `ORD-${datePart}-${seq}`;
}

module.exports = { generateOrderNumber };
