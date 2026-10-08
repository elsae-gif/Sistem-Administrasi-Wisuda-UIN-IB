const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, UPLOAD_DIR, MAX_SIZE } = require('../middleware/upload');
const { wrap, notify, logActivity, isEmail } = require('../utils/helpers');
const { getPendaftaranDetail } = require('../utils/status');
const { qrDataUrl, qrBuffer } = require('../utils/qr');

const router = express.Router();
router.use(authenticate, requireRole('mahasiswa'));

// Memuat data mahasiswa milik user yang login (mahasiswa hanya bisa mengakses datanya sendiri)
router.use(wrap(async (req, res, next) => {
  const [rows] = await db.query('SELECT * FROM mahasiswa WHERE user_id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'Data mahasiswa untuk akun ini belum dibuat. Hubungi Admin.' });
  req.mhs = rows[0];
  next();
}));

async function pendaftaranTerbaru(mhsId) {
  const [rows] = await db.query('SELECT id FROM pendaftaran_wisuda WHERE mahasiswa_id = ? ORDER BY id DESC LIMIT 1', [mhsId]);
  return rows.length ? getPendaftaranDetail(rows[0].id) : null;
}

const notifAdmins = async (pesan) => {
  const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin'");
  for (const a of admins) await notify(a.id, pesan);
};

// ---------- Dashboard ----------
router.get('/dashboard', wrap(async (req, res) => {
  const pendaftaran = await pendaftaranTerbaru(req.mhs.id);
  let jadwal = [];
  if (pendaftaran) {
    const [j] = await db.query('SELECT * FROM jadwal_wisuda WHERE periode_id = ? ORDER BY tanggal, sesi', [pendaftaran.periode_id]);
    jadwal = pendaftaran.sesi ? j.filter((x) => x.sesi === pendaftaran.sesi) : j;
  }
  res.json({ mahasiswa: req.mhs, pendaftaran, jadwal });
}));

// ---------- Data diri ----------
router.get('/profil', wrap(async (req, res) => {
  const p = await pendaftaranTerbaru(req.mhs.id);
  res.json({ mahasiswa: req.mhs, terkunci: !!p && !['Draft', 'Revisi'].includes(p.status) });
}));

router.put('/profil', wrap(async (req, res) => {
  const p = await pendaftaranTerbaru(req.mhs.id);
  if (p && !['Draft', 'Revisi'].includes(p.status)) {
    return res.status(403).json({ message: 'Data diri terkunci karena pendaftaran sedang diverifikasi atau sudah diproses.' });
  }
  const { email, no_hp, judul_skripsi } = req.body;
  if (!isEmail(email)) return res.status(400).json({ message: 'Format email tidak valid.' });
  if (!/^[0-9+\-\s]{8,20}$/.test(String(no_hp || ''))) return res.status(400).json({ message: 'Nomor HP tidak valid (8-20 digit).' });
  if (!String(judul_skripsi || '').trim()) return res.status(400).json({ message: 'Judul skripsi/tugas akhir wajib diisi.' });
  await db.query('UPDATE mahasiswa SET email = ?, no_hp = ?, judul_skripsi = ? WHERE id = ?', [email, no_hp, judul_skripsi.trim(), req.mhs.id]);
  await logActivity(req.user.id, `${req.mhs.nama} memperbarui data diri`);
  res.json({ message: 'Data diri berhasil disimpan.' });
}));

// ---------- Periode & pendaftaran ----------
router.get('/periode', wrap(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM periode_wisuda WHERE status = 'Dibuka' ORDER BY tanggal_wisuda");
  res.json(rows);
}));

router.get('/pendaftaran', wrap(async (req, res) => {
  res.json({ pendaftaran: await pendaftaranTerbaru(req.mhs.id), mahasiswa: req.mhs, maks_ukuran_mb: MAX_SIZE / 1024 / 1024 });
}));

// Membuat pendaftaran (Draft) setelah pemeriksaan kelayakan otomatis
router.post('/pendaftaran', wrap(async (req, res) => {
  const periodeId = Number(req.body.periode_id);
  const [pr] = await db.query("SELECT * FROM periode_wisuda WHERE id = ? AND status = 'Dibuka'", [periodeId]);
  if (!pr.length) return res.status(400).json({ message: 'Periode wisuda tidak ditemukan atau sudah ditutup.' });
  const periode = pr[0];

  const alasan = [];
  if (req.mhs.status_kelulusan !== 'Lulus') alasan.push('Status kelulusan Anda belum "Lulus".');
  if (Number(req.mhs.ipk) < Number(periode.min_ipk)) alasan.push(`IPK Anda (${req.mhs.ipk}) di bawah syarat minimal ${periode.min_ipk}.`);
  if (!req.mhs.judul_skripsi) alasan.push('Judul skripsi/tugas akhir belum diisi (lengkapi di menu Data Diri).');
  if (alasan.length) return res.status(400).json({ message: 'Anda belum memenuhi syarat kelayakan.', alasan });

  const [aktif] = await db.query("SELECT id FROM pendaftaran_wisuda WHERE mahasiswa_id = ? AND status <> 'Ditolak'", [req.mhs.id]);
  if (aktif.length) return res.status(400).json({ message: 'Anda sudah memiliki pendaftaran wisuda yang masih aktif.' });
  const [dup] = await db.query('SELECT id FROM pendaftaran_wisuda WHERE mahasiswa_id = ? AND periode_id = ?', [req.mhs.id, periodeId]);
  if (dup.length) return res.status(400).json({ message: 'Anda pernah mendaftar pada periode ini.' });

  const [ins] = await db.query("INSERT INTO pendaftaran_wisuda (mahasiswa_id, periode_id, status) VALUES (?, ?, 'Draft')", [req.mhs.id, periodeId]);
  await db.query('INSERT INTO pembayaran (pendaftaran_id, nominal) VALUES (?, ?)', [ins.insertId, periode.biaya]);
  await logActivity(req.user.id, `${req.mhs.nama} membuat draft pendaftaran wisuda ${periode.nama_periode}`);
  res.status(201).json({ message: 'Draft pendaftaran dibuat. Lanjutkan dengan mengupload berkas.', id: ins.insertId });
}));

// Mengirim pendaftaran untuk diverifikasi
router.post('/pendaftaran/submit', wrap(async (req, res) => {
  const p = await pendaftaranTerbaru(req.mhs.id);
  if (!p) return res.status(404).json({ message: 'Belum ada pendaftaran.' });
  if (!['Draft', 'Revisi'].includes(p.status)) return res.status(400).json({ message: 'Pendaftaran sudah dikirim atau sudah diproses.' });
  const kurang = p.berkas.filter((b) => b.wajib && b.status === 'Belum Upload').map((b) => b.jenis_nama);
  if (kurang.length) return res.status(400).json({ message: 'Berkas wajib belum lengkap: ' + kurang.join(', ') + '.' });
  const perluRevisi = p.berkas.filter((b) => ['Revisi', 'Ditolak'].includes(b.status)).map((b) => b.jenis_nama);
  if (perluRevisi.length) return res.status(400).json({ message: 'Perbaiki dan upload ulang berkas berikut: ' + perluRevisi.join(', ') + '.' });

  await db.query("UPDATE pendaftaran_wisuda SET status = 'Menunggu Verifikasi', tanggal_daftar = COALESCE(tanggal_daftar, NOW()), catatan = NULL WHERE id = ?", [p.id]);
  await logActivity(req.user.id, `${req.mhs.nama} mengirim pendaftaran wisuda`);
  await notify(req.user.id, 'Pendaftaran wisuda Anda berhasil dikirim. Berkas Anda sedang diverifikasi.');
  await notifAdmins(`${req.mhs.nama} (${req.mhs.nim}) mengirim pendaftaran wisuda.`);
  res.json({ message: 'Pendaftaran berhasil dikirim dan menunggu verifikasi.' });
}));

// ---------- Berkas ----------
router.post('/berkas', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `Ukuran file terlalu besar. Maksimal ${MAX_SIZE / 1024 / 1024} MB.` });
    return res.status(400).json({ message: err.message || 'Upload gagal.' });
  });
}, wrap(async (req, res) => {
  const cleanup = () => req.file && fs.unlink(req.file.path, () => {});
  const p = await pendaftaranTerbaru(req.mhs.id);
  if (!p) { cleanup(); return res.status(400).json({ message: 'Buat pendaftaran wisuda terlebih dahulu.' }); }
  if (!req.file) return res.status(400).json({ message: 'Pilih file yang akan diupload.' });
  const jenis = p.berkas.find((b) => b.jenis_id === Number(req.body.jenis_berkas_id));
  if (!jenis) { cleanup(); return res.status(400).json({ message: 'Jenis berkas tidak valid.' }); }

  const bolehDraft = p.status === 'Draft';
  const bolehRevisi = p.status === 'Revisi' && ['Revisi', 'Ditolak', 'Belum Upload'].includes(jenis.status);
  if (!bolehDraft && !bolehRevisi) {
    cleanup();
    return res.status(403).json({ message: 'Berkas tidak dapat diubah pada tahap ini. Upload ulang hanya untuk berkas yang diminta revisi.' });
  }
  if (jenis.status === 'Valid') { cleanup(); return res.status(403).json({ message: 'Berkas ini sudah valid dan tidak dapat diganti.' }); }

  // hapus file lama jika ada
  const [lama] = await db.query('SELECT id, file_path FROM berkas_wisuda WHERE pendaftaran_id = ? AND jenis_berkas_id = ?', [p.id, jenis.jenis_id]);
  if (lama.length) {
    fs.unlink(path.join(UPLOAD_DIR, lama[0].file_path), () => {});
    await db.query(
      `UPDATE berkas_wisuda SET nama_file = ?, file_path = ?, status = 'Menunggu Verifikasi', catatan = NULL,
       tanggal_upload = NOW(), tanggal_verifikasi = NULL WHERE id = ?`,
      [req.file.originalname, req.file.filename, lama[0].id]
    );
  } else {
    await db.query(
      `INSERT INTO berkas_wisuda (pendaftaran_id, jenis_berkas_id, nama_file, file_path, status, tanggal_upload)
       VALUES (?, ?, ?, ?, 'Menunggu Verifikasi', NOW())`,
      [p.id, jenis.jenis_id, req.file.originalname, req.file.filename]
    );
  }
  if (jenis.is_pembayaran) {
    await db.query("UPDATE pembayaran SET bukti_pembayaran = ?, status = 'Menunggu Verifikasi', tanggal_pembayaran = NOW() WHERE pendaftaran_id = ?", [req.file.filename, p.id]);
  }

  // Jika sedang Revisi dan semua berkas bermasalah sudah diganti -> kembali ke Menunggu Verifikasi
  let pesan = `Berkas "${jenis.jenis_nama}" berhasil diupload.`;
  if (p.status === 'Revisi') {
    const [sisa] = await db.query("SELECT COUNT(*) AS n FROM berkas_wisuda WHERE pendaftaran_id = ? AND status IN ('Revisi','Ditolak')", [p.id]);
    if (sisa[0].n === 0) {
      await db.query("UPDATE pendaftaran_wisuda SET status = 'Menunggu Verifikasi' WHERE id = ?", [p.id]);
      await notifAdmins(`${req.mhs.nama} (${req.mhs.nim}) mengirim perbaikan berkas. Menunggu verifikasi ulang.`);
      await notify(req.user.id, 'Berkas revisi Anda sudah terkirim dan sedang diverifikasi ulang.');
      pesan += ' Semua revisi sudah dikirim, pendaftaran kembali menunggu verifikasi.';
    }
  }
  await logActivity(req.user.id, `${req.mhs.nama} mengupload berkas ${jenis.jenis_nama}`);
  res.status(201).json({ message: pesan });
}));

// Melihat/mengunduh berkas milik sendiri
router.get('/berkas/:id/file', wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT b.* FROM berkas_wisuda b JOIN pendaftaran_wisuda p ON p.id = b.pendaftaran_id
     WHERE b.id = ? AND p.mahasiswa_id = ?`, [req.params.id, req.mhs.id]);
  if (!rows.length) return res.status(404).json({ message: 'Berkas tidak ditemukan.' });
  res.download(path.join(UPLOAD_DIR, rows[0].file_path), rows[0].nama_file);
}));

// ---------- Jadwal ----------
router.get('/jadwal', wrap(async (req, res) => {
  const p = await pendaftaranTerbaru(req.mhs.id);
  if (!p) return res.json({ pendaftaran: null, jadwal: [] });
  const [jadwal] = await db.query('SELECT * FROM jadwal_wisuda WHERE periode_id = ? ORDER BY tanggal, sesi', [p.periode_id]);
  res.json({ pendaftaran: p, jadwal });
}));

// ---------- Kartu peserta ----------
async function dataKartu(mhsId) {
  const p = await pendaftaranTerbaru(mhsId);
  if (!p || !p.nomor_peserta) return null;
  const [j] = await db.query('SELECT * FROM jadwal_wisuda WHERE periode_id = ? AND sesi = ? LIMIT 1', [p.periode_id, p.sesi || '']);
  return { p, jadwal: j[0] || null };
}

router.get('/kartu', wrap(async (req, res) => {
  const d = await dataKartu(req.mhs.id);
  if (!d) return res.status(403).json({ message: 'Kartu peserta tersedia setelah Anda ditetapkan sebagai peserta wisuda.' });
  res.json({
    kampus: process.env.NAMA_KAMPUS, peserta: d.p, jadwal: d.jadwal, qr: await qrDataUrl(d.p.nomor_peserta),
  });
}));

router.get('/kartu/pdf', wrap(async (req, res) => {
  const d = await dataKartu(req.mhs.id);
  if (!d) return res.status(403).json({ message: 'Kartu peserta belum tersedia.' });
  const { p, jadwal } = d;
  const doc = new PDFDocument({ size: [420, 600], margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="kartu-${p.nomor_peserta}.pdf"`);
  doc.pipe(res);
  doc.rect(0, 0, 420, 120).fill('#14304a');
  doc.circle(60, 60, 28).lineWidth(2).stroke('#c8963e');
  doc.fillColor('#c8963e').fontSize(18).font('Helvetica-Bold').text('S', 52, 49);
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(process.env.NAMA_KAMPUS || 'Kampus', 105, 40, { width: 290 });
  doc.fontSize(10).font('Helvetica').text('KARTU PESERTA WISUDA', 105, 62);
  doc.fontSize(9).text(p.nama_periode, 105, 78, { width: 290 });
  const baris = [
    ['Nama', p.nama], ['NIM', p.nim], ['Fakultas', p.fakultas], ['Program Studi', p.program_studi],
    ['Nomor Peserta', p.nomor_peserta], ['Sesi', p.sesi || '-'], ['Nomor Kursi', p.nomor_kursi || '-'],
    ['Tanggal Wisuda', jadwal ? jadwal.tanggal : p.tanggal_wisuda], ['Waktu', jadwal ? jadwal.waktu : '-'],
    ['Lokasi', jadwal ? jadwal.lokasi : p.lokasi_periode],
  ];
  let y = 140;
  baris.forEach(([k, v]) => {
    doc.fillColor('#6b7a89').fontSize(9).font('Helvetica').text(k, 30, y, { width: 100 });
    doc.fillColor('#14304a').fontSize(11).font('Helvetica-Bold').text(String(v), 135, y - 1, { width: 260 });
    y += 26;
  });
  doc.image(await qrBuffer(p.nomor_peserta), 135, y + 10, { width: 150 });
  doc.fillColor('#6b7a89').fontSize(8).font('Helvetica').text('Tunjukkan QR Code ini saat registrasi kehadiran', 0, y + 166, { width: 420, align: 'center' });
  doc.end();
}));

// ---------- Notifikasi ----------
router.get('/notifikasi', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM notifikasi WHERE user_id = ? ORDER BY id DESC LIMIT 30', [req.user.id]);
  res.json(rows);
}));
router.post('/notifikasi/baca', wrap(async (req, res) => {
  await db.query('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'ok' });
}));

module.exports = router;
