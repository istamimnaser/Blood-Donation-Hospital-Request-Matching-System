const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth('donor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.donor_id, d.full_name, d.email, d.phone, d.blood_group_id, bg.group_name AS blood_group,
              d.location_id, l.city, l.area, d.date_of_birth, d.is_available, d.last_donation_date, d.created_at
       FROM donors d
       JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
       JOIN locations l ON l.location_id = d.location_id
       WHERE d.donor_id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Donor not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Self-service update: donors can change their own location, availability,
// last donation date, and phone. Changing is_available fires
// trg_donor_availability_update, which appends a donor_availability row.
router.patch('/me', requireAuth('donor'), async (req, res, next) => {
  try {
    const current = await pool.query('SELECT * FROM donors WHERE donor_id = $1', [req.user.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Donor not found' });
    const existing = current.rows[0];

    const {
      location_id = existing.location_id,
      last_donation_date = existing.last_donation_date,
      phone = existing.phone,
      is_available = existing.is_available,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE donors SET location_id = $1, last_donation_date = $2, phone = $3, is_available = $4
       WHERE donor_id = $5
       RETURNING donor_id, full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available, last_donation_date, created_at`,
      [Number(location_id), last_donation_date || null, phone, is_available, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
