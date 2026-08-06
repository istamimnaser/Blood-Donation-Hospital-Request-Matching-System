const express = require('express');
const pool = require('../db');

const router = express.Router();

const HOSPITAL_SELECT = `
    SELECT h.hospital_id, h.name, h.contact_phone, h.email, h.created_at,
           l.city, l.area
    FROM hospitals h
    JOIN locations l ON l.location_id = h.location_id
`;

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`${HOSPITAL_SELECT} ORDER BY h.name`);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { name, locationId, contactPhone, email } = req.body;
        if (!name || !locationId || !contactPhone) {
            return res.status(400).json({ error: 'name, locationId and contactPhone are required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO hospitals (name, location_id, contact_phone, email)
             VALUES ($1, $2, $3, $4) RETURNING hospital_id`,
            [name, locationId, contactPhone, email || null]
        );
        const { rows: full } = await pool.query(`${HOSPITAL_SELECT} WHERE h.hospital_id = $1`, [rows[0].hospital_id]);
        res.status(201).json(full[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
