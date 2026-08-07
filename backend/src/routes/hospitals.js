const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT h.hospital_id, h.name, l.city, l.area, h.contact_phone, h.email, h.created_at
      FROM hospitals h
      JOIN locations l ON l.location_id = h.location_id
      ORDER BY h.hospital_id DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, location_id, contact_phone, email } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO hospitals (name, location_id, contact_phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, location_id, contact_phone, email || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
