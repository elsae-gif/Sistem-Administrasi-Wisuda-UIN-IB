import { Link } from 'react-router-dom';
import { fmtTanggal } from '../../api.js';
import { Badge, ErrorBox, Loading, PageHead, Stat, useFetch } from '../../components/ui.jsx';

export function langkah(p) {
  // Mengembalikan status tiap tahap timeline
  const labels = ['Pendaftaran', 'Upload Berkas', 'Verifikasi', 'Disetujui', 'Peserta Wisuda', 'Kehadiran'];
  let done = 0; let bad = -1;
  if (p) {
    const s = p.status;
    if (s === 'Draft') done = 1;
    else if (['Diajukan', 'Menunggu Verifikasi', 'Diverifikasi'].includes(s)) done = 2;
    else if (s === 'Revisi') { done = 2; bad = 2; }
    else if (s === 'Ditolak') { done = 2; bad = 2; }
    else if (s === 'Disetujui') done = 4;
    else if (s === 'Peserta Wisuda') done = p.status_kehadiran === 'Hadir' ? 6 : 5;
  }
  return labels.map((label, i) => ({ label, state: i === bad ? 'bad' : i < done ? 'done' : i === done ? 'current' : '' }));
}

export function Timeline({ p }) {
  const steps = langkah(p);
  return (
    <div className="timeline">
      {steps.map((s, i) => (
        <div key={s.label} className={`tl-step ${s.state}`}>
          <div className="tl-dot">{s.state === 'done' ? '✓' : s.state === 'bad' ? '!' : s.state === 'current' ? '…' : i + 1}</div>
          <div className="tl-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useFetch('/student/dashboard');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { mahasiswa: m, pendaftaran: p, jadwal } = data;
  const wajib = p ? p.berkas_wajib_total : 0;
  const pct = wajib ? Math.round((p.berkas_wajib_terupload / wajib) * 100) : 0;

  return (
    <>
      <PageHead title={`Halo, ${m.nama.split(' ')[0]}`} subtitle="Pantau proses administrasi wisuda Anda di sini." />
      <div className="card">
        <div className="card-head">
          <div>
            <h2>{m.nama}</h2>
            <div className="muted small">NIM {m.nim} · {m.program_studi} · {m.fakultas}</div>
          </div>
          {p ? <Badge status={p.status} /> : <span className="badge">Belum mendaftar</span>}
        </div>
        <Timeline p={p} />
        {p && p.status === 'Revisi' && <div className="alert bad mt-s">Ada berkas atau data yang perlu diperbaiki. <Link to="/mahasiswa/status">Lihat detail revisi</Link></div>}
        {p && p.status === 'Ditolak' && <div className="alert bad mt-s">Pendaftaran ditolak: {p.catatan}</div>}
        {!p && <div className="alert info mt-s">Anda belum mendaftar wisuda. <Link to="/mahasiswa/pendaftaran">Mulai pendaftaran</Link></div>}
      </div>

      <div className="grid stats mt">
        <Stat label="Kelengkapan berkas" value={p ? `${p.berkas_wajib_terupload}/${wajib}` : '-'} tone="info" />
        <Stat label="Status pendaftaran" value={p ? p.status : 'Belum mendaftar'} tone="gold" small />
        <Stat label="Nomor peserta" value={p && p.nomor_peserta ? p.nomor_peserta : 'Belum ada'} tone="ok" small />
        <Stat label="Jadwal wisuda" value={p ? fmtTanggal(p.tanggal_wisuda) : '-'} tone="warn" small />
      </div>

      <div className="grid two mt">
        <div className="card">
          <div className="card-head"><h2>Berkas persyaratan</h2><Link to="/mahasiswa/berkas" className="btn sm ghost">Kelola berkas</Link></div>
          {!p ? <p className="muted">Belum ada pendaftaran.</p> : (<>
            <div className="progress"><div style={{ width: `${pct}%` }} /></div>
            <p className="muted small">{pct}% berkas wajib sudah diupload · {p.berkas_wajib_valid} dinyatakan valid</p>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {p.berkas.filter((b) => b.wajib).map((b) => (
                <li key={b.jenis_id} style={{ marginBottom: 4 }}>{b.jenis_nama} <Badge status={b.status} /></li>
              ))}
            </ul>
          </>)}
        </div>
        <div className="card">
          <div className="card-head"><h2>Periode dan jadwal</h2><Link to="/mahasiswa/jadwal" className="btn sm ghost">Detail</Link></div>
          {!p ? <p className="muted">Pilih periode wisuda saat mendaftar.</p> : (
            <dl className="kv">
              <dt>Periode</dt><dd>{p.nama_periode}</dd>
              <dt>Tanggal</dt><dd>{fmtTanggal(p.tanggal_wisuda)}</dd>
              <dt>Sesi</dt><dd>{p.sesi || 'Belum ditentukan'}</dd>
              <dt>Waktu</dt><dd>{jadwal[0] ? jadwal[0].waktu : 'Belum ada jadwal'}</dd>
              <dt>Lokasi</dt><dd>{jadwal[0] ? jadwal[0].lokasi : p.lokasi_periode}</dd>
              <dt>Kehadiran</dt><dd>{p.nomor_peserta ? <Badge status={p.status_kehadiran} /> : '-'}</dd>
            </dl>
          )}
        </div>
      </div>
    </>
  );
}
