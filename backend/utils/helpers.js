const db = require('../config/db');

// Membungkus handler async agar error diteruskan ke error middleware
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function notify(userId, pesan, conn = db) {
  await conn.query('INSERT INTO notifikasi (user_id, pesan) VALUES (?, ?)', [userId, pesan]);
}

async function logActivity(userId, aktivitas, conn = db) {
  await conn.query('INSERT INTO log_aktivitas (user_id, aktivitas) VALUES (?, ?)', [userId, aktivitas]);
}

// Mengambil user_id milik mahasiswa dari pendaftaran
async function userIdOfPendaftaran(pendaftaranId) {
  const [r] = await db.query(
    `SELECT m.user_id FROM pendaftaran_wisuda p JOIN mahasiswa m ON m.id = p.mahasiswa_id WHERE p.id = ?`,
    [pendaftaranId]
  );
  return r.length ? r[0].user_id : null;
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

module.exports = { wrap, notify, logActivity, userIdOfPendaftaran, isEmail };
