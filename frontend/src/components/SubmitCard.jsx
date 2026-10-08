import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../Toast.jsx';
import { Confirm } from './ui.jsx';

// Kartu "Kirim pendaftaran" (dipakai di halaman Pendaftaran dan Berkas)
export default function SubmitCard({ p, onDone }) {
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!p || !['Draft', 'Revisi'].includes(p.status)) return null;

  const kurang = p.berkas.filter((b) => b.wajib && b.status === 'Belum Upload');
  const bermasalah = p.berkas.filter((b) => ['Revisi', 'Ditolak'].includes(b.status));
  const siap = kurang.length === 0 && bermasalah.length === 0;

  const kirim = async () => {
    setBusy(true);
    try { const r = await api.post('/student/pendaftaran/submit'); toast.success(r.message); setAsk(false); onDone && onDone(); }
    catch (e) { toast.error(e.message); setAsk(false); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-head"><h2>{p.status === 'Revisi' ? 'Kirim ulang untuk verifikasi' : 'Kirim pendaftaran'}</h2></div>
      {kurang.length > 0 && <div className="alert warn">Berkas wajib yang belum diupload: {kurang.map((k) => k.jenis_nama).join(', ')}.</div>}
      {bermasalah.length > 0 && <div className="alert bad">Perbaiki dan upload ulang: {bermasalah.map((k) => k.jenis_nama).join(', ')}.</div>}
      {siap && <div className="alert ok">Semua berkas wajib sudah diupload. Setelah dikirim, data dan berkas tidak dapat diubah kecuali Admin meminta revisi.</div>}
      <button className="btn gold" disabled={!siap} onClick={() => setAsk(true)}>Kirim pendaftaran</button>
      {ask && <Confirm title="Kirim pendaftaran?" message="Pendaftaran akan dikirim ke Admin untuk diverifikasi. Anda tidak dapat mengubah data diri dan berkas yang sudah dikirim." confirmText="Ya, kirim" tone="gold" busy={busy} onConfirm={kirim} onCancel={() => setAsk(false)} />}
    </div>
  );
}
