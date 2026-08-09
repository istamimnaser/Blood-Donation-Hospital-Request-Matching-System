const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Matches for requests belonging to the logged-in hospital, optionally
// filtered to one request.
router.get('/', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { request_id } = req.query;
    const { rows } = await pool.query(
      `SELECT m.match_id, m.request_id, m.donor_id, d.full_name AS donor_name, m.match_status, m.matched_at
       FROM request_matches m
       JOIN donors d ON d.donor_id = m.donor_id
       JOIN blood_requests r ON r.request_id = m.request_id
       WHERE r.hospital_id = $1 AND ($2::int IS NULL OR m.request_id = $2::int)
       ORDER BY m.matched_at DESC`,
      [req.user.id, request_id || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Matches suggested to the logged-in donor, for their "respond to
// matches" dashboard list.
router.get('/mine', requireAuth('donor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.match_id, m.request_id, m.match_status, m.matched_at,
              h.name AS hospital_name, bg.group_name AS blood_group, r.units_needed, r.urgency
       FROM request_matches m
       JOIN blood_requests r ON r.request_id = m.request_id
       JOIN hospitals h ON h.hospital_id = r.hospital_id
       JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
       WHERE m.donor_id = $1
       ORDER BY m.matched_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// CALLs sp_create_match(), which raises an exception (surfaced below as a
// 400) if the donor isn't in that request's eligible pool. On success,
// trg_notify_new_match fires and writes a notification for the donor.
router.post('/', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { request_id, donor_id } = req.body;

    const owns = await pool.query(
      'SELECT 1 FROM blood_requests WHERE request_id = $1 AND hospital_id = $2',
      [request_id, req.user.id]
    );
    if (!owns.rows[0]) return res.status(404).json({ error: 'Request not found' });

    await pool.query('CALL sp_create_match($1, $2)', [request_id, donor_id]);
    const { rows } = await pool.query(
      `SELECT match_id, request_id, donor_id, match_status, matched_at
       FROM request_matches WHERE request_id = $1 AND donor_id = $2`,
      [request_id, donor_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Donor accepts or declines a match they were suggested for.
router.patch('/:id/respond', requireAuth('donor'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
    }

    const { rows } = await pool.query(
      `UPDATE request_matches SET match_status = $1
       WHERE match_id = $2 AND donor_id = $3 AND match_status = 'suggested'
       RETURNING match_id, request_id, donor_id, match_status, matched_at`,
      [status, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Match not found or already responded to' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
