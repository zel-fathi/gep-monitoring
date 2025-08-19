const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Local development
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('❌ Query error:', err);
    throw err;
  }
};

module.exports = {
  pool,
  query,
};
