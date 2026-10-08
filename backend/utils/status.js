const db = require('../config/db');

// Mengambil pendaftaran lengkap + daftar berkas (semua jenis aktif, termasuk yang belum diupload)
async function getPendaftaranDetail(id) {
  const [rows] = await db.query(
    `SELECT p.*, m.nim, m.nama, m.email, m.no_hp, m.fakultas, m.program_studi, m.ipk, m.judul_skripsi,
            m.status_kelulusan, m.tahun_masuk, m.tahun_lulus, m.user_id,
            pr.nama_periode, pr.kode AS kode_periode, pr.tanggal_wisuda, pr.lokasi AS lokasi_periode, pr.biaya, pr.min_ipk,
            ps.id AS peserta_id, ps.nomor_peserta, ps.sesi, ps.nomor_kursi, ps.status_kehadiran, ps.waktu_hadir,
            pb.status AS status_pembayaran, pb.nominal
     FROM pendaftaran_wisuda p
     JOIN mahasiswa m ON m.id = p.mahasiswa_id
     JOIN periode_wisuda pr ON pr.id = p.periode_id
     LEFT JOIN peserta_wisuda ps ON ps.pendaftaran_id = p.id
     LEFT JOIN pembayaran pb ON pb.pendaftaran_id = p.id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const pendaftaran = rows[0];
  const [berkas] = await db.query(
    `SELECT jb.id AS jenis_id, jb.nama AS jenis_nama, jb.keterangan, jb.wajib, jb.is_pembayaran,
            b.id AS berkas_id, b.nama_file, b.status, b.catatan, b.tanggal_upload, b.tanggal_verifikasi
     FROM jenis_berkas jb
     LEFT JOIN berkas_wisuda b ON b.jenis_berkas_id = jb.id AND b.pendaftaran_id = ?
     WHERE jb.aktif = 1 OR b.id IS NOT NULL
     ORDER BY jb.urutan, jb.id`,
    [id]
  );
  pendaftaran.berkas = berkas.map((b) => ({ ...b, status: b.status || 'Belum Upload' }));
  const wajib = pendaftaran.berkas.filter((b) => b.wajib);
  pendaftaran.berkas_wajib_total = wajib.length;
  pendaftaran.berkas_wajib_valid = wajib.filter((b) => b.status === 'Valid').length;
  pendaftaran.berkas_wajib_terupload = wajib.filter((b) => b.status !== 'Belum Upload').length;
  return pendaftaran;
}

module.exports = { getPendaftaranDetail };
