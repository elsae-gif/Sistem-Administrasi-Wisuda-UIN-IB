import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, toQuery } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import { Badge, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, useFetch } from '../../components/ui.jsx';

export default function Peserta() {
  const toast = useToast();
  const [filter, setFilter] = useState({});
  const peserta = useFetch(`/admin/peserta${toQuery(filter)}`);
  const siap = useFetch(`/admin/pendaftar${toQuery({ status: 'Disetujui', periode_id: filter.periode_id })}`);
  const opsi = useFetch('/admin/opsi');
  const [tetapkan, setTetapkan] = useState(null); // {id, nama, sesi, nomor_kursi}
  const [edit, setEdit] = useState(null);
  const [batal, setBatal] = useState(null);
  const [massal, setMassal] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => { peserta.reload(); siap.reload(); };
  const jalankan = async (fn, tutup) => {
    setBusy(true);
    try { const r = await fn(); toast.success(r.message); tutup(); refresh(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Peserta Wisuda" subtitle="Tetapkan mahasiswa yang disetujui sebagai peserta resmi, lengkap dengan nomor peserta, sesi, dan kursi.">
        <button className="btn gold" onClick={() => setMassal({ periode_id: filter.periode_id || '', sesi: 'Sesi 1' })} disabled={!siap.data || siap.data.length === 0}>Tetapkan semua yang disetujui</button>
      </PageHead>
      <FilterBar fields={['q', 'periode_id', 'fakultas', 'program_studi', 'sesi']} value={filter} onChange={setFilter} />

      <div className="card">
        <div className="card-head"><h2>Siap ditetapkan ({siap.data ? siap.data.length : 0})</h2></div>
        {siap.loading ? <Loading /> : siap.data.length === 0 ? <Empty title="Tidak ada pendaftar berstatus Disetujui">Setujui pendaftar di menu Verifikasi terlebih dahulu.</Empty> : (
          <div className="table-wrap"><table style={{ minWidth: 520 }}><tbody>
            {siap.data.map((r) => (
              <tr key={r.id}><td><Link to={`/admin/pendaftar/${r.id}`}><strong>{r.nama}</strong></Link><div className="muted small">{r.nim} · {r.program_studi}</div></td>
                <td>{r.nama_periode}</td><td className="right"><button className="btn sm gold" onClick={() => setTetapkan({ id: r.id, nama: r.nama, sesi: 'Sesi 1', nomor_kursi: '' })}>Tetapkan peserta</button></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      <h2 className="mt mb">Daftar peserta resmi</h2>
      {peserta.error ? <ErrorBox message={peserta.error} onRetry={peserta.reload} /> : peserta.loading ? <Loading /> : peserta.data.length === 0 ? (
        <div className="card"><Empty title="Belum ada peserta wisuda" /></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>No Peserta</th><th>NIM</th><th>Nama</th><th>Fakultas / Prodi</th><th>Periode</th><th>Sesi</th><th>Kursi</th><th>Kehadiran</th><th></th></tr></thead>
          <tbody>{peserta.data.map((r) => (
            <tr key={r.id}><td><strong>{r.nomor_peserta}</strong></td><td>{r.nim}</td><td>{r.nama}</td>
              <td>{r.fakultas}<div className="muted small">{r.program_studi}</div></td><td>{r.nama_periode}</td>
              <td>{r.sesi || '-'}</td><td>{r.nomor_kursi || '-'}</td><td><Badge status={r.status_kehadiran} /></td>
              <td className="nowrap"><button className="btn sm ghost" onClick={() => setEdit({ id: r.peserta_id, nama: r.nama, sesi: r.sesi || '', nomor_kursi: r.nomor_kursi || '' })}>Atur sesi</button>{' '}
                <button className="btn sm bad" onClick={() => setBatal(r)}>Batalkan</button></td></tr>
          ))}</tbody>
        </table></div>
      )}

      {tetapkan && (
        <Modal title={`Tetapkan ${tetapkan.nama}`} onClose={() => setTetapkan(null)}
          footer={<><button className="btn ghost" onClick={() => setTetapkan(null)}>Batal</button>
            <button className="btn gold" disabled={busy} onClick={() => jalankan(() => api.post('/admin/peserta', { pendaftaran_id: tetapkan.id, sesi: tetapkan.sesi, nomor_kursi: tetapkan.nomor_kursi }), () => setTetapkan(null))}>Tetapkan</button></>}>
          <div className="form-grid">
            <Field label="Sesi"><input value={tetapkan.sesi} onChange={(e) => setTetapkan({ ...tetapkan, sesi: e.target.value })} /></Field>
            <Field label="Nomor kursi (opsional)"><input value={tetapkan.nomor_kursi} onChange={(e) => setTetapkan({ ...tetapkan, nomor_kursi: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title={`Atur sesi: ${edit.nama}`} onClose={() => setEdit(null)}
          footer={<><button className="btn ghost" onClick={() => setEdit(null)}>Batal</button>
            <button className="btn" disabled={busy} onClick={() => jalankan(() => api.put(`/admin/peserta/${edit.id}`, edit), () => setEdit(null))}>Simpan</button></>}>
          <div className="form-grid">
            <Field label="Sesi"><input value={edit.sesi} onChange={(e) => setEdit({ ...edit, sesi: e.target.value })} /></Field>
            <Field label="Nomor kursi"><input value={edit.nomor_kursi} onChange={(e) => setEdit({ ...edit, nomor_kursi: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {massal && (
        <Modal title="Tetapkan semua yang disetujui" onClose={() => setMassal(null)}
          footer={<><button className="btn ghost" onClick={() => setMassal(null)}>Batal</button>
            <button className="btn gold" disabled={busy || !massal.periode_id} onClick={() => jalankan(() => api.post('/admin/peserta/massal', massal), () => setMassal(null))}>Tetapkan semua</button></>}>
          <p className="muted" style={{ marginTop: 0 }}>Seluruh mahasiswa berstatus Disetujui pada periode terpilih akan ditetapkan, diurutkan berdasarkan fakultas, prodi, dan NIM.</p>
          <Field label="Periode">
            <select value={massal.periode_id} onChange={(e) => setMassal({ ...massal, periode_id: e.target.value })}>
              <option value="">Pilih periode</option>
              {(opsi.data ? opsi.data.periode : []).map((p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>)}
            </select>
          </Field>
          <Field label="Sesi"><input value={massal.sesi} onChange={(e) => setMassal({ ...massal, sesi: e.target.value })} /></Field>
        </Modal>
      )}
      {batal && <Confirm title="Batalkan penetapan peserta?" tone="bad" confirmText="Ya, batalkan" busy={busy}
        message={`${batal.nama} (${batal.nomor_peserta}) akan dikembalikan ke status Disetujui dan kartu pesertanya tidak berlaku.`}
        onCancel={() => setBatal(null)} onConfirm={() => jalankan(() => api.del(`/admin/peserta/${batal.peserta_id}`), () => setBatal(null))} />}
    </>
  );
}
