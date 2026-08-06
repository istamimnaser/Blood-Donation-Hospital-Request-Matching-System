const express = require('express');
const pool = require('../db');

const router = express.Router();

const DONATION_SELECT = `
    SELECT don.donation_id, don.units_donated, don.donation_date, don.created_at,
           don.donor_id, d.full_name AS donor_name,
           don.request_id, br.hospital_id
    FROM donations don
    JOIN donors d ON d.donor_id = don.donor_id
    LEFT JOIN blood_requests br ON br.request_id = don.request_id
`;

router.get('/', async (req, res, next) => {
    try {
        const { donorId, requestId } = req.query;
        const conditions = [];
        const params = [];
        if (donorId) {
            params.push(donorId);
            conditions.push(`don.donor_id = $${params.length}`);
        }
        if (requestId) {
            params.push(requestId);
            conditions.push(`don.request_id = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(`${DONATION_SELECT} ${where} ORDER BY don.donation_date DESC`, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Recording a donation triggers apply_donation() in Postgres, which rolls the
// donor's last_donation_date forward and updates the parent request's fulfillment.
router.post('/', async (req, res, next) => {
    try {
        const { donorId, requestId, unitsDonated, donationDate } = req.body;
        if (!donorId) {
            return res.status(400).json({ error: 'donorId is required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO donations (donor_id, request_id, units_donated, donation_date)
             VALUES ($1, $2, COALESCE($3, 1), COALESCE($4, CURRENT_DATE))
             RETURNING donation_id`,
            [donorId, requestId || null, unitsDonated, donationDate || null]
        );
        const { rows: full } = await pool.query(`${DONATION_SELECT} WHERE don.donation_id = $1`, [rows[0].donation_id]);
        res.status(201).json(full[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
