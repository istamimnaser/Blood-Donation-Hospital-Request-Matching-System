const express = require('express');
const pool = require('../db');

const router = express.Router();

const MATCH_SELECT = `
    SELECT m.match_id, m.match_status, m.matched_at,
           m.request_id, m.donor_id,
           d.full_name AS donor_name, d.phone AS donor_phone,
           bg.group_name AS donor_blood_group
    FROM request_matches m
    JOIN donors d ON d.donor_id = m.donor_id
    JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
`;

router.get('/', async (req, res, next) => {
    try {
        const { requestId } = req.query;
        const params = [];
        let where = '';
        if (requestId) {
            params.push(requestId);
            where = `WHERE m.request_id = $${params.length}`;
        }
        const { rows } = await pool.query(`${MATCH_SELECT} ${where} ORDER BY m.matched_at DESC`, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Suggest one or more donors for a request (creates 'suggested' matches).
router.post('/', async (req, res, next) => {
    try {
        const { requestId, donorIds } = req.body;
        if (!requestId || !Array.isArray(donorIds) || !donorIds.length) {
            return res.status(400).json({ error: 'requestId and a non-empty donorIds array are required' });
        }
        const { rows } = await pool.query(
            `INSERT INTO request_matches (request_id, donor_id)
             SELECT $1, donor_id FROM UNNEST($2::int[]) AS donor_id
             ON CONFLICT (request_id, donor_id) DO NOTHING
             RETURNING match_id`,
            [requestId, donorIds]
        );
        if (!rows.length) return res.status(200).json([]);
        const ids = rows.map((r) => r.match_id);
        const { rows: full } = await pool.query(`${MATCH_SELECT} WHERE m.match_id = ANY($1::int[])`, [ids]);
        res.status(201).json(full);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const { matchStatus } = req.body;
        if (!['suggested', 'accepted', 'declined', 'completed'].includes(matchStatus)) {
            return res.status(400).json({ error: 'Invalid matchStatus' });
        }
        const { rows } = await pool.query(
            `UPDATE request_matches SET match_status = $1 WHERE match_id = $2 RETURNING match_id`,
            [matchStatus, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Match not found' });
        const { rows: full } = await pool.query(`${MATCH_SELECT} WHERE m.match_id = $1`, [req.params.id]);
        res.json(full[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
