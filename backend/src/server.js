require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Donor photos uploaded via POST /api/donors are saved here and served
// back out at /uploads/<filename>.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/lookups', require('./routes/lookups'));
app.use('/api/donors', require('./routes/donors'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/blood-requests', require('./routes/bloodRequests'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));

// Procedure/trigger RAISE EXCEPTIONs (e.g. "donor not eligible") land here
// as Postgres errors -- surfaced as 400s so the frontend can show them.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || err.code || 'Unknown error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
