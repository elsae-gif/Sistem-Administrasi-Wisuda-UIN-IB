import { useEffect, useRef, useState } from 'react';
import { api, fmtWaktu, toQuery } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import { Badge, Empty, ErrorBox, Loading, PageHead, Stat, useFetch } from '../../components/ui.jsx';

export default function Kehadiran() {
  const toast = useToast();
  const [filter, setFilter] = useState({});
  const { data, error, loading, reload } = useFetch(`/admin/kehadiran${toQuery(filter)}`);
  const [kode, setKode] = useState('');
  const [hasil, setHasil] = useState(null);
  const [cam, setCam] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const adaDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const cari = async (isi) => {
    const k = (isi ?? kode).trim();
    if (!k) return toast.error('Masukkan nomor peserta atau scan QR Code.');
    try { setHasil(await api.post('/admin/kehadiran/scan', { kode: k })); }
    catch (e) { setHasil(null); toast.error(e.message); }
  };
  const set = async (id, status) => {
    try { const r = await api.put(`/admin/kehadiran/${id}`, { status }); toast.success(r.message); if (hasil && hasil.id === id) setHasil({ ...hasil, status_kehadiran: status }); reload(); }
    catch (e) { toast.error(e.message); }
  };

  // Scan QR lewat kamera (didukung browser Chrome/Edge berbasis Chromium)
  useEffect(() => {
    if (!cam) return undefined;
    let aktif = true; let timer;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        videoRef.current.srcObject = stream; await videoRef.current.play();
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        const loop = async () => {
          if (!aktif) return;
          try {
            const r = await det.detect(videoRef.current);
            if (r.length) { setCam(false); setKode(r[0].rawValue); cari(r[0].rawValue); return; }
          } catch { /* abaikan frame gagal */ }
          timer = setTimeout(loop, 400);
        };
        loop();
      } catch { toast.error('Kamera tidak dapat diakses. Izinkan akses kamera atau ketik nomor peserta.'); setCam(false); }
    })();
    return () => { aktif = false; clearTimeout(timer); if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, [cam]); // eslint-disable-line

  const rows = data || [];
  const hit = (s) => rows.filter((r) => r.status_kehadiran === s).length;

  return (
    <>
      <PageHead title="Kehadiran" subtitle="Catat kehadiran peserta pada hari wisuda dengan scan QR Code atau nomor peserta." />
      <div className="card">
        <div className="card-head"><h2>Scan kehadiran</h2></div>
        <div className="scan-box">
          <div className="btn-row">
            <input style={{ maxWidth: 320 }} placeholder="Scan / ketik nomor peserta (WIS-2026B-001)" value={kode} onChange={(e) => setKode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cari()} autoFocus aria-label="Nomor peserta" />
            <button className="btn" onClick={() => cari()}>Cari peserta</button>
            {adaDetector && <button className="btn ghost" onClick={() => setCam(!cam)}>{cam ? 'Tutup kamera' : 'Scan dengan kamera'}</button>}
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>Scanner QR (USB/Bluetooth) bekerja seperti keyboard: arahkan kursor ke kolom ini lalu scan kartu peserta.{!adaDetector && ' Scan kamera tidak didukung di browser ini.'}</p>
          {cam && <div className="mt-s"><video ref={videoRef} className="cam" muted playsInline /></div>}
        </div>
        {hasil && (
          <div className="scan-result">
            <div className="card-head" style={{ marginBottom: 8 }}><div><strong style={{ fontSize: '1.1rem' }}>{hasil.nama}</strong>
              <div className="muted small">{hasil.nim} · {hasil.fakultas} · {hasil.program_studi}</div></div><Badge status={hasil.status_kehadiran} /></div>
            <div className="small" style={{ marginBottom: 10 }}>No peserta <strong>{hasil.nomor_peserta}</strong> · {hasil.sesi || 'sesi belum ditentukan'} · {hasil.nama_periode}</div>
            <div className="btn-row">
              <button className="btn ok" disabled={hasil.status_kehadiran === 'Hadir'} onClick={() => set(hasil.id, 'Hadir')}>Konfirmasi hadir</button>
              <button className="btn ghost" onClick={() => setHasil(null)}>Tutup</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid stats mt">
        <Stat label="Total peserta" value={rows.length} tone="info" /><Stat label="Hadir" value={hit('Hadir')} tone="ok" />
        <Stat label="Belum hadir" value={hit('Belum Hadir')} tone="warn" /><Stat label="Tidak hadir" value={hit('Tidak Hadir')} tone="bad" />
      </div>

      <div className="mt"><FilterBar fields={['q', 'periode_id', 'fakultas', 'sesi', 'status_kehadiran']} value={filter} onChange={setFilter} /></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : rows.length === 0 ? (
        <div className="card"><Empty title="Belum ada peserta" /></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>No Peserta</th><th>NIM</th><th>Nama</th><th>Sesi</th><th>Status</th><th>Waktu hadir</th><th>Ubah</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td><strong>{r.nomor_peserta}</strong></td><td>{r.nim}</td><td>{r.nama}</td><td>{r.sesi || '-'}</td>
              <td><Badge status={r.status_kehadiran} /></td><td className="nowrap">{r.waktu_hadir ? fmtWaktu(r.waktu_hadir) : '-'}</td>
              <td className="nowrap"><div className="btn-row">
                <button className="btn sm ok" disabled={r.status_kehadiran === 'Hadir'} onClick={() => set(r.peserta_id, 'Hadir')}>Hadir</button>
                <button className="btn sm bad" disabled={r.status_kehadiran === 'Tidak Hadir'} onClick={() => set(r.peserta_id, 'Tidak Hadir')}>Tidak hadir</button>
                <button className="btn sm ghost" disabled={r.status_kehadiran === 'Belum Hadir'} onClick={() => set(r.peserta_id, 'Belum Hadir')}>Reset</button></div></td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
