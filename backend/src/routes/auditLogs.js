const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM audit_logs ORDER BY changed_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
