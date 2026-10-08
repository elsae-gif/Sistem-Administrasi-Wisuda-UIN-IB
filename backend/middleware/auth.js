const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Memastikan request membawa token yang valid
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Sesi tidak ditemukan. Silakan login.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query('SELECT id, email, role, nama FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) return res.status(401).json({ message: 'Akun tidak ditemukan.' });
    req.user = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Sesi berakhir atau tidak valid. Silakan login kembali.' });
  }
}

// Membatasi akses berdasarkan role
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke fitur ini.' });
  }
  next();
};

module.exports = { authenticate, requireRole };
