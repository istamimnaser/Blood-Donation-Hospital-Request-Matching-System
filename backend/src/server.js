const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Uploading donor photos
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'))
);


// CHecking health of the server

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    );

    res.json({
      ok: true,
      message: 'Backend and PostgreSQL are connected.',
      database_time: result.rows[0].database_time,
    });
  } catch (err) {
    console.error('Health check failed:', err);

    res.status(500).json({
      ok: false,
      error: 'Database connection failed.',
      details: err.message,
    });
  }
});


// Adding required API paths

app.use('/api/lookups', require('./routes/lookups'));
app.use('/api/donors', require('./routes/donors'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/blood-requests', require('./routes/bloodRequests'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));


// Handling Error 404

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});


// Handling other global error's

app.use((err, req, res, next) => {
  console.error('API Error:', err);

  const status =
    err.code &&
    (
      err.code.startsWith('22') ||
      err.code.startsWith('23') ||
      err.code === 'P0001'
    )
      ? 400
      : 500;

  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = Number(process.env.PORT || 4000);


// Checking the database connection then starting the server.

async function startServer() {
  try {
    await pool.query('SELECT 1');

    console.log('PostgreSQL connection successful.');

    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      console.log(
        `Health check: http://localhost:${PORT}/api/health`
      );
    });
  } catch (err) {
    console.error('');
    console.error('------------------------------------------');
    console.error('FAILED TO START BACKEND');
    console.error('------------------------------------------');
    console.error('Could not connect to PostgreSQL.');
    console.error(err.message);
    console.error('');
    console.error(
      'Check backend/.env and make sure PostgreSQL is running.'
    );
    console.error('------------------------------------------');

    process.exit(1);
  }
}

startServer();
