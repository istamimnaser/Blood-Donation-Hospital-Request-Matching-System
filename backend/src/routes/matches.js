const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { request_id } = req.query;
    const { rows } = await pool.query(
      `SELECT m.match_id, m.request_id, m.donor_id, d.full_name AS donor_name, m.match_status, m.matched_at
       FROM request_matches m
       JOIN donors d ON d.donor_id = m.donor_id
       WHERE ($1::int IS NULL OR m.request_id = $1::int)
       ORDER BY m.matched_at DESC`,
      [request_id || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// CALLs sp_create_match(), which raises an exception (surfaced below as a
// 400) if the donor isn't in that request's eligible pool. On success,
// trg_notify_new_match fires and writes a notification for the donor.
router.post('/', async (req, res, next) => {
  try {
    const { request_id, donor_id } = req.body;
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

module.exports = router;
