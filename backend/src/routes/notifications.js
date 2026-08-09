const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE recipient_type = $1 AND recipient_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.role, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
