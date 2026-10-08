// Mengisi data dummy. Jalankan:  npm run seed   (aman diulang; data lama dihapus)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const { UPLOAD_DIR } = require('./middleware/upload');

const PDF = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 150]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 66>>stream
BT /F1 14 Tf 20 80 Td (Berkas contoh SIWIS - data dummy) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`;

const MAHASISWA = [
  ['2317020138', 'Rizky Pratama', 'Teknik', 'Teknik Informatika', 3.58, 'Rancang Bangun Sistem Informasi Administrasi Wisudawan Berbasis Web'],
  ['2317020101', 'Aulia Rahmawati', 'Teknik', 'Teknik Informatika', 3.72, 'Implementasi Algoritma K-Means untuk Segmentasi Pelanggan UMKM'],
  ['2317020102', 'Budi Santoso', 'Teknik', 'Sistem Informasi', 3.41, 'Analisis Kepuasan Pengguna Aplikasi Perpustakaan Digital'],
  ['2317020103', 'Citra Dewi', 'Teknik', 'Teknik Sipil', 3.25, 'Evaluasi Kapasitas Drainase Perkotaan Kawasan Padang Timur'],
  ['2317020104', 'Dimas Aditya', 'Ekonomi dan Bisnis', 'Manajemen', 3.10, 'Pengaruh Kualitas Layanan terhadap Loyalitas Pelanggan Toko Daring'],
  ['2317020105', 'Eka Putri Lestari', 'Ekonomi dan Bisnis', 'Akuntansi', 3.88, 'Analisis Penerapan SAK EMKM pada Usaha Mikro Kuliner'],
  ['2317020106', 'Fajar Nugraha', 'Teknik', 'Teknik Informatika', 3.33, 'Sistem Deteksi Plagiarisme Dokumen Menggunakan TF-IDF'],
  ['2317020107', 'Gita Permata', 'Keguruan dan Ilmu Pendidikan', 'PGSD', 3.64, 'Pengembangan Media Ajar Interaktif Tematik Kelas IV'],
  ['2317020108', 'Hendra Wijaya', 'Hukum', 'Ilmu Hukum', 3.05, 'Perlindungan Hukum Konsumen pada Transaksi E-Commerce'],
  ['2317020109', 'Indah Sari', 'Ekonomi dan Bisnis', 'Manajemen', 3.47, 'Strategi Pemasaran Digital pada Usaha Kecil dan Menengah'],
  ['2317020110', 'Joko Susilo', 'Teknik', 'Sistem Informasi', 3.29, 'Perancangan Dashboard Monitoring Penjualan dengan Metode Waterfall'],
  ['2317020111', 'Kartika Ayu', 'Keguruan dan Ilmu Pendidikan', 'Pendidikan Bahasa Inggris', 3.81, 'Efektivitas Project-Based Learning pada Kemampuan Berbicara'],
  ['2317020112', 'Lukman Hakim', 'Hukum', 'Ilmu Hukum', 2.95, 'Penegakan Hukum terhadap Pelanggaran Lalu Lintas Pelajar'],
  ['2317020113', 'Maya Anggraini', 'Ekonomi dan Bisnis', 'Akuntansi', 3.52, 'Pengaruh Pajak Daerah terhadap Pendapatan Asli Daerah'],
  ['2317020114', 'Naufal Ramadhan', 'Teknik', 'Teknik Informatika', 3.18, 'Aplikasi Presensi Mahasiswa Berbasis QR Code'],
  ['2317020115', 'Olivia Hasanah', 'Keguruan dan Ilmu Pendidikan', 'PGSD', 3.39, 'Penerapan Model Problem Based Learning pada Pembelajaran IPA'],
  ['2317020116', 'Putra Mahendra', 'Teknik', 'Teknik Sipil', 3.00, 'Analisis Struktur Gedung Bertingkat Menggunakan SNI Gempa'],
  ['2317020117', 'Qonita Zahra', 'Ekonomi dan Bisnis', 'Manajemen', 3.60, 'Analisis Brand Awareness pada Produk Lokal'],
  ['2317020118', 'Rafi Maulana', 'Teknik', 'Sistem Informasi', 1.95, 'Sistem Informasi Inventori Gudang'],
  ['2317020119', 'Sinta Maharani', 'Hukum', 'Ilmu Hukum', 3.44, 'Kedudukan Hukum Perjanjian Elektronik'],
  ['2317020120', 'Teguh Prasetyo', 'Teknik', 'Teknik Informatika', 3.21, 'Klasifikasi Sentimen Ulasan Aplikasi dengan Naive Bayes'],
  ['2317020121', 'Umi Kalsum', 'Ekonomi dan Bisnis', 'Akuntansi', 3.67, 'Audit Internal Pengelolaan Dana Desa'],
  ['2317020122', 'Vino Saputra', 'Keguruan dan Ilmu Pendidikan', 'Pendidikan Bahasa Inggris', 2.80, null],
];

// [periode, status pendaftaran, sesi]  untuk mahasiswa indeks ke-1 dst. Indeks 0 (akun demo) sengaja belum mendaftar.
const SKENARIO = {
  1: ['2026A', 'Peserta Wisuda', 'Sesi 1'], 2: ['2026A', 'Peserta Wisuda', 'Sesi 1'], 3: ['2026A', 'Peserta Wisuda', 'Sesi 2'],
  4: ['2026A', 'Peserta Wisuda', 'Sesi 2'], 5: ['2026A', 'Peserta Wisuda', 'Sesi 1'],
  6: ['2026B', 'Peserta Wisuda', 'Sesi 1'], 7: ['2026B', 'Peserta Wisuda', 'Sesi 2'],
  8: ['2026B', 'Disetujui'], 9: ['2026B', 'Disetujui'],
  10: ['2026B', 'Menunggu Verifikasi'], 11: ['2026B', 'Menunggu Verifikasi'], 12: ['2026B', 'Menunggu Verifikasi'], 13: ['2026B', 'Menunggu Verifikasi'],
  14: ['2026B', 'Revisi'], 15: ['2026B', 'Revisi'],
  16: ['2026B', 'Diverifikasi'], 17: ['2026B', 'Draft'], 18: ['2026B', 'Ditolak'],
};

(async () => {
  console.log('Menghapus data lama...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['log_aktivitas', 'notifikasi', 'jadwal_wisuda', 'peserta_wisuda', 'pembayaran', 'berkas_wisuda', 'pendaftaran_wisuda', 'periode_wisuda', 'mahasiswa', 'users']) {
    await db.query(`TRUNCATE TABLE ${t}`);
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  for (const f of fs.readdirSync(UPLOAD_DIR)) if (f !== '.gitkeep') fs.unlinkSync(path.join(UPLOAD_DIR, f));

  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM jenis_berkas');
  if (!n) throw new Error('Tabel jenis_berkas kosong. Import database/siwis.sql terlebih dahulu.');
  const [jenis] = await db.query('SELECT * FROM jenis_berkas WHERE aktif = 1 AND wajib = 1 ORDER BY urutan');

  // Admin
  const hAdmin = await bcrypt.hash('admin123', 10);
  const [ua] = await db.query("INSERT INTO users (email, password, role, nama) VALUES ('admin@siwis.test', ?, 'admin', 'Administrator SIWIS')", [hAdmin]);
  const adminId = ua.insertId;

  // Periode
  const [p1] = await db.query(
    `INSERT INTO periode_wisuda (kode, nama_periode, tanggal_wisuda, lokasi, biaya, min_ipk, status)
     VALUES ('2026A', 'Wisuda Periode I Tahun 2026', '2026-05-23', 'Auditorium Utama Kampus', 1500000, 2.00, 'Ditutup')`);
  const [p2] = await db.query(
    `INSERT INTO periode_wisuda (kode, nama_periode, tanggal_wisuda, lokasi, biaya, min_ipk, status)
     VALUES ('2026B', 'Wisuda Periode II Tahun 2026', '2026-12-12', 'Auditorium Utama Kampus', 1500000, 2.00, 'Dibuka')`);
  const periode = { '2026A': p1.insertId, '2026B': p2.insertId };
  const jadwal = [
    [p1.insertId, 'Sesi 1', '2026-05-23', '08.00 - 11.00 WIB', 'Auditorium Utama Kampus', 'Fakultas Teknik dan Hukum'],
    [p1.insertId, 'Sesi 2', '2026-05-23', '13.00 - 16.00 WIB', 'Auditorium Utama Kampus', 'Fakultas Ekonomi dan Bisnis serta FKIP'],
    [p2.insertId, 'Sesi 1', '2026-12-12', '08.00 - 11.00 WIB', 'Auditorium Utama Kampus', 'Peserta hadir 60 menit sebelum acara dimulai. Pakaian toga lengkap.'],
    [p2.insertId, 'Sesi 2', '2026-12-12', '13.00 - 16.00 WIB', 'Auditorium Utama Kampus', 'Peserta hadir 60 menit sebelum acara dimulai. Pakaian toga lengkap.'],
  ];
  for (const j of jadwal) await db.query('INSERT INTO jadwal_wisuda (periode_id, sesi, tanggal, waktu, lokasi, keterangan) VALUES (?,?,?,?,?,?)', j);

  const counter = { '2026A': 0, '2026B': 0 };
  const hMhs = await bcrypt.hash('mahasiswa123', 10);
  let fileSeq = 0;
  const buatFile = () => { const nama = `seed-${++fileSeq}.pdf`; fs.writeFileSync(path.join(UPLOAD_DIR, nama), PDF); return nama; };

  for (let i = 0; i < MAHASISWA.length; i++) {
    const [nim, nama, fakultas, prodi, ipk, judul] = MAHASISWA[i];
    const email = i === 0 ? 'mahasiswa@siwis.test' : `${nim}@siwis.test`;
    const [u] = await db.query("INSERT INTO users (email, password, role, nama) VALUES (?,?, 'mahasiswa', ?)", [email, hMhs, nama]);
    const lulus = ipk >= 2.0 && judul && nim !== '2317020122' ? 'Lulus' : 'Belum Lulus';
    const [m] = await db.query(
      `INSERT INTO mahasiswa (user_id, nim, nama, email, no_hp, fakultas, program_studi, ipk, judul_skripsi, status_kelulusan, tahun_masuk, tahun_lulus)
       VALUES (?,?,?,?,?,?,?,?,?,?,2021,?)`,
      [u.insertId, nim, nama, email, `0812${String(30000000 + i * 1111).slice(0, 8)}`, fakultas, prodi, ipk, judul, lulus, lulus === 'Lulus' ? 2026 : null]);

    const sk = SKENARIO[i];
    if (!sk) continue;
    const [kodePeriode, status, sesi] = sk;
    const [pd] = await db.query(
      `INSERT INTO pendaftaran_wisuda (mahasiswa_id, periode_id, tanggal_daftar, status, catatan)
       VALUES (?,?, ${status === 'Draft' ? 'NULL' : 'DATE_SUB(NOW(), INTERVAL ? DAY)'}, ?, ?)`,
      status === 'Draft' ? [m.insertId, periode[kodePeriode], status, null] :
        [m.insertId, periode[kodePeriode], 20 - i, status,
          status === 'Ditolak' ? 'IPK dan data kelulusan tidak memenuhi persyaratan periode ini.' :
          status === 'Revisi' ? 'Mohon perbaiki berkas yang ditandai.' : null]);
    await db.query('INSERT INTO pembayaran (pendaftaran_id, nominal, status, tanggal_pembayaran) VALUES (?,1500000,?, NOW())',
      [pd.insertId, ['Peserta Wisuda', 'Disetujui', 'Diverifikasi'].includes(status) ? 'Lunas' : status === 'Draft' ? 'Belum Bayar' : 'Menunggu Verifikasi']);

    if (status !== 'Draft') {
      for (let k = 0; k < jenis.length; k++) {
        const j = jenis[k];
        let bs = 'Valid', cat = null;
        if (status === 'Menunggu Verifikasi') bs = k < i % 4 ? 'Valid' : 'Menunggu Verifikasi';
        if (status === 'Revisi') {
          if (k === 4) { bs = 'Revisi'; cat = 'Pas foto tidak sesuai ketentuan ukuran dan latar. Silakan upload ulang.'; }
          else if (k === 1 && i === 15) { bs = 'Revisi'; cat = 'Scan surat buram dan tidak terbaca. Mohon upload ulang.'; }
        }
        if (status === 'Ditolak') bs = k === 0 ? 'Ditolak' : 'Menunggu Verifikasi';
        if (status === 'Ditolak' && k === 0) cat = 'Bukti pembayaran tidak sesuai nominal.';
        await db.query(
          `INSERT INTO berkas_wisuda (pendaftaran_id, jenis_berkas_id, nama_file, file_path, status, catatan, tanggal_upload, tanggal_verifikasi)
           VALUES (?,?,?,?,?,?, NOW(), ${bs === 'Menunggu Verifikasi' ? 'NULL' : 'NOW()'})`,
          [pd.insertId, j.id, `${j.nama.toLowerCase().replace(/\s+/g, '-')}-${nim}.pdf`, buatFile(), bs, cat]);
      }
    }

    if (status === 'Peserta Wisuda') {
      const nomor = `WIS-${kodePeriode}-${String(++counter[kodePeriode]).padStart(3, '0')}`;
      const hadir = kodePeriode === '2026A' ? (i === 4 ? 'Tidak Hadir' : 'Hadir') : 'Belum Hadir';
      await db.query(
        `INSERT INTO peserta_wisuda (pendaftaran_id, nomor_peserta, sesi, nomor_kursi, qr_code, status_kehadiran, waktu_hadir)
         VALUES (?,?,?,?,?,?, ${hadir === 'Hadir' ? "'2026-05-23 07:30:00'" : 'NULL'})`,
        [pd.insertId, nomor, sesi, `A${counter[kodePeriode]}`, `SIWIS|${nomor}`, hadir]);
    }
  }

  await db.query("INSERT INTO log_aktivitas (user_id, aktivitas) VALUES (?, 'Data dummy SIWIS dibuat')", [adminId]);
  console.log('Selesai.\n  Admin     : admin@siwis.test / admin123\n  Mahasiswa : mahasiswa@siwis.test (atau NIM 2317020138) / mahasiswa123');
  await db.end();
})().catch((e) => { console.error('Seed gagal:', e.message); process.exit(1); });
