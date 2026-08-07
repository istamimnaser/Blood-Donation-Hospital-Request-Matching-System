const router = require('express').Router();
const pool = require('../db');

// CALLs sp_record_donation(), which inserts into donations. That insert
// fires trg_apply_donation: rolls the donor's last_donation_date forward,
// updates the request's units_fulfilled/status, marks the match
// 'completed', and writes a donation_confirmed notification -- all from
// this one call.
router.post('/', async (req, res, next) => {
  try {
    const { donor_id, request_id, units_donated, donation_date } = req.body;
    const finalDate = donation_date || new Date().toISOString().slice(0, 10);
    await pool.query('CALL sp_record_donation($1, $2, $3, $4)', [
      donor_id,
      request_id || null,
      units_donated,
      finalDate,
    ]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
