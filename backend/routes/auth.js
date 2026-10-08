const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { wrap, logActivity, isEmail } = require('../utils/helpers');

const router = express.Router();

// POST /api/auth/login  { email, password }  (mahasiswa juga boleh memakai NIM sebagai email)
router.post('/login', wrap(async (req, res) => {
  const identitas = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!identitas || !password) return res.status(400).json({ message: 'Email/NIM dan password wajib diisi.' });

  const [rows] = await db.query(
    `SELECT u.* FROM users u LEFT JOIN mahasiswa m ON m.user_id = u.id
     WHERE u.email = ? OR m.nim = ? LIMIT 1`,
    [identitas, identitas]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Email/NIM atau password salah.' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '8h',
  });
  await logActivity(user.id, `${user.nama} (${user.role}) login`);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, nama: user.nama } });
}));

router.get('/me', authenticate, wrap(async (req, res) => {
  res.json({ user: req.user, kampus: process.env.NAMA_KAMPUS || 'Universitas Contoh Nusantara' });
}));

// PUT /api/auth/password  { password_lama, password_baru }
router.put('/password', authenticate, wrap(async (req, res) => {
  const { password_lama, password_baru } = req.body;
  if (!password_baru || String(password_baru).length < 6) {
    return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
  }
  const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(String(password_lama || ''), rows[0].password))) {
    return res.status(400).json({ message: 'Password lama tidak sesuai.' });
  }
  await db.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(password_baru, 10), req.user.id]);
  await logActivity(req.user.id, `${req.user.nama} mengganti password`);
  res.json({ message: 'Password berhasil diubah.' });
}));

// PUT /api/auth/profil  (nama & email akun admin)
router.put('/profil', authenticate, wrap(async (req, res) => {
  const { nama, email } = req.body;
  if (!nama || !isEmail(email)) return res.status(400).json({ message: 'Nama dan email yang valid wajib diisi.' });
  const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, req.user.id]);
  if (dup.length) return res.status(400).json({ message: 'Email sudah digunakan akun lain.' });
  await db.query('UPDATE users SET nama = ?, email = ? WHERE id = ?', [nama, email, req.user.id]);
  res.json({ message: 'Profil berhasil diperbarui.' });
}));

module.exports = router;
