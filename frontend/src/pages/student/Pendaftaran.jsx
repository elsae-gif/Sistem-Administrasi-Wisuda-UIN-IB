import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtTanggal, rupiah } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { Badge, Confirm, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';
import SubmitCard from '../../components/SubmitCard.jsx';

export default function Pendaftaran() {
  const toast = useToast();
  const daftar = useFetch('/student/pendaftaran');
  const periode = useFetch('/student/periode');
  const [pilih, setPilih] = useState('');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alasan, setAlasan] = useState([]);

  if (daftar.loading || periode.loading) return <Loading />;
  if (daftar.error) return <ErrorBox message={daftar.error} onRetry={daftar.reload} />;
  const { pendaftaran: p, mahasiswa: m } = daftar.data;
  const aktif = p && p.status !== 'Ditolak';
  const periodeTerpilih = (periode.data || []).find((x) => String(x.id) === String(pilih));

  const buat = async () => {
    setBusy(true); setAlasan([]);
    try { const r = await api.post('/student/pendaftaran', { periode_id: pilih }); toast.success(r.message); setAsk(false); daftar.reload(); }
    catch (e) { setAsk(false); setAlasan((e.detail && e.detail.alasan) || []); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Pendaftaran Wisuda" subtitle="Pilih periode wisuda, periksa kelayakan, lalu lengkapi berkas." />
      {aktif ? (
        <>
          <div className="card">
            <div className="card-head"><h2>Pendaftaran Anda</h2><Badge status={p.status} /></div>
            <dl className="kv">
              <dt>Periode</dt><dd>{p.nama_periode}</dd>
              <dt>Tanggal wisuda</dt><dd>{fmtTanggal(p.tanggal_wisuda)}</dd>
              <dt>Lokasi</dt><dd>{p.lokasi_periode}</dd>
              <dt>Biaya</dt><dd>{rupiah(p.biaya)}</dd>
              <dt>Tanggal daftar</dt><dd>{p.tanggal_daftar ? fmtTanggal(p.tanggal_daftar) : 'Belum dikirim'}</dd>
            </dl>
            <div className="btn-row mt">
              <Link className="btn" to="/mahasiswa/berkas">Upload berkas</Link>
              <Link className="btn ghost" to="/mahasiswa/status">Lihat status</Link>
            </div>
          </div>
          <div className="mt"><SubmitCard p={p} onDone={daftar.reload} /></div>
        </>
      ) : (
        <>
          {p && p.status === 'Ditolak' && <div className="alert bad">Pendaftaran sebelumnya ditolak: {p.catatan}. Anda dapat mendaftar pada periode lain jika memenuhi syarat.</div>}
          <div className="card">
            <div className="card-head"><h2>Pemeriksaan kelayakan</h2></div>
            <dl className="kv">
              <dt>Status kelulusan</dt><dd><Badge status={m.status_kelulusan} /></dd>
              <dt>IPK</dt><dd>{Number(m.ipk).toFixed(2)}</dd>
              <dt>Judul skripsi</dt><dd>{m.judul_skripsi || <span className="muted">Belum diisi. <Link to="/mahasiswa/data-diri">Lengkapi</Link></span>}</dd>
            </dl>
          </div>
          <div className="card">
            <div className="card-head"><h2>Pilih periode wisuda</h2></div>
            {(periode.data || []).length === 0 ? (
              <div className="alert info">Belum ada periode wisuda yang dibuka. Silakan cek kembali nanti.</div>
            ) : (
              <>
                <div className="grid three">
                  {periode.data.map((x) => (
                    <label key={x.id} className="card" style={{ cursor: 'pointer', borderColor: String(pilih) === String(x.id) ? 'var(--gold)' : undefined, borderWidth: 2 }}>
                      <input type="radio" name="periode" checked={String(pilih) === String(x.id)} onChange={() => setPilih(String(x.id))} style={{ width: 'auto', marginRight: 8 }} />
                      <strong>{x.nama_periode}</strong>
                      <div className="muted small mt-s">{fmtTanggal(x.tanggal_wisuda)} · {x.lokasi}<br />Biaya {rupiah(x.biaya)} · IPK minimal {Number(x.min_ipk).toFixed(2)}</div>
                    </label>
                  ))}
                </div>
                {alasan.length > 0 && <div className="alert bad mt"><strong>Belum memenuhi syarat:</strong><ul>{alasan.map((a) => <li key={a}>{a}</li>)}</ul></div>}
                <button className="btn gold mt" disabled={!pilih} onClick={() => setAsk(true)}>Ajukan pendaftaran</button>
              </>
            )}
          </div>
        </>
      )}
      {ask && periodeTerpilih && (
        <Confirm title="Ajukan pendaftaran wisuda?" confirmText="Ya, ajukan" tone="gold" busy={busy} onConfirm={buat} onCancel={() => setAsk(false)}
          message={`Anda akan mendaftar pada ${periodeTerpilih.nama_periode} (${fmtTanggal(periodeTerpilih.tanggal_wisuda)}). Sistem akan memeriksa kelayakan Anda, lalu Anda dapat mengupload berkas.`} />
      )}
    </>
  );
}
