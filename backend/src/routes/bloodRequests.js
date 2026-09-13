const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/mine', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.request_id, bg.group_name AS blood_group,
              r.units_needed, r.units_fulfilled, r.urgency, r.status, r.needed_by, r.created_at
       FROM blood_requests r
       JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
       WHERE r.hospital_id = $1
       ORDER BY r.request_id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Inserting with urgency='emergency' fires trg_notify_emergency_request.
router.post('/', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { blood_group_id, units_needed, urgency, needed_by } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO blood_requests (hospital_id, blood_group_id, units_needed, urgency, needed_by)
       VALUES ($1, $2, $3, COALESCE($4, 'medium'), $5)
       RETURNING *`,
      [req.user.id, blood_group_id, units_needed, urgency || null, needed_by || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// The donor-side mirror of fn_eligible_donors(): open requests the logged-in
// donor is eligible for (compatible group, available, past the 90-day rest
// period), that they haven't already been matched to. Backs the "I can
// help" self-nomination button on the donor dashboard.
router.get('/open-for-me', requireAuth('donor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.request_id, h.name AS hospital_name, l.city, l.area,
              bg.group_name AS blood_group, r.units_needed, r.units_fulfilled,
              r.urgency, r.status, r.needed_by, r.created_at
       FROM blood_requests r
       JOIN hospitals h ON h.hospital_id = r.hospital_id
       JOIN locations l ON l.location_id = h.location_id
       JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
       JOIN blood_compatibility bc ON bc.recipient_blood_group_id = r.blood_group_id
       JOIN donors d ON d.donor_id = $1 AND d.blood_group_id = bc.donor_blood_group_id
       WHERE r.status IN ('pending', 'partially_fulfilled')
         AND d.is_available = TRUE
         AND (d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')
         AND NOT EXISTS (
             SELECT 1 FROM request_matches m WHERE m.request_id = r.request_id AND m.donor_id = $1
         )
       ORDER BY (r.urgency = 'emergency') DESC, r.created_at`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Wraps fn_eligible_donors(): compatible blood group, available, past the
// 90-day rest period, ranked by same-location / exact-group match.
router.get('/:id/eligible-donors', requireAuth('hospital'), async (req, res, next) => {
  try {
    const owns = await pool.query(
      'SELECT 1 FROM blood_requests WHERE request_id = $1 AND hospital_id = $2',
      [req.params.id, req.user.id]
    );
    if (!owns.rows[0]) return res.status(404).json({ error: 'Request not found' });

    const { rows } = await pool.query('SELECT * FROM fn_eligible_donors($1)', [req.params.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
