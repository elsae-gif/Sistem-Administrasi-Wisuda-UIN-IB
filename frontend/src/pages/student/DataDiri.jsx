import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { ErrorBox, Field, Loading, PageHead, Badge, useFetch } from '../../components/ui.jsx';

export default function DataDiri() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/student/profil');
  const [f, setF] = useState({ email: '', no_hp: '', judul_skripsi: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ email: data.mahasiswa.email || '', no_hp: data.mahasiswa.no_hp || '', judul_skripsi: data.mahasiswa.judul_skripsi || '' }); }, [data]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const m = data.mahasiswa;

  const simpan = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return toast.error('Format email tidak valid.');
    if (!/^[0-9+\-\s]{8,20}$/.test(f.no_hp)) return toast.error('Nomor HP tidak valid (8-20 digit).');
    if (!f.judul_skripsi.trim()) return toast.error('Judul skripsi/tugas akhir wajib diisi.');
    setBusy(true);
    try { const r = await api.put('/student/profil', f); toast.success(r.message); reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const ro = (label, value) => <Field label={label}><input value={value ?? '-'} disabled /></Field>;
  return (
    <>
      <PageHead title="Data Diri" subtitle="Data akademik dikelola kampus. Anda dapat melengkapi kontak dan judul skripsi." />
      {data.terkunci && <div className="alert warn">Data diri terkunci karena pendaftaran Anda sedang diverifikasi atau sudah diproses.</div>}
      <form className="card" onSubmit={simpan}>
        <div className="card-head"><h2>Data akademik</h2><Badge status={m.status_kelulusan} /></div>
        <div className="form-grid">
          {ro('NIM', m.nim)}{ro('Nama lengkap', m.nama)}{ro('Fakultas', m.fakultas)}{ro('Program studi', m.program_studi)}
          {ro('IPK', Number(m.ipk).toFixed(2))}{ro('Tahun masuk', m.tahun_masuk)}{ro('Tahun lulus', m.tahun_lulus)}
        </div>
        <div className="card-head mt"><h2>Data yang dapat Anda lengkapi</h2></div>
        <div className="form-grid">
          <Field label="Email"><input type="email" value={f.email} disabled={data.terkunci} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Nomor HP"><input value={f.no_hp} disabled={data.terkunci} onChange={(e) => setF({ ...f, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" /></Field>
        </div>
        <Field label="Judul skripsi / tugas akhir"><textarea value={f.judul_skripsi} disabled={data.terkunci} onChange={(e) => setF({ ...f, judul_skripsi: e.target.value })} /></Field>
        {!data.terkunci && <button className="btn" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan data diri'}</button>}
      </form>
    </>
  );
}
