const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// A donor's own community requests, plus whichever hospital accepted (if any).
router.get('/mine', requireAuth('donor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.donor_request_id, bg.group_name AS blood_group, dr.units_needed,
              dr.urgency, dr.reason, dr.status, dr.created_at,
              h.hospital_id AS accepted_hospital_id, h.name AS accepted_hospital_name,
              resp.responded_at
       FROM donor_requests dr
       JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
       LEFT JOIN donor_request_responses resp
              ON resp.donor_request_id = dr.donor_request_id AND resp.status = 'accepted'
       LEFT JOIN hospitals h ON h.hospital_id = resp.hospital_id
       WHERE dr.donor_id = $1
       ORDER BY dr.donor_request_id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Donor broadcasts that they need blood. Inserting fires
// trg_notify_donor_request, which notifies every hospital.
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

// Open donor_requests for hospitals to browse, optionally filtered by
// blood group.
router.get('/', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { blood_group_id } = req.query;
    const { rows } = await pool.query(
      `SELECT dr.donor_request_id, dr.donor_id, d.full_name AS donor_name,
              bg.group_name AS blood_group, dr.units_needed, dr.urgency, dr.reason,
              dr.status, dr.created_at
       FROM donor_requests dr
       JOIN donors d ON d.donor_id = dr.donor_id
       JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
       WHERE dr.status = 'pending' AND ($1::int IS NULL OR dr.blood_group_id = $1::int)
       ORDER BY dr.created_at DESC`,
      [blood_group_id || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// The community requests a hospital has already accepted, still awaiting
// sp_fulfill_donor_request -- backs the "mark fulfilled" action in the
// hospital's Community Requests view.
router.get('/accepted-by-me', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.donor_request_id, d.full_name AS donor_name, bg.group_name AS blood_group,
              dr.units_needed, dr.urgency, dr.reason, resp.responded_at
       FROM donor_request_responses resp
       JOIN donor_requests dr ON dr.donor_request_id = resp.donor_request_id
       JOIN donors d ON d.donor_id = dr.donor_id
       JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
       WHERE resp.hospital_id = $1 AND resp.status = 'accepted' AND dr.status = 'accepted'
       ORDER BY resp.responded_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Hospital accepts or declines a donor_request. trg_check_donor_request_open
// rejects this (as a 400, via the P0001 exception) once the request is no
// longer pending; trg_apply_donor_request_response then moves an accepted
// request's status and notifies the donor. ON CONFLICT DO NOTHING + the
// explicit 409 turns a same-hospital double-response (which the
// UNIQUE(donor_request_id, hospital_id) constraint would otherwise reject
// as a raw duplicate-key error) into a clean API response.
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
