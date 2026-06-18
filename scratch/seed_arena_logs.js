const pool = require('../src/database/connection');

async function seedLogs() {
  try {
    console.log('Enriching arena_cards logs with realistic activity entries...');

    const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Card 1
    const logs1 = [
      { date: '2026-06-16 11:30', type: 'Top-up', amount: '₹1000.00', desc: 'Counter Cash Recharge' },
      { date: '2026-06-16 12:15', type: 'Excursion', amount: '₹500.00', desc: 'Go Karting entry log' },
      { date: '2026-06-16 14:02', type: 'Top-up', amount: '₹1500.00', desc: 'UPI Online Recharge' },
      { date: '2026-06-16 15:30', type: 'Excursion', amount: '₹800.00', desc: 'ATV Ride deduction' },
      { date: '2026-06-17 10:10', type: 'Excursion', amount: '₹400.00', desc: 'Zipline entry log' },
      { date: '2026-06-17 11:00', type: 'Excursion', amount: '₹300.00', desc: 'Rope Course entry log' }
    ];
    await pool.execute(
      'UPDATE arena_cards SET balance = 500.00, logs = ? WHERE cardNumber = "13691736"',
      [JSON.stringify(logs1)]
    );

    // Card 2
    const logs2 = [
      { date: '2026-06-15 15:40', type: 'Top-up', amount: '₹1500.00', desc: 'Initial Top-up' },
      { date: '2026-06-15 16:20', type: 'Excursion', amount: '₹500.00', desc: 'Go Karting entry log' },
      { date: '2026-06-15 17:30', type: 'Excursion', amount: '₹900.00', desc: 'Dune Buggy entry log' }
    ];
    await pool.execute(
      'UPDATE arena_cards SET balance = 100.00, logs = ? WHERE cardNumber = "13691737"',
      [JSON.stringify(logs2)]
    );

    // Check if card 4 exists
    const [c4] = await pool.execute('SELECT * FROM arena_cards WHERE id = "C-004"');
    if (c4.length > 0) {
      const logs4 = [
        { date: '2026-06-16 09:15', type: 'Top-up', amount: '₹2000.00', desc: 'Counter Recharge' },
        { date: '2026-06-16 10:00', type: 'Excursion', amount: '₹500.00', desc: 'Go Karting entry log' },
        { date: '2026-06-16 10:45', type: 'Excursion', amount: '₹300.00', desc: 'Rope Course entry log' },
        { date: '2026-06-16 11:30', type: 'Excursion', amount: '₹350.00', desc: 'Sky Cycle entry log' }
      ];
      await pool.execute(
        'UPDATE arena_cards SET balance = 850.00, logs = ? WHERE id = "C-004"',
        [JSON.stringify(logs4)]
      );
    } else {
      // Create Card 4 for Ananya Singh (V-004)
      const logs4 = [
        { date: '2026-06-16 09:15', type: 'Top-up', amount: '₹2000.00', desc: 'Counter Recharge' },
        { date: '2026-06-16 10:00', type: 'Excursion', amount: '₹500.00', desc: 'Go Karting entry log' },
        { date: '2026-06-16 10:45', type: 'Excursion', amount: '₹300.00', desc: 'Rope Course entry log' },
        { date: '2026-06-16 11:30', type: 'Excursion', amount: '₹350.00', desc: 'Sky Cycle entry log' }
      ];
      await pool.execute(
        'INSERT INTO arena_cards (id, cardNumber, holderName, holderId, balance, type, status, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['C-004', '13691739', 'Ananya Singh', 'V-004', 850.00, 'Standard', 'Active', JSON.stringify(logs4)]
      );
    }

    console.log('Database successfully seeded with realistic card log records.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

seedLogs();
