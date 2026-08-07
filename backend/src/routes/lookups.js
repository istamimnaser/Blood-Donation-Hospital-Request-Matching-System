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

module.exports = router;
