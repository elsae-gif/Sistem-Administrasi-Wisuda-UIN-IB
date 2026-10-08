const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { wrap, logActivity } = require('../utils/helpers');
const { queryPendaftar, buildWhere } = require('../utils/filters');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14304A' } };

// Membuat worksheet dengan judul, informasi filter, header berwarna, dan lebar kolom otomatis
function buatSheet(wb, nama, judul, subjudul, kolom, baris) {
  const ws = wb.addWorksheet(nama);
  const n = kolom.length;
  ws.mergeCells(1, 1, 1, n);
  ws.getCell(1, 1).value = judul;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF14304A' } };
  ws.mergeCells(2, 1, 2, n);
  ws.getCell(2, 1).value = subjudul;
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF6B7A89' } };
  const header = ws.getRow(4);
  kolom.forEach((k, i) => {
    const c = header.getCell(i + 1);
    c.value = k.header; c.fill = HEADER_FILL;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    ws.getColumn(i + 1).width = k.width || 16;
  });
  header.height = 22;
  baris.forEach((r, idx) => {
    const row = ws.addRow(kolom.map((k) => (k.key === 'no' ? idx + 1 : r[k.key] ?? '')));
    row.eachCell((c) => { c.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } }; });
  });
  if (!baris.length) ws.addRow(['Tidak ada data untuk filter yang dipilih.']);
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  return ws;
}

// Deskripsi filter untuk baris keterangan di Excel
async function deskripsiFilter(q) {
  const parts = [];
  if (q.periode_id) {
    const [r] = await db.query('SELECT nama_periode FROM periode_wisuda WHERE id = ?', [q.periode_id]);
    if (r.length) parts.push('Periode: ' + r[0].nama_periode);
  }
  if (q.fakultas) parts.push('Fakultas: ' + q.fakultas);
  if (q.program_studi) parts.push('Prodi: ' + q.program_studi);
  if (q.status) parts.push('Status: ' + q.status);
  if (q.sesi) parts.push('Sesi: ' + q.sesi);
  if (q.status_kehadiran) parts.push('Kehadiran: ' + q.status_kehadiran);
  const tgl = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  return (parts.length ? parts.join(' | ') : 'Semua data') + '  —  Dicetak: ' + tgl;
}

const KOLOM = {
  no: { header: 'No', key: 'no', width: 6 },
  nim: { header: 'NIM', key: 'nim', width: 14 },
  nama: { header: 'Nama', key: 'nama', width: 30 },
  fakultas: { header: 'Fakultas', key: 'fakultas', width: 26 },
  program_studi: { header: 'Program Studi', key: 'program_studi', width: 26 },
  ipk: { header: 'IPK', key: 'ipk', width: 8 },
  status: { header: 'Status', key: 'status', width: 20 },
  nomor_peserta: { header: 'No Peserta', key: 'nomor_peserta', width: 18 },
  sesi: { header: 'Sesi', key: 'sesi', width: 12 },
  kehadiran: { header: 'Kehadiran', key: 'status_kehadiran', width: 14 },
  periode: { header: 'Periode', key: 'nama_periode', width: 28 },
  tgl_daftar: { header: 'Tanggal Daftar', key: 'tanggal_daftar', width: 20 },
  email: { header: 'Email', key: 'email', width: 28 },
  hp: { header: 'No HP', key: 'no_hp', width: 16 },
  judul: { header: 'Judul Skripsi/TA', key: 'judul_skripsi', width: 50 },
  kursi: { header: 'No Kursi', key: 'nomor_kursi', width: 10 },
  waktu_hadir: { header: 'Waktu Hadir', key: 'waktu_hadir', width: 20 },
  berkas: { header: 'Berkas Valid', key: 'berkas_ket', width: 14 },
};

const DEFINISI = {
  // 1. Seluruh peserta wisuda
  peserta: {
    judul: 'Daftar Peserta Wisuda', file: 'peserta-wisuda',
    ambil: (q) => queryPendaftar({ ...q, status_peserta: 'Peserta' }),
    kolom: ['no', 'nomor_peserta', 'nim', 'nama', 'fakultas', 'program_studi', 'ipk', 'periode', 'sesi', 'kursi', 'kehadiran'],
  },
  // 2. Data pendaftar
  pendaftar: {
    judul: 'Data Pendaftar Wisuda', file: 'data-pendaftar',
    ambil: (q) => queryPendaftar(q, { exclude_draft: true }),
    kolom: ['no', 'nim', 'nama', 'email', 'hp', 'fakultas', 'program_studi', 'ipk', 'judul', 'periode', 'tgl_daftar', 'berkas', 'status'],
  },
  // 3. Peserta yang disetujui (Disetujui + Peserta Wisuda)
  disetujui: {
    judul: 'Data Mahasiswa Disetujui', file: 'peserta-disetujui',
    ambil: async (q) => (await queryPendaftar({ ...q, status: undefined }, { exclude_draft: true })).filter((r) => ['Disetujui', 'Peserta Wisuda'].includes(r.status)),
    kolom: ['no', 'nim', 'nama', 'fakultas', 'program_studi', 'ipk', 'periode', 'status', 'nomor_peserta', 'sesi'],
  },
  // 4. Daftar kehadiran
  kehadiran: {
    judul: 'Daftar Kehadiran Wisuda', file: 'daftar-kehadiran',
    ambil: (q) => queryPendaftar({ ...q, status_peserta: 'Peserta' }),
    kolom: ['no', 'nomor_peserta', 'nim', 'nama', 'fakultas', 'program_studi', 'sesi', 'kehadiran', 'waktu_hadir'],
  },
  // Laporan (sesuai halaman Laporan)
  laporan: {
    judul: 'Laporan Wisudawan', file: 'laporan-wisuda',
    ambil: (q) => queryPendaftar(q, { exclude_draft: true }),
    kolom: ['no', 'nim', 'nama', 'fakultas', 'program_studi', 'ipk', 'status', 'nomor_peserta', 'sesi', 'kehadiran'],
  },
};

async function tulis(res, wb, nama) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nama}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

// GET /api/export/rekap  -> rekap per fakultas & prodi (2 sheet)
router.get('/rekap', wrap(async (req, res) => {
  const { sql, params } = buildWhere(req.query, { exclude_draft: true });
  const agg = `COUNT(*) AS pendaftar,
    SUM(p.status = 'Menunggu Verifikasi') AS menunggu, SUM(p.status = 'Revisi') AS revisi,
    SUM(p.status IN ('Disetujui','Peserta Wisuda')) AS disetujui, SUM(ps.id IS NOT NULL) AS peserta,
    SUM(ps.status_kehadiran = 'Hadir') AS hadir, SUM(ps.status_kehadiran = 'Tidak Hadir') AS tidak_hadir`;
  const from = `FROM pendaftaran_wisuda p JOIN mahasiswa m ON m.id = p.mahasiswa_id
    JOIN periode_wisuda pr ON pr.id = p.periode_id LEFT JOIN peserta_wisuda ps ON ps.pendaftaran_id = p.id ${sql}`;
  const [fak] = await db.query(`SELECT m.fakultas, ${agg} ${from} GROUP BY m.fakultas ORDER BY m.fakultas`, params);
  const [prodi] = await db.query(`SELECT m.fakultas, m.program_studi, ${agg} ${from} GROUP BY m.fakultas, m.program_studi ORDER BY m.fakultas, m.program_studi`, params);
  const num = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : Number(v)])));
  const angka = [
    { header: 'Pendaftar', key: 'pendaftar', width: 12 }, { header: 'Menunggu Verifikasi', key: 'menunggu', width: 14 },
    { header: 'Revisi', key: 'revisi', width: 10 }, { header: 'Disetujui', key: 'disetujui', width: 12 },
    { header: 'Peserta Wisuda', key: 'peserta', width: 14 }, { header: 'Hadir', key: 'hadir', width: 10 },
    { header: 'Tidak Hadir', key: 'tidak_hadir', width: 12 },
  ];
  const ket = await deskripsiFilter(req.query);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIWIS';
  const s1 = buatSheet(wb, 'Rekap Fakultas', 'Rekap Wisudawan per Fakultas', ket,
    [KOLOM.no, { header: 'Fakultas', key: 'fakultas', width: 30 }, ...angka], num(fak));
  buatSheet(wb, 'Rekap Prodi', 'Rekap Wisudawan per Program Studi', ket,
    [KOLOM.no, { header: 'Fakultas', key: 'fakultas', width: 30 }, { header: 'Program Studi', key: 'program_studi', width: 30 }, ...angka], num(prodi));
  void s1;
  await logActivity(req.user.id, 'Admin mengekspor rekap fakultas/prodi ke Excel');
  await tulis(res, wb, 'rekap-fakultas-prodi');
}));

// GET /api/export/laporan-pdf  -> laporan PDF
router.get('/laporan-pdf', wrap(async (req, res) => {
  const rows = await queryPendaftar(req.query, { exclude_draft: true });
  const ket = await deskripsiFilter(req.query);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-wisuda.pdf"');
  doc.pipe(res);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#14304a').text((process.env.NAMA_KAMPUS || 'Kampus') + ' - Laporan Wisudawan');
  doc.font('Helvetica').fontSize(8).fillColor('#6b7a89').text(ket).moveDown(0.8);
  const cols = [['No', 25], ['NIM', 70], ['Nama', 140], ['Fakultas', 120], ['Prodi', 120], ['IPK', 30], ['Status', 85], ['No Peserta', 80], ['Sesi', 40], ['Hadir', 50]];
  const baris = (vals, y, bold) => {
    let x = 30;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(bold ? '#14304a' : '#222');
    vals.forEach((v, i) => { doc.text(String(v ?? ''), x, y, { width: cols[i][1] - 4, height: 10, ellipsis: true }); x += cols[i][1]; });
  };
  let y = doc.y;
  baris(cols.map((c) => c[0]), y, true); y += 14;
  rows.forEach((r, i) => {
    if (y > 540) { doc.addPage(); y = 30; baris(cols.map((c) => c[0]), y, true); y += 14; }
    baris([i + 1, r.nim, r.nama, r.fakultas, r.program_studi, r.ipk, r.status, r.nomor_peserta, r.sesi, r.status_kehadiran], y, false);
    y += 13;
  });
  if (!rows.length) doc.text('Tidak ada data.', 30, y);
  doc.end();
}));

// GET /api/export/:tipe  (peserta | pendaftar | disetujui | kehadiran | laporan) - mengikuti filter query
router.get('/:tipe', wrap(async (req, res) => {
  const def = DEFINISI[req.params.tipe];
  if (!def) return res.status(404).json({ message: 'Jenis export tidak dikenal.' });
  const rows = (await def.ambil(req.query)).map((r) => ({ ...r, berkas_ket: `${r.berkas_valid}/${r.berkas_wajib}` }));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIWIS';
  buatSheet(wb, def.judul.slice(0, 30), def.judul, await deskripsiFilter(req.query), def.kolom.map((k) => KOLOM[k]), rows);
  await logActivity(req.user.id, `Admin mengekspor ${def.judul} ke Excel (${rows.length} baris)`);
  await tulis(res, wb, def.file);
}));

module.exports = router;
