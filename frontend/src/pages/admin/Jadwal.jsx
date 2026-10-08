import { useState } from 'react';
import { api, fmtTanggal } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, useFetch } from '../../components/ui.jsx';

export default function Jadwal() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/admin/jadwal');
  const opsi = useFetch('/admin/opsi');
  const [form, setForm] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const simpan = async () => {
    setBusy(true);
    try { const r = form.id ? await api.put(`/admin/jadwal/${form.id}`, form) : await api.post('/admin/jadwal', form); toast.success(r.message); setForm(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doHapus = async () => {
    setBusy(true);
    try { const r = await api.del(`/admin/jadwal/${hapus.id}`); toast.success(r.message); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); setHapus(null); }
  };
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const periode = opsi.data ? opsi.data.periode : [];

  return (
    <>
      <PageHead title="Jadwal Wisuda" subtitle="Atur sesi, tanggal, waktu, dan lokasi untuk setiap periode.">
        <button className="btn gold" onClick={() => setForm({ periode_id: periode[0] ? periode[0].id : '', sesi: 'Sesi 1', tanggal: '', waktu: '08.00 - 11.00 WIB', lokasi: '', keterangan: '' })}>Tambah jadwal</button>
      </PageHead>
      {data.length === 0 ? <div className="card"><Empty title="Belum ada jadwal wisuda" /></div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Periode</th><th>Sesi</th><th>Tanggal</th><th>Waktu</th><th>Lokasi</th><th>Peserta</th><th>Keterangan</th><th></th></tr></thead>
          <tbody>{data.map((j) => (
            <tr key={j.id}><td>{j.nama_periode}</td><td><strong>{j.sesi}</strong></td><td className="nowrap">{fmtTanggal(j.tanggal)}</td><td className="nowrap">{j.waktu}</td>
              <td>{j.lokasi}</td><td>{j.jumlah_peserta}</td><td style={{ maxWidth: 240 }}>{j.keterangan || '-'}</td>
              <td className="nowrap"><button className="btn sm ghost" onClick={() => setForm({ ...j, tanggal: String(j.tanggal).slice(0, 10) })}>Ubah</button>{' '}
                <button className="btn sm bad" onClick={() => setHapus(j)}>Hapus</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {form && (
        <Modal title={form.id ? 'Ubah jadwal' : 'Tambah jadwal'} onClose={() => setForm(null)}
          footer={<><button className="btn ghost" onClick={() => setForm(null)}>Batal</button><button className="btn" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan...' : 'Simpan'}</button></>}>
          <Field label="Periode"><select {...f('periode_id')}>{periode.map((p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>)}</select></Field>
          <div className="form-grid">
            <Field label="Sesi"><input {...f('sesi')} /></Field>
            <Field label="Tanggal"><input type="date" {...f('tanggal')} /></Field>
            <Field label="Waktu"><input {...f('waktu')} /></Field>
            <Field label="Lokasi"><input {...f('lokasi')} /></Field>
          </div>
          <Field label="Keterangan"><textarea {...f('keterangan')} /></Field>
        </Modal>
      )}
      {hapus && <Confirm title="Hapus jadwal?" tone="bad" confirmText="Hapus" busy={busy} message={`Jadwal ${hapus.sesi} (${hapus.nama_periode}) akan dihapus.`} onConfirm={doHapus} onCancel={() => setHapus(null)} />}
    </>
  );
}
