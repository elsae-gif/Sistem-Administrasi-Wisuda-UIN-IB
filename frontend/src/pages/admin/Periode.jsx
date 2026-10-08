import { useState } from 'react';
import { api, fmtTanggal, rupiah } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { Badge, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, useFetch } from '../../components/ui.jsx';

const KOSONG = { kode: '', nama_periode: '', tanggal_wisuda: '', lokasi: '', biaya: 0, min_ipk: 2.0, status: 'Dibuka' };

export default function Periode() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/admin/periode');
  const [form, setForm] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const simpan = async () => {
    setBusy(true);
    try {
      const r = form.id ? await api.put(`/admin/periode/${form.id}`, form) : await api.post('/admin/periode', form);
      toast.success(r.message); setForm(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doHapus = async () => {
    setBusy(true);
    try { const r = await api.del(`/admin/periode/${hapus.id}`); toast.success(r.message); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); setHapus(null); }
  };
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <>
      <PageHead title="Periode Wisuda" subtitle="Atur periode pendaftaran, biaya, dan syarat IPK minimal.">
        <button className="btn gold" onClick={() => setForm({ ...KOSONG })}>Tambah periode</button>
      </PageHead>
      {data.length === 0 ? <div className="card"><Empty title="Belum ada periode wisuda">Buat periode pertama agar mahasiswa dapat mendaftar.</Empty></div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Kode</th><th>Nama periode</th><th>Tanggal wisuda</th><th>Lokasi</th><th>Biaya</th><th>IPK min</th><th>Pendaftar</th><th>Status</th><th></th></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id}><td><strong>{p.kode}</strong></td><td>{p.nama_periode}</td><td className="nowrap">{fmtTanggal(p.tanggal_wisuda)}</td><td>{p.lokasi}</td>
              <td className="nowrap">{rupiah(p.biaya)}</td><td>{Number(p.min_ipk).toFixed(2)}</td><td>{p.jumlah_pendaftar}</td><td><Badge status={p.status} /></td>
              <td className="nowrap right"><button className="btn sm ghost" onClick={() => setForm({ ...p, tanggal_wisuda: String(p.tanggal_wisuda).slice(0, 10) })}>Ubah</button>{' '}
                <button className="btn sm bad" onClick={() => setHapus(p)}>Hapus</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {form && (
        <Modal title={form.id ? 'Ubah periode wisuda' : 'Tambah periode wisuda'} onClose={() => setForm(null)}
          footer={<><button className="btn ghost" onClick={() => setForm(null)}>Batal</button><button className="btn" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan...' : 'Simpan'}</button></>}>
          <div className="form-grid">
            <Field label="Kode periode" hint="Dipakai pada nomor peserta, contoh 2026B."><input {...f('kode')} maxLength={10} /></Field>
            <Field label="Status"><select {...f('status')}><option>Dibuka</option><option>Ditutup</option></select></Field>
          </div>
          <Field label="Nama periode"><input {...f('nama_periode')} placeholder="Wisuda Periode II Tahun 2026" /></Field>
          <div className="form-grid">
            <Field label="Tanggal wisuda"><input type="date" {...f('tanggal_wisuda')} /></Field>
            <Field label="Lokasi"><input {...f('lokasi')} /></Field>
            <Field label="Biaya (Rp)"><input type="number" min="0" {...f('biaya')} /></Field>
            <Field label="IPK minimal"><input type="number" step="0.01" min="0" max="4" {...f('min_ipk')} /></Field>
          </div>
        </Modal>
      )}
      {hapus && <Confirm title="Hapus periode?" tone="bad" confirmText="Hapus" busy={busy} message={`Periode "${hapus.nama_periode}" akan dihapus permanen. Periode yang sudah memiliki pendaftar tidak dapat dihapus.`} onConfirm={doHapus} onCancel={() => setHapus(null)} />}
    </>
  );
}
