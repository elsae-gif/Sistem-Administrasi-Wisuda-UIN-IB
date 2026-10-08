const db = require('../config/db');

// Query dasar daftar pendaftar + filter (dipakai halaman Pendaftar, Laporan, dan Export Excel)
const BASE_SELECT = `
  SELECT p.id, p.status, p.tanggal_daftar, p.catatan, p.periode_id,
         m.nim, m.nama, m.fakultas, m.program_studi, m.ipk, m.email, m.no_hp, m.judul_skripsi,
         pr.nama_periode, pr.kode AS kode_periode,
         ps.id AS peserta_id, ps.nomor_peserta, ps.sesi, ps.nomor_kursi, ps.status_kehadiran, ps.waktu_hadir,
         (SELECT COUNT(*) FROM berkas_wisuda b WHERE b.pendaftaran_id = p.id AND b.status = 'Valid') AS berkas_valid,
         (SELECT COUNT(*) FROM berkas_wisuda b WHERE b.pendaftaran_id = p.id) AS berkas_upload,
         (SELECT COUNT(*) FROM jenis_berkas WHERE aktif = 1 AND wajib = 1) AS berkas_wajib
  FROM pendaftaran_wisuda p
  JOIN mahasiswa m ON m.id = p.mahasiswa_id
  JOIN periode_wisuda pr ON pr.id = p.periode_id
  LEFT JOIN peserta_wisuda ps ON ps.pendaftaran_id = p.id`;

function buildWhere(q = {}, opts = {}) {
  const where = [];
  const params = [];
  if (opts.exclude_draft) where.push("p.status <> 'Draft'");
  if (q.periode_id) { where.push('p.periode_id = ?'); params.push(Number(q.periode_id)); }
  if (q.fakultas) { where.push('m.fakultas = ?'); params.push(q.fakultas); }
  if (q.program_studi) { where.push('m.program_studi = ?'); params.push(q.program_studi); }
  if (q.status) { where.push('p.status = ?'); params.push(q.status); }
  if (q.sesi) { where.push('ps.sesi = ?'); params.push(q.sesi); }
  if (q.status_kehadiran) { where.push('ps.status_kehadiran = ?'); params.push(q.status_kehadiran); }
  if (q.status_peserta === 'Peserta') where.push('ps.id IS NOT NULL');
  if (q.status_peserta === 'Bukan Peserta') where.push('ps.id IS NULL');
  if (q.status_berkas) {
    if (q.status_berkas === 'Belum Upload') {
      where.push(`(SELECT COUNT(*) FROM berkas_wisuda b JOIN jenis_berkas j ON j.id = b.jenis_berkas_id WHERE b.pendaftaran_id = p.id AND j.wajib = 1)
                  < (SELECT COUNT(*) FROM jenis_berkas WHERE aktif = 1 AND wajib = 1)`);
    } else {
      where.push('EXISTS (SELECT 1 FROM berkas_wisuda b WHERE b.pendaftaran_id = p.id AND b.status = ?)');
      params.push(q.status_berkas);
    }
  }
  if (q.q) {
    where.push('(m.nim LIKE ? OR m.nama LIKE ?)');
    params.push(`%${q.q}%`, `%${q.q}%`);
  }
  return { sql: where.length ? ' WHERE ' + where.join(' AND ') : '', params };
}

async function queryPendaftar(q = {}, opts = {}) {
  const { sql, params } = buildWhere(q, opts);
  const [rows] = await db.query(`${BASE_SELECT}${sql} ORDER BY pr.tanggal_wisuda DESC, m.fakultas, m.program_studi, m.nim LIMIT 2000`, params);
  return rows;
}

module.exports = { queryPendaftar, buildWhere, BASE_SELECT };
