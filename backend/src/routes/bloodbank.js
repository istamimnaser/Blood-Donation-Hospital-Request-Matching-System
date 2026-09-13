const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Current stock for the logged-in hospital, one row per blood group it has
// ever held units of.
router.get('/mine', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.stock_id, s.blood_group_id, bg.group_name AS blood_group, s.units_available, s.updated_at
       FROM bloodbank_stock s
       JOIN blood_groups bg ON bg.blood_group_id = s.blood_group_id
       WHERE s.hospital_id = $1
       ORDER BY bg.group_name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// CALLs sp_bloodbank_add_stock(): manual stock addition (e.g. external supply).
router.post('/stock', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { blood_group_id, units, note } = req.body;
    await pool.query('CALL sp_bloodbank_add_stock($1, $2, $3, $4)', [
      req.user.id,
      blood_group_id,
      units,
      note || null,
    ]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// CALLs sp_bloodbank_withdraw(): draws stock down to use it against one of
// the hospital's own requests; the procedure itself rejects the call if
// stock is insufficient or the request isn't theirs.
router.post('/withdraw', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { blood_group_id, units, request_id, note } = req.body;
    await pool.query('CALL sp_bloodbank_withdraw($1, $2, $3, $4, $5)', [
      req.user.id,
      blood_group_id,
      units,
      request_id,
      note || null,
    ]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Full add/withdraw ledger for this hospital, newest first.
router.get('/transactions', requireAuth('hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.transaction_id, bg.group_name AS blood_group, t.transaction_type,
              t.units, t.request_id, t.note, t.created_at
       FROM bloodbank_transactions t
       JOIN blood_groups bg ON bg.blood_group_id = t.blood_group_id
       WHERE t.hospital_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
