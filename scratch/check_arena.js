const pool = require('../src/database/connection');

async function checkArena() {
  try {
    const [visitors] = await pool.execute('SELECT * FROM arena_visitors');
    console.log('Visitors Count:', visitors.length);
    
    const [cards] = await pool.execute('SELECT * FROM arena_cards');
    console.log('Cards Count:', cards.length);
    if (cards.length > 0) {
      console.log('Sample Card:', JSON.stringify(cards[0], null, 2));
    }

    const [packages] = await pool.execute('SELECT * FROM arena_packages');
    console.log('Packages Count:', packages.length);

    const [activities] = await pool.execute('SELECT * FROM arena_activities');
    console.log('Activities Count:', activities.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkArena();
