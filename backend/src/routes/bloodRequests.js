const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.request_id, h.name AS hospital_name, bg.group_name AS blood_group,
             r.units_needed, r.units_fulfilled, r.urgency, r.status, r.needed_by, r.created_at
      FROM blood_requests r
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
      ORDER BY r.request_id DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Inserting with urgency='emergency' fires trg_notify_emergency_request.
router.post('/', async (req, res, next) => {
  try {
    const { hospital_id, blood_group_id, units_needed, urgency, needed_by } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO blood_requests (hospital_id, blood_group_id, units_needed, urgency, needed_by)
       VALUES ($1, $2, $3, COALESCE($4, 'medium'), $5)
       RETURNING *`,
      [hospital_id, blood_group_id, units_needed, urgency || null, needed_by || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Wraps fn_eligible_donors(): compatible blood group, available, past the
// 90-day rest period, ranked by same-location / exact-group match.
router.get('/:id/eligible-donors', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM fn_eligible_donors($1)', [req.params.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
