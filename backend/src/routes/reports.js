const router = require('express').Router();
const pool = require('../db');

// Each endpoint is a straight SELECT off one of the reporting views in
// schema.sql -- no query logic lives here, the database already did it.

router.get('/pending-emergency', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_pending_emergency_requests');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/donation-history', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_donation_history');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/hospital-summary', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_hospital_summary');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/request-fulfillment', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_request_fulfillment');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
