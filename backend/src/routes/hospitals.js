const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.hospital_id, h.name, h.location_id, l.city, l.area, h.contact_phone, h.email, h.created_at
       FROM hospitals h
       JOIN locations l ON l.location_id = h.location_id
       WHERE h.hospital_id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Hospital not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
