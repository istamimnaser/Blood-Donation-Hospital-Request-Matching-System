const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

function signToken(id, role, email) {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// trg_donor_availability_insert fires on this insert and logs the first
// donor_availability row automatically.
router.post('/signup/donor', async (req, res, next) => {
  try {
    const {
      full_name, email, password, phone,
      date_of_birth, blood_group_id, location_id, last_donation_date,
    } = req.body;

    if (!full_name || !email || !password || !phone || !blood_group_id || !location_id) {
      return res.status(400).json({ error: 'full_name, email, password, phone, blood_group_id, and location_id are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO donors (full_name, email, password_hash, phone, blood_group_id, location_id, date_of_birth, last_donation_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING donor_id, full_name, email, phone, blood_group_id, location_id, date_of_birth, is_available, last_donation_date, created_at`,
      [full_name, email, password_hash, phone, Number(blood_group_id), Number(location_id), date_of_birth || null, last_donation_date || null]
    );

    const donor = rows[0];
    res.status(201).json({ token: signToken(donor.donor_id, 'donor', donor.email), role: 'donor', user: donor });
  } catch (err) {
    next(err);
  }
});

router.post('/signup/hospital', async (req, res, next) => {
  try {
    const { name, email, password, contact_phone, location_id } = req.body;

    if (!name || !email || !password || !contact_phone || !location_id) {
      return res.status(400).json({ error: 'name, email, password, contact_phone, and location_id are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO hospitals (name, email, password_hash, contact_phone, location_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING hospital_id, name, email, contact_phone, location_id, created_at`,
      [name, email, password_hash, contact_phone, Number(location_id)]
    );

    const hospital = rows[0];
    res.status(201).json({ token: signToken(hospital.hospital_id, 'hospital', hospital.email), role: 'hospital', user: hospital });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !['donor', 'hospital'].includes(role)) {
      return res.status(400).json({ error: 'email, password, and role (donor|hospital) are required' });
    }

    const table = role === 'donor' ? 'donors' : 'hospitals';
    const idColumn = role === 'donor' ? 'donor_id' : 'hospital_id';

    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE email = $1`,
      [email]
    );
    const account = rows[0];

    if (!account || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete account.password_hash;
    res.json({ token: signToken(account[idColumn], role, account.email), role, user: account });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
