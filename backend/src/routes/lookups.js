const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/blood-groups', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM blood_groups ORDER BY group_name');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/locations', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM locations ORDER BY city, area');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/locations', async (req, res, next) => {
    try {
        const { city, area } = req.body;
        if (!city || !area) {
            return res.status(400).json({ error: 'city and area are required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO locations (city, area) VALUES ($1, $2)
             ON CONFLICT (city, area) DO UPDATE SET city = EXCLUDED.city
             RETURNING *`,
            [city, area]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
