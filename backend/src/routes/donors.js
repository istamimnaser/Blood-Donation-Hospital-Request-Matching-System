const express = require('express');
const pool = require('../db');

const router = express.Router();

const DONOR_SELECT = `
    SELECT d.donor_id, d.full_name, d.email, d.phone, d.date_of_birth,
           d.is_available, d.last_donation_date, d.created_at,
           bg.group_name AS blood_group,
           l.city, l.area
    FROM donors d
    JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
    JOIN locations l ON l.location_id = d.location_id
`;

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`${DONOR_SELECT} ORDER BY d.created_at DESC`);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`${DONOR_SELECT} WHERE d.donor_id = $1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Donor not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { fullName, email, phone, bloodGroupId, locationId, dateOfBirth, isAvailable } = req.body;
        if (!fullName || !phone || !bloodGroupId || !locationId) {
            return res.status(400).json({ error: 'fullName, phone, bloodGroupId and locationId are required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO donors (full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
             RETURNING donor_id`,
            [fullName, email || null, phone, bloodGroupId, locationId, dateOfBirth || null, isAvailable]
        );
        const { rows: full } = await pool.query(`${DONOR_SELECT} WHERE d.donor_id = $1`, [rows[0].donor_id]);
        res.status(201).json(full[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'A donor with this email already exists' });
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const { isAvailable, phone, email } = req.body;
        const { rows } = await pool.query(
            `UPDATE donors SET
                is_available = COALESCE($1, is_available),
                phone = COALESCE($2, phone),
                email = COALESCE($3, email)
             WHERE donor_id = $4
             RETURNING donor_id`,
            [isAvailable, phone, email, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Donor not found' });
        const { rows: full } = await pool.query(`${DONOR_SELECT} WHERE d.donor_id = $1`, [req.params.id]);
        res.json(full[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
