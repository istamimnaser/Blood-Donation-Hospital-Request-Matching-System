const express = require('express');
const pool = require('../db');
const { compatibleDonorGroups, REST_PERIOD_DAYS } = require('../matching');

const router = express.Router();

const REQUEST_SELECT = `
    SELECT r.request_id, r.units_needed, r.units_fulfilled, r.urgency, r.status,
           r.needed_by, r.created_at,
           bg.group_name AS blood_group,
           h.hospital_id, h.name AS hospital_name,
           l.city, l.area
    FROM blood_requests r
    JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
    JOIN hospitals h ON h.hospital_id = r.hospital_id
    JOIN locations l ON l.location_id = h.location_id
`;

router.get('/', async (req, res, next) => {
    try {
        const { status } = req.query;
        const params = [];
        let where = '';
        if (status) {
            params.push(status);
            where = `WHERE r.status = $${params.length}`;
        }
        const { rows } = await pool.query(
            `${REQUEST_SELECT} ${where} ORDER BY
                CASE r.urgency WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                r.created_at DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`${REQUEST_SELECT} WHERE r.request_id = $1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Request not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { hospitalId, bloodGroupId, unitsNeeded, urgency, neededBy } = req.body;
        if (!hospitalId || !bloodGroupId || !unitsNeeded) {
            return res.status(400).json({ error: 'hospitalId, bloodGroupId and unitsNeeded are required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO blood_requests (hospital_id, blood_group_id, units_needed, urgency, needed_by)
             VALUES ($1, $2, $3, COALESCE($4, 'medium'), $5)
             RETURNING request_id`,
            [hospitalId, bloodGroupId, unitsNeeded, urgency, neededBy || null]
        );
        const { rows: full } = await pool.query(`${REQUEST_SELECT} WHERE r.request_id = $1`, [rows[0].request_id]);
        res.status(201).json(full[0]);
    } catch (err) {
        next(err);
    }
});

// Eligible donors for a request: blood-group compatible, available, past their
// 90-day rest period, ranked with same-location and exact-group matches first.
router.get('/:id/eligible-donors', async (req, res, next) => {
    try {
        const { rows: reqRows } = await pool.query(`${REQUEST_SELECT} WHERE r.request_id = $1`, [req.params.id]);
        if (!reqRows.length) return res.status(404).json({ error: 'Request not found' });
        const request = reqRows[0];

        const eligibleGroups = compatibleDonorGroups(request.blood_group);

        const { rows: donors } = await pool.query(
            `SELECT d.donor_id, d.full_name, d.email, d.phone, d.last_donation_date,
                    bg.group_name AS blood_group, l.city, l.area
             FROM donors d
             JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
             JOIN locations l ON l.location_id = d.location_id
             WHERE d.is_available = TRUE
               AND bg.group_name = ANY($1::text[])
               AND (d.last_donation_date IS NULL
                    OR d.last_donation_date <= CURRENT_DATE - $2::int)
               AND NOT EXISTS (
                   SELECT 1 FROM request_matches m
                   WHERE m.request_id = $3 AND m.donor_id = d.donor_id
               )`,
            [eligibleGroups, REST_PERIOD_DAYS, req.params.id]
        );

        const ranked = donors
            .map((donor) => ({
                ...donor,
                exactGroupMatch: donor.blood_group === request.blood_group,
                sameLocation: donor.city === request.city && donor.area === request.area,
            }))
            .sort((a, b) => {
                if (a.sameLocation !== b.sameLocation) return a.sameLocation ? -1 : 1;
                if (a.exactGroupMatch !== b.exactGroupMatch) return a.exactGroupMatch ? -1 : 1;
                return 0;
            });

        res.json(ranked);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
