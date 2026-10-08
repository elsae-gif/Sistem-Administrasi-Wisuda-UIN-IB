// Uji alur utama end-to-end terhadap server yang sedang berjalan.
// Persiapan: import siwis.sql, `npm run seed`, `npm start` (terminal lain), lalu `npm test`.
// Catatan: skrip memakai akun mahasiswa demo (2317020138) dan mengubah datanya. Jalankan `npm run seed` lagi untuk mengulang.
const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? '  OK  ' : ' GAGAL'}  ${m}`); if (!c) process.exitCode = 1; };

async function call(method, path, token, body, form) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).data;
const upload = (token, jenisId, nama = 'berkas.pdf', size = 200) => {
  const fd = new FormData();
  fd.append('jenis_berkas_id', jenisId);
  fd.append('file', new Blob([Buffer.alloc(size, 'a')], { type: 'application/pdf' }), nama);
  return call('POST', '/student/berkas', token, null, fd);
};

(async () => {
  console.log('== Autentikasi & otorisasi');
  const bad = await call('POST', '/auth/login', null, { email: 'admin@siwis.test', password: 'salah' });
  ok(bad.status === 401, 'Login dengan password salah ditolak');
  const adm = await login('admin@siwis.test', 'admin123');
  const mhs = await login('2317020138', 'mahasiswa123'); // login memakai NIM
  ok(adm.token && adm.user.role === 'admin', 'Login admin');
  ok(mhs.token && mhs.user.role === 'mahasiswa', 'Login mahasiswa (pakai NIM)');
  ok((await call('GET', '/admin/dashboard', mhs.token)).status === 403, 'Mahasiswa tidak bisa membuka API admin');
  ok((await call('GET', '/student/dashboard', adm.token)).status === 403, 'Admin tidak bisa membuka API mahasiswa');
  ok((await call('GET', '/admin/dashboard')).status === 401, 'Tanpa token ditolak');
  const A = adm.token, M = mhs.token;

  console.log('== Mahasiswa: pendaftaran');
  const periode = (await call('GET', '/student/periode', M)).data;
  ok(periode.length > 0, 'Ada periode yang dibuka');
  const daftar = await call('POST', '/student/pendaftaran', M, { periode_id: periode[0].id });
  ok(daftar.status === 201, 'Membuat draft pendaftaran');
  ok((await call('POST', '/student/pendaftaran/submit', M)).status === 400, 'Submit ditolak jika berkas belum lengkap');
  let p = (await call('GET', '/student/pendaftaran', M)).data.pendaftaran;
  const wajib = p.berkas.filter((b) => b.wajib);

  console.log('== Mahasiswa: upload berkas');
  const salahExt = new FormData();
  salahExt.append('jenis_berkas_id', wajib[0].jenis_id);
  salahExt.append('file', new Blob(['x'], { type: 'text/plain' }), 'virus.exe');
  ok((await call('POST', '/student/berkas', M, null, salahExt)).status === 400, 'File .exe ditolak');
  ok((await upload(M, wajib[0].jenis_id, 'besar.pdf', 3 * 1024 * 1024)).status === 400, 'File > 2 MB ditolak');
  for (const b of wajib) ok((await upload(M, b.jenis_id, `${b.jenis_nama}.pdf`)).status === 201, `Upload ${b.jenis_nama}`);
  const sub = await call('POST', '/student/pendaftaran/submit', M);
  ok(sub.status === 200, 'Kirim pendaftaran -> Menunggu Verifikasi');
  ok((await upload(M, wajib[0].jenis_id)).status === 403, 'Upload dikunci setelah dikirim');

  console.log('== Admin: verifikasi & revisi');
  p = (await call('GET', '/student/pendaftaran', M)).data.pendaftaran;
  const id = p.id;
  let det = (await call('GET', `/admin/pendaftar/${id}`, A)).data;
  ok(det.status === 'Menunggu Verifikasi', 'Admin melihat status Menunggu Verifikasi');
  ok((await call('PUT', `/admin/berkas/${det.berkas.find((b) => b.berkas_id).berkas_id}`, A, { status: 'Revisi', catatan: '' })).status === 400, 'Revisi tanpa alasan ditolak');
  ok((await call('POST', `/admin/pendaftar/${id}/keputusan`, A, { aksi: 'setujui' })).status === 400, 'Setujui ditolak sebelum semua berkas valid');
  const foto = det.berkas.find((b) => b.jenis_nama === 'Pas Foto');
  const rv = await call('PUT', `/admin/berkas/${foto.berkas_id}`, A, { status: 'Revisi', catatan: 'Pas foto tidak sesuai ukuran' });
  ok(rv.status === 200 && rv.data.status_pendaftaran === 'Revisi', 'Pas Foto direvisi -> pendaftaran Revisi');
  for (const b of det.berkas.filter((x) => x.berkas_id && x.berkas_id !== foto.berkas_id)) await call('PUT', `/admin/berkas/${b.berkas_id}`, A, { status: 'Valid' });

  console.log('== Mahasiswa: revisi');
  p = (await call('GET', '/student/pendaftaran', M)).data.pendaftaran;
  const f2 = p.berkas.find((b) => b.jenis_nama === 'Pas Foto');
  ok(f2.status === 'Revisi' && f2.catatan.includes('ukuran'), 'Mahasiswa melihat alasan revisi');
  ok((await upload(M, f2.jenis_id, 'foto-baru.pdf')).status === 201, 'Upload ulang berkas revisi');
  p = (await call('GET', '/student/pendaftaran', M)).data.pendaftaran;
  ok(p.status === 'Menunggu Verifikasi', 'Setelah revisi lengkap -> kembali Menunggu Verifikasi');

  console.log('== Admin: persetujuan & penetapan peserta');
  det = (await call('GET', `/admin/pendaftar/${id}`, A)).data;
  await call('PUT', `/admin/berkas/${det.berkas.find((b) => b.jenis_nama === 'Pas Foto').berkas_id}`, A, { status: 'Valid' });
  det = (await call('GET', `/admin/pendaftar/${id}`, A)).data;
  ok(det.status === 'Diverifikasi', 'Semua berkas valid -> Diverifikasi');
  ok((await call('POST', '/admin/peserta', A, { pendaftaran_id: id })).status === 400, 'Belum Disetujui tidak bisa jadi peserta');
  ok((await call('POST', `/admin/pendaftar/${id}/keputusan`, A, { aksi: 'setujui' })).status === 200, 'Pendaftaran disetujui');
  ok((await call('GET', '/student/kartu', M)).status === 403, 'Kartu belum tersedia sebelum jadi peserta');
  const tp = await call('POST', '/admin/peserta', A, { pendaftaran_id: id, sesi: 'Sesi 1' });
  ok(tp.status === 201, 'Ditetapkan sebagai peserta: ' + tp.data.message);

  console.log('== Kartu, jadwal, QR, kehadiran');
  const kartu = await call('GET', '/student/kartu', M);
  ok(kartu.status === 200 && kartu.data.peserta.nomor_peserta.startsWith('WIS-') && kartu.data.qr.startsWith('data:image/png'), 'Kartu peserta + QR');
  const pdf = await call('GET', '/student/kartu/pdf', M);
  ok(pdf.status === 200 && pdf.data.slice(0, 4).toString() === '%PDF', 'Kartu peserta PDF');
  ok((await call('GET', '/student/jadwal', M)).data.jadwal.length > 0, 'Mahasiswa melihat jadwal');
  const nomor = kartu.data.peserta.nomor_peserta;
  const scan = await call('POST', '/admin/kehadiran/scan', A, { kode: `SIWIS|${nomor}` });
  ok(scan.status === 200 && scan.data.nomor_peserta === nomor, 'Scan QR menemukan peserta');
  ok((await call('PUT', `/admin/kehadiran/${scan.data.id}`, A, { status: 'Hadir' })).status === 200, 'Kehadiran dicatat');
  const dash = (await call('GET', '/student/dashboard', M)).data;
  ok(dash.pendaftaran.status_kehadiran === 'Hadir' && dash.pendaftaran.waktu_hadir, 'Mahasiswa melihat status Hadir');

  console.log('== Laporan & export Excel');
  const lap = await call('GET', `/admin/laporan?periode_id=${periode[0].id}&status=Peserta%20Wisuda`, A);
  ok(lap.status === 200 && lap.data.every((r) => r.status === 'Peserta Wisuda'), 'Laporan mengikuti filter');
  for (const t of ['peserta', 'pendaftar', 'disetujui', 'kehadiran', 'rekap', 'laporan']) {
    const x = await call('GET', `/export/${t}?periode_id=${periode[0].id}`, A);
    ok(x.status === 200 && x.data.slice(0, 2).toString() === 'PK', `Export Excel: ${t} (file .xlsx valid)`);
  }
  const lp = await call('GET', '/export/laporan-pdf', A);
  ok(lp.status === 200 && lp.data.slice(0, 4).toString() === '%PDF', 'Export laporan PDF');

  console.log(`\nSelesai: ${pass} berhasil, ${fail} gagal.`);
})().catch((e) => { console.error('Uji berhenti:', e.message); process.exit(1); });
