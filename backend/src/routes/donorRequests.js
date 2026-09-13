const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Inserting fires trg_notify_donor_request, which fans a notification out
// to every hospital.
router.post('/', requireAuth('donor'), async (req, res, next) => {
  try {
    const { blood_group_id, units_needed, urgency, reason } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO donor_requests (donor_id, blood_group_id, units_needed, urgency, reason)
       VALUES ($1, $2, $3, COALESCE($4, 'medium'), $5)
       RETURNING *`,
      [req.user.id, blood_group_id, units_needed, urgency || null, reason || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// The donor's own requests, with whichever hospital response was accepted
// (if any) joined in.
router.get('/mine', requireAuth('donor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.donor_request_id, bg.group_name AS blood_group, dr.units_needed,
              dr.urgency, dr.reason, dr.status, dr.created_at,
              h.name AS accepted_by_hospital
       FROM donor_requests dr
       JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
       LEFT JOIN donor_request_responses drr
              ON drr.donor_request_id = dr.donor_request_id AND drr.status = 'accepted'
       LEFT JOIN hospitals h ON h.hospital_id = drr.hospital_id
       WHERE dr.donor_id = $1
       ORDER BY dr.donor_request_id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Open donor_requests for hospitals to browse, optionally filtered to one
// blood group.
router.get('/', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { blood_group_id } = req.query;
    const { rows } = await pool.query(
      `SELECT dr.donor_request_id, d.full_name AS donor_name, bg.group_name AS blood_group,
              dr.units_needed, dr.urgency, dr.reason, dr.status, dr.created_at
       FROM donor_requests dr
       JOIN donors d ON d.donor_id = dr.donor_id
       JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
       WHERE dr.status = 'pending'
         AND ($1::int IS NULL OR dr.blood_group_id = $1::int)
       ORDER BY dr.urgency = 'emergency' DESC, dr.created_at`,
      [blood_group_id || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Hospital accepts or declines a donor_request. Inserting an 'accepted'
// row fires trg_apply_donor_request_response, which marks the request
// accepted and notifies the donor; the partial unique index on
// donor_request_responses rejects a second accept for the same request.
router.post('/:id/respond', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
    }

    const { rows } = await pool.query(
      `INSERT INTO donor_request_responses (donor_request_id, hospital_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (donor_request_id, hospital_id) DO NOTHING
       RETURNING *`,
      [req.params.id, req.user.id, status]
    );
    if (!rows[0]) {
      return res.status(409).json({ error: 'Already responded to this request' });
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// CALLs sp_fulfill_donor_request(), the sp_record_donation-equivalent
// completion step -- only the hospital whose response was accepted can
// close it out.
router.post('/:id/fulfill', requireAuth('hospital'), async (req, res, next) => {
  try {
    const accepted = await pool.query(
      `SELECT 1 FROM donor_request_responses
       WHERE donor_request_id = $1 AND hospital_id = $2 AND status = 'accepted'`,
      [req.params.id, req.user.id]
    );
    if (!accepted.rows[0]) {
      return res.status(404).json({ error: 'No accepted response from this hospital for that request' });
    }

    await pool.query('CALL sp_fulfill_donor_request($1)', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
