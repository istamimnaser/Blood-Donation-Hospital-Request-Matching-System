const router = require('express').Router();
const pool = require('../db');

// Dropdown data for forms (blood group / location pickers).

router.get('/blood-groups', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT blood_group_id, group_name FROM blood_groups ORDER BY group_name'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/locations', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT location_id, city, area FROM locations ORDER BY city, area'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/blood-compatibility', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.group_name AS donor_group, r.group_name AS recipient_group
       FROM blood_compatibility bc
       JOIN blood_groups d ON d.blood_group_id = bc.donor_blood_group_id
       JOIN blood_groups r ON r.blood_group_id = bc.recipient_blood_group_id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
