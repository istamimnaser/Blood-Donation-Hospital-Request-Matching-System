const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/emergency-requests', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT r.request_id, r.units_needed, r.units_fulfilled, r.status, r.needed_by,
                    bg.group_name AS blood_group, h.name AS hospital_name, l.city, l.area
             FROM blood_requests r
             JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
             JOIN hospitals h ON h.hospital_id = r.hospital_id
             JOIN locations l ON l.location_id = h.location_id
             WHERE r.urgency = 'emergency' AND r.status <> 'fulfilled' AND r.status <> 'cancelled'
             ORDER BY r.needed_by NULLS LAST, r.created_at`
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/hospital-summary', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT h.hospital_id, h.name AS hospital_name,
                    COUNT(r.request_id) AS total_requests,
                    COUNT(r.request_id) FILTER (WHERE r.status = 'fulfilled') AS fulfilled_requests,
                    COUNT(r.request_id) FILTER (WHERE r.status = 'pending') AS pending_requests,
                    COALESCE(SUM(r.units_needed), 0) AS total_units_needed,
                    COALESCE(SUM(r.units_fulfilled), 0) AS total_units_fulfilled
             FROM hospitals h
             LEFT JOIN blood_requests r ON r.hospital_id = h.hospital_id
             GROUP BY h.hospital_id, h.name
             ORDER BY h.name`
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
