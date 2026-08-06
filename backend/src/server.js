require('dotenv').config();
const express = require('express');
const cors = require('cors');

const donorsRouter = require('./routes/donors');
const hospitalsRouter = require('./routes/hospitals');
const bloodRequestsRouter = require('./routes/bloodRequests');
const matchesRouter = require('./routes/matches');
const donationsRouter = require('./routes/donations');
const reportsRouter = require('./routes/reports');
const lookupsRouter = require('./routes/lookups');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/donors', donorsRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/blood-requests', bloodRequestsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', lookupsRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Blood donation API listening on port ${port}`));
