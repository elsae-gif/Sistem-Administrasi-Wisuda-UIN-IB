require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diatur. Salin .env.example menjadi .env lalu isi nilainya.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// Catatan: folder uploads TIDAK dibuka publik. File hanya bisa diunduh lewat endpoint yang terautentikasi.
app.get('/api/health', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ status: 'ok', database: 'terhubung' }); }
  catch (e) { res.status(500).json({ status: 'error', database: e.message }); }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/export', require('./routes/export'));

// Sajikan frontend hasil build (opsional: npm run build di folder frontend)
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }));

// Error handler terpusat
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({ message: 'Database belum siap. Pastikan database/siwis.sql sudah diimport.' });
  }
  if (err.code === 'ECONNREFUSED') return res.status(500).json({ message: 'Tidak dapat terhubung ke MySQL. Pastikan MySQL berjalan dan .env benar.' });
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SIWIS backend berjalan di http://localhost:${PORT}`));
