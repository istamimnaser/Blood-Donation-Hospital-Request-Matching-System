const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Enriched with whichever of blood_requests/request_matches/donor_requests
// the notification points at, so the UI can show real details (hospital,
// donor, blood group, units, urgency) instead of just the flat message --
// a notification only ever has one of request_id/match_id/donor_request_id
// meaningfully populated per its notification_type, so these LEFT JOINs
// stay mutually exclusive in practice and COALESCE picks whichever matched.
router.get('/', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.notification_id, n.recipient_type, n.recipient_id, n.request_id, n.match_id,
              n.donor_request_id, n.notification_type, n.message, n.is_read, n.created_at,
              COALESCE(bg_br.group_name, bg_dr.group_name) AS blood_group,
              COALESCE(br.units_needed, dr.units_needed) AS units_needed,
              COALESCE(br.urgency, dr.urgency) AS urgency,
              COALESCE(h_br.name, h_drr.name) AS hospital_name,
              COALESCE(d_rm.full_name, d_dr.full_name) AS donor_name
       FROM notifications n
       LEFT JOIN blood_requests br ON br.request_id = n.request_id
       LEFT JOIN blood_groups bg_br ON bg_br.blood_group_id = br.blood_group_id
       LEFT JOIN hospitals h_br ON h_br.hospital_id = br.hospital_id
       LEFT JOIN request_matches rm ON rm.match_id = n.match_id
       LEFT JOIN donors d_rm ON d_rm.donor_id = rm.donor_id
       LEFT JOIN donor_requests dr ON dr.donor_request_id = n.donor_request_id
       LEFT JOIN blood_groups bg_dr ON bg_dr.blood_group_id = dr.blood_group_id
       LEFT JOIN donors d_dr ON d_dr.donor_id = dr.donor_id
       LEFT JOIN donor_request_responses drr
              ON drr.donor_request_id = n.donor_request_id AND drr.status = 'accepted'
       LEFT JOIN hospitals h_drr ON h_drr.hospital_id = drr.hospital_id
       WHERE n.recipient_type = $1 AND n.recipient_id = $2
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.role, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE notification_id = $1 AND recipient_type = $2 AND recipient_id = $3
       RETURNING *`,
      [req.params.id, req.user.role, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', requireAuth(), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE recipient_type = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [req.user.role, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
