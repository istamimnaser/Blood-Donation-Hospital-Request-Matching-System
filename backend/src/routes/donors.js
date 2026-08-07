const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const pool = require('../db');

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) => {
      cb(null, `donor_${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for donor photos'));
    }
    cb(null, true);
  },
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.donor_id, d.full_name, d.email, d.phone, bg.group_name AS blood_group,
             l.city, l.area, d.is_available, d.last_donation_date, d.photo_url, d.created_at
      FROM donors d
      JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
      JOIN locations l ON l.location_id = d.location_id
      ORDER BY d.donor_id DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Sent as multipart/form-data so an optional photo file can ride along.
// trg_donor_availability_insert fires on this and logs the first
// donor_availability row automatically.
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const { full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const { rows } = await pool.query(
      `INSERT INTO donors (full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE), $8)
       RETURNING *`,
      [
        full_name,
        email || null,
        phone,
        Number(blood_group_id),
        Number(location_id),
        date_of_birth || null,
        is_available === undefined ? undefined : is_available === 'true' || is_available === true,
        photo_url,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Toggling is_available fires trg_donor_availability_update, which
// appends a row to donor_availability.
router.patch('/:id', async (req, res, next) => {
  try {
    const { is_available } = req.body;
    const { rows } = await pool.query(
      `UPDATE donors SET is_available = $1 WHERE donor_id = $2 RETURNING *`,
      [is_available, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Donor not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
