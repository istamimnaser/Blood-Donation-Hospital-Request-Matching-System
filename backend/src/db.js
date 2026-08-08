const path = require('path');
const { Pool } = require('pg');

// Always load backend/.env regardless of which directory
// the server command is executed from.
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'blood_donation',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
