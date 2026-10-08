import { useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { AkunCard } from '../Pengaturan.jsx';
import { Badge, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, useFetch } from '../../components/ui.jsx';

function JenisBerkas() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/admin/jenis-berkas');
  const [form, setForm] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const simpan = async () => {
    setBusy(true);
    try { const r = form.id ? await api.put(`/admin/jenis-berkas/${form.id}`, form) : await api.post('/admin/jenis-berkas', form); toast.success(r.message); setForm(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doHapus = async () => {
    setBusy(true);
    try { const r = await api.del(`/admin/jenis-berkas/${hapus.id}`); toast.success(r.message); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); setHapus(null); }
  };
  return (
    <>
      <div className="page-head"><p className="muted" style={{ margin: 0 }}>Tentukan berkas yang harus diupload mahasiswa.</p>
        <button className="btn gold" onClick={() => setForm({ nama: '', keterangan: '', wajib: true, aktif: true, urutan: data.length + 1 })}>Tambah jenis berkas</button></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Urutan</th><th>Nama berkas</th><th>Keterangan</th><th>Wajib</th><th>Aktif</th><th></th></tr></thead>
        <tbody>{data.map((j) => (
          <tr key={j.id}><td>{j.urutan}</td><td><strong>{j.nama}</strong>{j.is_pembayaran ? <> <Badge status="Lunas">Bukti bayar</Badge></> : null}</td><td>{j.keterangan || '-'}</td>
            <td>{j.wajib ? 'Ya' : 'Tidak'}</td><td>{j.aktif ? <Badge status="Dibuka">Aktif</Badge> : <Badge status="Ditutup">Nonaktif</Badge>}</td>
            <td className="nowrap"><button className="btn sm ghost" onClick={() => setForm({ ...j, wajib: !!j.wajib, aktif: !!j.aktif })}>Ubah</button>{' '}
              {!j.is_pembayaran && <button className="btn sm bad" onClick={() => setHapus(j)}>Hapus</button>}</td></tr>
        ))}</tbody>
      </table></div>
      {form && (
        <Modal title={form.id ? 'Ubah jenis berkas' : 'Tambah jenis berkas'} onClose={() => setForm(null)}
          footer={<><button className="btn ghost" onClick={() => setForm(null)}>Batal</button><button className="btn" disabled={busy} onClick={simpan}>Simpan</button></>}>
          <Field label="Nama berkas"><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
          <Field label="Keterangan"><input value={form.keterangan || ''} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Urutan"><input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} /></Field>
            <Field label="Opsi">
              <label><input type="checkbox" checked={form.wajib} onChange={(e) => setForm({ ...form, wajib: e.target.checked })} /> Wajib diupload</label>
              <label><input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} /> Aktif</label>
            </Field>
          </div>
        </Modal>
      )}
      {hapus && <Confirm title="Hapus jenis berkas?" tone="bad" confirmText="Hapus" busy={busy} message={`"${hapus.nama}" akan dihapus. Jika sudah dipakai mahasiswa, nonaktifkan saja.`} onConfirm={doHapus} onCancel={() => setHapus(null)} />}
    </>
  );
}

const MHS_KOSONG = { nim: '', nama: '', email: '', no_hp: '', fakultas: '', program_studi: '', ipk: '', judul_skripsi: '', status_kelulusan: 'Lulus', tahun_masuk: '', tahun_lulus: '', password: 'mahasiswa123' };

function DataMahasiswa() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useFetch(`/admin/mahasiswa${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const [form, setForm] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);
  const simpan = async () => {
    setBusy(true);
    try { const r = form.id ? await api.put(`/admin/mahasiswa/${form.id}`, form) : await api.post('/admin/mahasiswa', form); toast.success(r.message); setForm(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doHapus = async () => {
    setBusy(true);
    try { const r = await api.del(`/admin/mahasiswa/${hapus.id}`); toast.success(r.message); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); setHapus(null); }
  };
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <>
      <div className="page-head"><input style={{ maxWidth: 300 }} placeholder="Cari NIM / nama" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn gold" onClick={() => setForm({ ...MHS_KOSONG })}>Tambah mahasiswa</button></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : data.length === 0 ? <div className="card"><Empty title="Data mahasiswa tidak ditemukan" /></div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>NIM</th><th>Nama</th><th>Fakultas / Prodi</th><th>IPK</th><th>Kelulusan</th><th></th></tr></thead>
          <tbody>{data.map((m) => (
            <tr key={m.id}><td>{m.nim}</td><td><strong>{m.nama}</strong><div className="muted small">{m.email}</div></td><td>{m.fakultas}<div className="muted small">{m.program_studi}</div></td>
              <td>{Number(m.ipk).toFixed(2)}</td><td><Badge status={m.status_kelulusan} /></td>
              <td className="nowrap"><button className="btn sm ghost" onClick={() => setForm({ ...m, password: '' })}>Ubah</button>{' '}<button className="btn sm bad" onClick={() => setHapus(m)}>Hapus</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {form && (
        <Modal wide title={form.id ? 'Ubah data mahasiswa' : 'Tambah mahasiswa'} onClose={() => setForm(null)}
          footer={<><button className="btn ghost" onClick={() => setForm(null)}>Batal</button><button className="btn" disabled={busy} onClick={simpan}>Simpan</button></>}>
          <div className="form-grid">
            <Field label="NIM"><input {...f('nim')} /></Field><Field label="Nama lengkap"><input {...f('nama')} /></Field>
            <Field label="Email (juga untuk login)"><input type="email" {...f('email')} /></Field><Field label="Nomor HP"><input {...f('no_hp')} /></Field>
            <Field label="Fakultas"><input {...f('fakultas')} /></Field><Field label="Program studi"><input {...f('program_studi')} /></Field>
            <Field label="IPK"><input type="number" step="0.01" min="0" max="4" {...f('ipk')} /></Field>
            <Field label="Status kelulusan"><select {...f('status_kelulusan')}><option>Lulus</option><option>Belum Lulus</option></select></Field>
            <Field label="Tahun masuk"><input type="number" {...f('tahun_masuk')} /></Field><Field label="Tahun lulus"><input type="number" {...f('tahun_lulus')} /></Field>
            <Field label={form.id ? 'Password baru (kosongkan jika tidak diubah)' : 'Password awal'}><input type="text" {...f('password')} /></Field>
          </div>
          <Field label="Judul skripsi / tugas akhir"><textarea {...f('judul_skripsi')} /></Field>
        </Modal>
      )}
      {hapus && <Confirm title="Hapus data mahasiswa?" tone="bad" confirmText="Hapus" busy={busy} message={`${hapus.nama} (${hapus.nim}) beserta akunnya akan dihapus. Mahasiswa yang sudah mendaftar wisuda tidak dapat dihapus.`} onConfirm={doHapus} onCancel={() => setHapus(null)} />}
    </>
  );
}

export default function Pengaturan() {
  const [tab, setTab] = useState('berkas');
  return (
    <>
      <PageHead title="Pengaturan" subtitle="Kelola jenis berkas, data akademik mahasiswa, dan akun Admin." />
      <div className="btn-row mb">
        {[['berkas', 'Jenis berkas'], ['mahasiswa', 'Data mahasiswa'], ['akun', 'Akun saya']].map(([k, l]) => (
          <button key={k} className={`btn ${tab === k ? '' : 'ghost'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'berkas' && <JenisBerkas />}
      {tab === 'mahasiswa' && <DataMahasiswa />}
      {tab === 'akun' && <AkunCard />}
    </>
  );
}
