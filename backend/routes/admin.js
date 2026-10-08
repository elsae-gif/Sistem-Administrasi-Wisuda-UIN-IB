const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');
const { wrap, notify, logActivity, userIdOfPendaftaran, isEmail } = require('../utils/helpers');
const { getPendaftaranDetail } = require('../utils/status');
const { queryPendaftar } = require('../utils/filters');
const { qrDataUrl, parseKode } = require('../utils/qr');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

const bad = (res, message) => res.status(400).json({ message });

// ---------- Dashboard ----------
router.get('/dashboard', wrap(async (req, res) => {
  const pf = req.query.periode_id ? 'WHERE p.periode_id = ?' : '';
  const pp = req.query.periode_id ? [Number(req.query.periode_id)] : [];
  const [[c]] = await db.query(
    `SELECT COUNT(CASE WHEN p.status <> 'Draft' THEN 1 END) AS total_pendaftar,
            SUM(p.status = 'Menunggu Verifikasi') AS menunggu,
            SUM(p.status = 'Revisi') AS revisi,
            SUM(p.status IN ('Disetujui','Peserta Wisuda')) AS disetujui,
            SUM(p.status = 'Peserta Wisuda') AS peserta,
            SUM(ps.status_kehadiran = 'Hadir') AS hadir,
            SUM(ps.status_kehadiran = 'Tidak Hadir') AS tidak_hadir
     FROM pendaftaran_wisuda p LEFT JOIN peserta_wisuda ps ON ps.pendaftaran_id = p.id ${pf}`, pp);
  const [perFakultas] = await db.query(
    `SELECT m.fakultas AS label, COUNT(*) AS jumlah FROM pendaftaran_wisuda p JOIN mahasiswa m ON m.id = p.mahasiswa_id
     ${pf ? pf + " AND p.status <> 'Draft'" : "WHERE p.status <> 'Draft'"} GROUP BY m.fakultas ORDER BY jumlah DESC`, pp);
  const [perProdi] = await db.query(
    `SELECT m.program_studi AS label, COUNT(*) AS jumlah FROM pendaftaran_wisuda p JOIN mahasiswa m ON m.id = p.mahasiswa_id
     ${pf ? pf + " AND p.status <> 'Draft'" : "WHERE p.status <> 'Draft'"} GROUP BY m.program_studi ORDER BY jumlah DESC LIMIT 8`, pp);
  const [perStatus] = await db.query(
    `SELECT p.status AS label, COUNT(*) AS jumlah FROM pendaftaran_wisuda p ${pf} GROUP BY p.status`, pp);
  const [perPeriode] = await db.query(
    `SELECT pr.nama_periode AS label, COUNT(p.id) AS jumlah FROM periode_wisuda pr
     LEFT JOIN pendaftaran_wisuda p ON p.periode_id = pr.id AND p.status <> 'Draft' GROUP BY pr.id ORDER BY pr.tanggal_wisuda`);
  const terbaru = (await queryPendaftar({ periode_id: req.query.periode_id }, { exclude_draft: true }))
    .sort((a, b) => String(b.tanggal_daftar).localeCompare(String(a.tanggal_daftar))).slice(0, 6);
  const [aktivitas] = await db.query(
    `SELECT l.aktivitas, l.created_at, u.nama FROM log_aktivitas l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 8`);
  const num = (v) => Number(v || 0);
  res.json({
    kartu: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, num(v)])),
    perFakultas, perProdi, perStatus, perPeriode, terbaru, aktivitas,
  });
}));

// Opsi filter (fakultas, prodi, periode) untuk dropdown
router.get('/opsi', wrap(async (req, res) => {
  const [periode] = await db.query('SELECT id, kode, nama_periode, status FROM periode_wisuda ORDER BY tanggal_wisuda DESC');
  const [fakultas] = await db.query('SELECT DISTINCT fakultas FROM mahasiswa ORDER BY fakultas');
  const [prodi] = await db.query('SELECT DISTINCT fakultas, program_studi FROM mahasiswa ORDER BY program_studi');
  const [sesi] = await db.query('SELECT DISTINCT sesi FROM peserta_wisuda WHERE sesi IS NOT NULL ORDER BY sesi');
  res.json({ periode, fakultas: fakultas.map((f) => f.fakultas), prodi, sesi: sesi.map((s) => s.sesi) });
}));

// ---------- Periode ----------
router.get('/periode', wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pr.*, (SELECT COUNT(*) FROM pendaftaran_wisuda p WHERE p.periode_id = pr.id) AS jumlah_pendaftar
     FROM periode_wisuda pr ORDER BY pr.tanggal_wisuda DESC`);
  res.json(rows);
}));

function validatePeriode(b) {
  if (!String(b.kode || '').trim() || !/^[A-Za-z0-9]{2,10}$/.test(b.kode)) return 'Kode periode wajib diisi (2-10 huruf/angka, contoh 2026A).';
  if (!String(b.nama_periode || '').trim()) return 'Nama periode wajib diisi.';
  if (!b.tanggal_wisuda) return 'Tanggal wisuda wajib diisi.';
  if (!String(b.lokasi || '').trim()) return 'Lokasi wajib diisi.';
  if (Number(b.biaya) < 0 || isNaN(Number(b.biaya))) return 'Biaya tidak valid.';
  if (isNaN(Number(b.min_ipk)) || Number(b.min_ipk) < 0 || Number(b.min_ipk) > 4) return 'IPK minimal harus antara 0 - 4.';
  if (!['Dibuka', 'Ditutup'].includes(b.status)) return 'Status periode tidak valid.';
  return null;
}

router.post('/periode', wrap(async (req, res) => {
  const err = validatePeriode(req.body);
  if (err) return bad(res, err);
  const b = req.body;
  try {
    await db.query(
      'INSERT INTO periode_wisuda (kode, nama_periode, tanggal_wisuda, lokasi, biaya, min_ipk, status) VALUES (?,?,?,?,?,?,?)',
      [b.kode.toUpperCase(), b.nama_periode, b.tanggal_wisuda, b.lokasi, b.biaya || 0, b.min_ipk, b.status]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'Kode periode sudah digunakan.');
    throw e;
  }
  await logActivity(req.user.id, `Admin membuat periode ${b.nama_periode}`);
  res.status(201).json({ message: 'Periode wisuda berhasil dibuat.' });
}));

router.put('/periode/:id', wrap(async (req, res) => {
  const err = validatePeriode(req.body);
  if (err) return bad(res, err);
  const b = req.body;
  try {
    await db.query(
      'UPDATE periode_wisuda SET kode=?, nama_periode=?, tanggal_wisuda=?, lokasi=?, biaya=?, min_ipk=?, status=? WHERE id=?',
      [b.kode.toUpperCase(), b.nama_periode, b.tanggal_wisuda, b.lokasi, b.biaya || 0, b.min_ipk, b.status, req.params.id]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'Kode periode sudah digunakan.');
    throw e;
  }
  await logActivity(req.user.id, `Admin memperbarui periode ${b.nama_periode}`);
  res.json({ message: 'Periode wisuda berhasil diperbarui.' });
}));

router.delete('/periode/:id', wrap(async (req, res) => {
  const [n] = await db.query('SELECT COUNT(*) AS n FROM pendaftaran_wisuda WHERE periode_id = ?', [req.params.id]);
  if (n[0].n > 0) return bad(res, 'Periode tidak dapat dihapus karena sudah memiliki pendaftar. Ubah statusnya menjadi Ditutup.');
  await db.query('DELETE FROM periode_wisuda WHERE id = ?', [req.params.id]);
  await logActivity(req.user.id, 'Admin menghapus periode wisuda');
  res.json({ message: 'Periode wisuda dihapus.' });
}));

// ---------- Pendaftar ----------
router.get('/pendaftar', wrap(async (req, res) => {
  res.json(await queryPendaftar(req.query, { exclude_draft: req.query.termasuk_draft !== '1' }));
}));

router.get('/pendaftar/:id', wrap(async (req, res) => {
  const d = await getPendaftaranDetail(req.params.id);
  if (!d) return res.status(404).json({ message: 'Pendaftaran tidak ditemukan.' });
  res.json(d);
}));

// File berkas (dilihat Admin)
router.get('/berkas/:id/file', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM berkas_wisuda WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Berkas tidak ditemukan.' });
  res.download(path.join(UPLOAD_DIR, rows[0].file_path), rows[0].nama_file);
}));

// ---------- Verifikasi berkas ----------
// PUT /berkas/:id  { status: Valid|Revisi|Ditolak, catatan }
router.put('/berkas/:id', wrap(async (req, res) => {
  const { status, catatan } = req.body;
  if (!['Valid', 'Revisi', 'Ditolak'].includes(status)) return bad(res, 'Status berkas tidak valid.');
  if (status !== 'Valid' && !String(catatan || '').trim()) return bad(res, 'Alasan wajib diisi untuk status Revisi atau Ditolak.');
  const [rows] = await db.query(
    `SELECT b.*, jb.nama AS jenis_nama, jb.is_pembayaran, p.status AS status_daftar
     FROM berkas_wisuda b JOIN jenis_berkas jb ON jb.id = b.jenis_berkas_id JOIN pendaftaran_wisuda p ON p.id = b.pendaftaran_id
     WHERE b.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Berkas tidak ditemukan.' });
  const b = rows[0];
  if (!['Menunggu Verifikasi', 'Revisi', 'Diverifikasi'].includes(b.status_daftar)) {
    return bad(res, `Berkas tidak dapat diverifikasi pada status pendaftaran "${b.status_daftar}".`);
  }
  await db.query('UPDATE berkas_wisuda SET status = ?, catatan = ?, tanggal_verifikasi = NOW() WHERE id = ?',
    [status, status === 'Valid' ? null : catatan.trim(), b.id]);
  if (b.is_pembayaran) {
    const sp = status === 'Valid' ? 'Lunas' : 'Ditolak';
    await db.query('UPDATE pembayaran SET status = ? WHERE pendaftaran_id = ?', [sp, b.pendaftaran_id]);
  }
  const uid = await userIdOfPendaftaran(b.pendaftaran_id);
  if (status === 'Valid') {
    await notify(uid, `Berkas ${b.jenis_nama} Anda dinyatakan valid.`);
  } else {
    await notify(uid, `Berkas ${b.jenis_nama} perlu diperbaiki: ${catatan.trim()}`);
  }

  // Sinkronkan status pendaftaran berdasarkan kondisi berkas
  const d = await getPendaftaranDetail(b.pendaftaran_id);
  const bermasalah = d.berkas.some((x) => ['Revisi', 'Ditolak'].includes(x.status));
  let statusBaru = d.status;
  if (bermasalah) statusBaru = 'Revisi';
  else if (d.berkas_wajib_valid === d.berkas_wajib_total && d.berkas.every((x) => x.status === 'Valid' || x.status === 'Belum Upload')) statusBaru = 'Diverifikasi';
  else statusBaru = 'Menunggu Verifikasi';
  if (statusBaru !== d.status) {
    await db.query('UPDATE pendaftaran_wisuda SET status = ? WHERE id = ?', [statusBaru, d.id]);
    if (statusBaru === 'Diverifikasi') await notify(uid, 'Seluruh berkas Anda telah diverifikasi. Menunggu persetujuan akhir Admin.');
  }
  await logActivity(req.user.id, `Admin memberi status ${status} pada berkas ${b.jenis_nama} (${d.nim})`);
  res.json({ message: `Berkas ditandai ${status}.`, status_pendaftaran: statusBaru });
}));

// POST /pendaftar/:id/keputusan  { aksi: setujui|revisi|tolak, catatan }
router.post('/pendaftar/:id/keputusan', wrap(async (req, res) => {
  const { aksi, catatan } = req.body;
  const d = await getPendaftaranDetail(req.params.id);
  if (!d) return res.status(404).json({ message: 'Pendaftaran tidak ditemukan.' });
  if (['Draft', 'Peserta Wisuda'].includes(d.status)) return bad(res, `Keputusan tidak dapat diberikan pada status "${d.status}".`);
  const uid = d.user_id;

  if (aksi === 'setujui') {
    if (['Disetujui', 'Ditolak'].includes(d.status)) return bad(res, `Pendaftaran sudah berstatus ${d.status}.`);
    if (d.berkas_wajib_valid < d.berkas_wajib_total || d.berkas.some((x) => ['Revisi', 'Ditolak'].includes(x.status))) {
      return bad(res, 'Tidak dapat menyetujui. Semua berkas wajib harus berstatus Valid terlebih dahulu.');
    }
    if (Number(d.ipk) < Number(d.min_ipk) || d.status_kelulusan !== 'Lulus') return bad(res, 'Mahasiswa belum memenuhi syarat akademik (kelulusan/IPK).');
    await db.query("UPDATE pendaftaran_wisuda SET status = 'Disetujui', catatan = ? WHERE id = ?", [catatan || null, d.id]);
    await notify(uid, 'Pendaftaran wisuda Anda telah disetujui.');
    await logActivity(req.user.id, `Admin menyetujui pendaftaran ${d.nama} (${d.nim})`);
    return res.json({ message: 'Pendaftaran disetujui.' });
  }
  if (aksi === 'revisi') {
    if (!String(catatan || '').trim()) return bad(res, 'Catatan revisi wajib diisi.');
    if (['Disetujui', 'Ditolak'].includes(d.status)) return bad(res, `Pendaftaran sudah berstatus ${d.status}.`);
    await db.query("UPDATE pendaftaran_wisuda SET status = 'Revisi', catatan = ? WHERE id = ?", [catatan.trim(), d.id]);
    await notify(uid, `Pendaftaran wisuda Anda perlu direvisi: ${catatan.trim()}`);
    await logActivity(req.user.id, `Admin meminta revisi pendaftaran ${d.nama} (${d.nim})`);
    return res.json({ message: 'Pendaftaran dikembalikan untuk revisi.' });
  }
  if (aksi === 'tolak') {
    if (!String(catatan || '').trim()) return bad(res, 'Alasan penolakan wajib diisi.');
    if (d.status === 'Disetujui') return bad(res, 'Pendaftaran yang sudah disetujui tidak dapat ditolak.');
    await db.query("UPDATE pendaftaran_wisuda SET status = 'Ditolak', catatan = ? WHERE id = ?", [catatan.trim(), d.id]);
    await notify(uid, `Pendaftaran wisuda Anda ditolak: ${catatan.trim()}`);
    await logActivity(req.user.id, `Admin menolak pendaftaran ${d.nama} (${d.nim})`);
    return res.json({ message: 'Pendaftaran ditolak.' });
  }
  bad(res, 'Aksi tidak dikenal.');
}));

// ---------- Peserta wisuda ----------
const PESERTA_SELECT = `
  SELECT ps.*, p.periode_id, p.id AS pendaftaran_id, m.nim, m.nama, m.fakultas, m.program_studi, pr.nama_periode, pr.kode AS kode_periode
  FROM peserta_wisuda ps
  JOIN pendaftaran_wisuda p ON p.id = ps.pendaftaran_id
  JOIN mahasiswa m ON m.id = p.mahasiswa_id
  JOIN periode_wisuda pr ON pr.id = p.periode_id`;

router.get('/peserta', wrap(async (req, res) => {
  const rows = await queryPendaftar({ ...req.query, status_peserta: 'Peserta' });
  res.json(rows);
}));

// Penomoran otomatis: WIS-<kodePeriode>-001
async function tetapkan(conn, pendaftaranId, sesi, nomorKursi) {
  const [rows] = await conn.query(
    `SELECT p.id, p.status, p.periode_id, pr.kode, m.user_id, m.nama
     FROM pendaftaran_wisuda p JOIN periode_wisuda pr ON pr.id = p.periode_id JOIN mahasiswa m ON m.id = p.mahasiswa_id
     WHERE p.id = ? FOR UPDATE`, [pendaftaranId]);
  if (!rows.length) throw Object.assign(new Error('Pendaftaran tidak ditemukan.'), { status: 404 });
  const p = rows[0];
  if (p.status !== 'Disetujui') throw Object.assign(new Error('Hanya mahasiswa berstatus Disetujui yang dapat ditetapkan sebagai peserta.'), { status: 400 });
  const [last] = await conn.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(ps.nomor_peserta, '-', -1) AS UNSIGNED)) AS maks
     FROM peserta_wisuda ps JOIN pendaftaran_wisuda x ON x.id = ps.pendaftaran_id WHERE x.periode_id = ?`, [p.periode_id]);
  const nomor = `WIS-${p.kode}-${String((last[0].maks || 0) + 1).padStart(3, '0')}`;
  await conn.query(
    `INSERT INTO peserta_wisuda (pendaftaran_id, nomor_peserta, sesi, nomor_kursi, qr_code) VALUES (?,?,?,?,?)`,
    [p.id, nomor, sesi || null, nomorKursi || null, `SIWIS|${nomor}`]);
  await conn.query("UPDATE pendaftaran_wisuda SET status = 'Peserta Wisuda' WHERE id = ?", [p.id]);
  await notify(p.user_id, `Selamat, Anda telah ditetapkan sebagai peserta wisuda dengan nomor ${nomor}.`, conn);
  return { nomor, nama: p.nama };
}

router.post('/peserta', wrap(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const r = await tetapkan(conn, Number(req.body.pendaftaran_id), req.body.sesi, req.body.nomor_kursi);
    await logActivity(req.user.id, `Admin menetapkan ${r.nama} sebagai peserta (${r.nomor})`, conn);
    await conn.commit();
    res.status(201).json({ message: `Berhasil ditetapkan sebagai peserta wisuda (${r.nomor}).` });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ message: e.message });
    throw e;
  } finally { conn.release(); }
}));

// Tetapkan semua mahasiswa berstatus Disetujui pada satu periode
router.post('/peserta/massal', wrap(async (req, res) => {
  const periodeId = Number(req.body.periode_id);
  if (!periodeId) return bad(res, 'Pilih periode terlebih dahulu.');
  const [list] = await db.query(
    `SELECT p.id FROM pendaftaran_wisuda p JOIN mahasiswa m ON m.id = p.mahasiswa_id
     WHERE p.periode_id = ? AND p.status = 'Disetujui' ORDER BY m.fakultas, m.program_studi, m.nim`, [periodeId]);
  if (!list.length) return bad(res, 'Tidak ada mahasiswa berstatus Disetujui pada periode ini.');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of list) await tetapkan(conn, row.id, req.body.sesi, null);
    await logActivity(req.user.id, `Admin menetapkan ${list.length} peserta wisuda secara massal`, conn);
    await conn.commit();
    res.status(201).json({ message: `${list.length} mahasiswa berhasil ditetapkan sebagai peserta wisuda.` });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
}));

router.put('/peserta/:id', wrap(async (req, res) => {
  const { sesi, nomor_kursi } = req.body;
  const [r] = await db.query('UPDATE peserta_wisuda SET sesi = ?, nomor_kursi = ? WHERE id = ?', [sesi || null, nomor_kursi || null, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Peserta tidak ditemukan.' });
  await logActivity(req.user.id, 'Admin memperbarui sesi/nomor kursi peserta');
  res.json({ message: 'Data peserta diperbarui.' });
}));

router.delete('/peserta/:id', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT pendaftaran_id FROM peserta_wisuda WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Peserta tidak ditemukan.' });
  await db.query('DELETE FROM peserta_wisuda WHERE id = ?', [req.params.id]);
  await db.query("UPDATE pendaftaran_wisuda SET status = 'Disetujui' WHERE id = ?", [rows[0].pendaftaran_id]);
  await logActivity(req.user.id, 'Admin membatalkan penetapan peserta wisuda');
  res.json({ message: 'Penetapan peserta dibatalkan. Status kembali Disetujui.' });
}));

// ---------- Jadwal ----------
router.get('/jadwal', wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT j.*, pr.nama_periode,
       (SELECT COUNT(*) FROM peserta_wisuda ps JOIN pendaftaran_wisuda p ON p.id = ps.pendaftaran_id
        WHERE p.periode_id = j.periode_id AND ps.sesi = j.sesi) AS jumlah_peserta
     FROM jadwal_wisuda j JOIN periode_wisuda pr ON pr.id = j.periode_id ORDER BY j.tanggal DESC, j.sesi`);
  res.json(rows);
}));

function validateJadwal(b) {
  if (!Number(b.periode_id)) return 'Periode wajib dipilih.';
  if (!String(b.sesi || '').trim()) return 'Sesi wajib diisi (contoh: Sesi 1).';
  if (!b.tanggal) return 'Tanggal wajib diisi.';
  if (!String(b.waktu || '').trim()) return 'Waktu wajib diisi (contoh: 08.00 - 11.00 WIB).';
  if (!String(b.lokasi || '').trim()) return 'Lokasi wajib diisi.';
  return null;
}
router.post('/jadwal', wrap(async (req, res) => {
  const err = validateJadwal(req.body); if (err) return bad(res, err);
  const b = req.body;
  await db.query('INSERT INTO jadwal_wisuda (periode_id, sesi, tanggal, waktu, lokasi, keterangan) VALUES (?,?,?,?,?,?)',
    [b.periode_id, b.sesi.trim(), b.tanggal, b.waktu, b.lokasi, b.keterangan || null]);
  await logActivity(req.user.id, `Admin membuat jadwal ${b.sesi}`);
  res.status(201).json({ message: 'Jadwal wisuda ditambahkan.' });
}));
router.put('/jadwal/:id', wrap(async (req, res) => {
  const err = validateJadwal(req.body); if (err) return bad(res, err);
  const b = req.body;
  await db.query('UPDATE jadwal_wisuda SET periode_id=?, sesi=?, tanggal=?, waktu=?, lokasi=?, keterangan=? WHERE id=?',
    [b.periode_id, b.sesi.trim(), b.tanggal, b.waktu, b.lokasi, b.keterangan || null, req.params.id]);
  await logActivity(req.user.id, `Admin memperbarui jadwal ${b.sesi}`);
  res.json({ message: 'Jadwal wisuda diperbarui.' });
}));
router.delete('/jadwal/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM jadwal_wisuda WHERE id = ?', [req.params.id]);
  await logActivity(req.user.id, 'Admin menghapus jadwal wisuda');
  res.json({ message: 'Jadwal wisuda dihapus.' });
}));

// ---------- Kehadiran ----------
router.get('/kehadiran', wrap(async (req, res) => {
  const rows = await queryPendaftar({ ...req.query, status_peserta: 'Peserta' });
  res.json(rows);
}));

// Cari peserta dari hasil scan QR / input nomor peserta
router.post('/kehadiran/scan', wrap(async (req, res) => {
  const nomor = parseKode(req.body.kode);
  if (!nomor) return bad(res, 'Kode QR / nomor peserta kosong.');
  const [rows] = await db.query(`${PESERTA_SELECT} WHERE ps.nomor_peserta = ?`, [nomor]);
  if (!rows.length) return res.status(404).json({ message: `Peserta dengan nomor ${nomor} tidak ditemukan.` });
  res.json(rows[0]);
}));

// PUT /kehadiran/:id { status: Hadir|Belum Hadir|Tidak Hadir }
router.put('/kehadiran/:id', wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Hadir', 'Belum Hadir', 'Tidak Hadir'].includes(status)) return bad(res, 'Status kehadiran tidak valid.');
  const [r] = await db.query(
    'UPDATE peserta_wisuda SET status_kehadiran = ?, waktu_hadir = ? WHERE id = ?',
    [status, status === 'Hadir' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Peserta tidak ditemukan.' });
  const [info] = await db.query(`${PESERTA_SELECT} WHERE ps.id = ?`, [req.params.id]);
  await logActivity(req.user.id, `Kehadiran ${info[0].nama} (${info[0].nomor_peserta}) dicatat: ${status}`);
  res.json({ message: `Kehadiran ${info[0].nama} dicatat: ${status}.`, peserta: info[0] });
}));

// ---------- Laporan ----------
router.get('/laporan', wrap(async (req, res) => {
  res.json(await queryPendaftar(req.query, { exclude_draft: true }));
}));

// ---------- Pengaturan: jenis berkas ----------
router.get('/jenis-berkas', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM jenis_berkas ORDER BY urutan, id');
  res.json(rows);
}));
function validateJenis(b) {
  if (!String(b.nama || '').trim()) return 'Nama berkas wajib diisi.';
  return null;
}
router.post('/jenis-berkas', wrap(async (req, res) => {
  const err = validateJenis(req.body); if (err) return bad(res, err);
  const b = req.body;
  await db.query('INSERT INTO jenis_berkas (nama, keterangan, wajib, aktif, urutan) VALUES (?,?,?,?,?)',
    [b.nama.trim(), b.keterangan || null, b.wajib ? 1 : 0, b.aktif === false ? 0 : 1, Number(b.urutan) || 99]);
  res.status(201).json({ message: 'Jenis berkas ditambahkan.' });
}));
router.put('/jenis-berkas/:id', wrap(async (req, res) => {
  const err = validateJenis(req.body); if (err) return bad(res, err);
  const b = req.body;
  await db.query('UPDATE jenis_berkas SET nama=?, keterangan=?, wajib=?, aktif=?, urutan=? WHERE id=?',
    [b.nama.trim(), b.keterangan || null, b.wajib ? 1 : 0, b.aktif ? 1 : 0, Number(b.urutan) || 99, req.params.id]);
  res.json({ message: 'Jenis berkas diperbarui.' });
}));
router.delete('/jenis-berkas/:id', wrap(async (req, res) => {
  const [n] = await db.query('SELECT COUNT(*) AS n FROM berkas_wisuda WHERE jenis_berkas_id = ?', [req.params.id]);
  if (n[0].n > 0) return bad(res, 'Jenis berkas sudah dipakai mahasiswa. Nonaktifkan saja, jangan dihapus.');
  await db.query('DELETE FROM jenis_berkas WHERE id = ?', [req.params.id]);
  res.json({ message: 'Jenis berkas dihapus.' });
}));

// ---------- Pengaturan: data mahasiswa ----------
router.get('/mahasiswa', wrap(async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : null;
  const [rows] = await db.query(
    `SELECT m.* FROM mahasiswa m ${q ? 'WHERE m.nim LIKE ? OR m.nama LIKE ?' : ''} ORDER BY m.nim LIMIT 500`, q ? [q, q] : []);
  res.json(rows);
}));

function validateMhs(b, baru) {
  if (!/^[0-9]{6,20}$/.test(String(b.nim || ''))) return 'NIM harus berupa angka (6-20 digit).';
  if (!String(b.nama || '').trim()) return 'Nama wajib diisi.';
  if (!isEmail(b.email)) return 'Email tidak valid.';
  if (!String(b.fakultas || '').trim() || !String(b.program_studi || '').trim()) return 'Fakultas dan program studi wajib diisi.';
  const ipk = Number(b.ipk);
  if (isNaN(ipk) || ipk < 0 || ipk > 4) return 'IPK harus antara 0.00 - 4.00.';
  if (!['Lulus', 'Belum Lulus'].includes(b.status_kelulusan)) return 'Status kelulusan tidak valid.';
  if (baru && String(b.password || '').length < 6) return 'Password awal minimal 6 karakter.';
  return null;
}

router.post('/mahasiswa', wrap(async (req, res) => {
  const err = validateMhs(req.body, true); if (err) return bad(res, err);
  const b = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query("INSERT INTO users (email, password, role, nama) VALUES (?,?, 'mahasiswa', ?)",
      [b.email, await bcrypt.hash(b.password, 10), b.nama.trim()]);
    await conn.query(
      `INSERT INTO mahasiswa (user_id, nim, nama, email, no_hp, fakultas, program_studi, ipk, judul_skripsi, status_kelulusan, tahun_masuk, tahun_lulus)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u.insertId, b.nim, b.nama.trim(), b.email, b.no_hp || null, b.fakultas, b.program_studi, b.ipk, b.judul_skripsi || null,
        b.status_kelulusan, b.tahun_masuk || null, b.tahun_lulus || null]);
    await conn.commit();
    await logActivity(req.user.id, `Admin menambah data mahasiswa ${b.nim}`);
    res.status(201).json({ message: 'Data mahasiswa ditambahkan.' });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'NIM atau email sudah terdaftar.');
    throw e;
  } finally { conn.release(); }
}));

router.put('/mahasiswa/:id', wrap(async (req, res) => {
  const err = validateMhs(req.body, false); if (err) return bad(res, err);
  const b = req.body;
  const [cur] = await db.query('SELECT user_id FROM mahasiswa WHERE id = ?', [req.params.id]);
  if (!cur.length) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan.' });
  try {
    await db.query(
      `UPDATE mahasiswa SET nim=?, nama=?, email=?, no_hp=?, fakultas=?, program_studi=?, ipk=?, judul_skripsi=?, status_kelulusan=?, tahun_masuk=?, tahun_lulus=? WHERE id=?`,
      [b.nim, b.nama.trim(), b.email, b.no_hp || null, b.fakultas, b.program_studi, b.ipk, b.judul_skripsi || null, b.status_kelulusan,
        b.tahun_masuk || null, b.tahun_lulus || null, req.params.id]);
    await db.query('UPDATE users SET nama = ?, email = ? WHERE id = ?', [b.nama.trim(), b.email, cur[0].user_id]);
    if (b.password) {
      if (String(b.password).length < 6) return bad(res, 'Password minimal 6 karakter.');
      await db.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(b.password, 10), cur[0].user_id]);
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'NIM atau email sudah dipakai mahasiswa lain.');
    throw e;
  }
  await logActivity(req.user.id, `Admin memperbarui data mahasiswa ${b.nim}`);
  res.json({ message: 'Data mahasiswa diperbarui.' });
}));

router.delete('/mahasiswa/:id', wrap(async (req, res) => {
  const [cur] = await db.query('SELECT user_id, nim FROM mahasiswa WHERE id = ?', [req.params.id]);
  if (!cur.length) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan.' });
  const [n] = await db.query('SELECT COUNT(*) AS n FROM pendaftaran_wisuda WHERE mahasiswa_id = ?', [req.params.id]);
  if (n[0].n > 0) return bad(res, 'Mahasiswa sudah memiliki pendaftaran wisuda dan tidak dapat dihapus.');
  await db.query('DELETE FROM users WHERE id = ?', [cur[0].user_id]); // mahasiswa ikut terhapus (CASCADE)
  await logActivity(req.user.id, `Admin menghapus data mahasiswa ${cur[0].nim}`);
  res.json({ message: 'Data mahasiswa dihapus.' });
}));

// ---------- Notifikasi admin ----------
router.get('/notifikasi', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM notifikasi WHERE user_id = ? ORDER BY id DESC LIMIT 30', [req.user.id]);
  res.json(rows);
}));
router.post('/notifikasi/baca', wrap(async (req, res) => {
  await db.query('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'ok' });
}));

router.get('/qr/:nomor', wrap(async (req, res) => res.json({ qr: await qrDataUrl(req.params.nomor) })));

module.exports = router;
