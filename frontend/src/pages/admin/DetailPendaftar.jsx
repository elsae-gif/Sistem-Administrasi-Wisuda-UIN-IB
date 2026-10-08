import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, downloadFile, fmtTanggal, fmtWaktu, rupiah } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { Badge, Confirm, ErrorBox, Field, Loading, Modal, PageHead, useFetch } from '../../components/ui.jsx';

export default function DetailPendaftar() {
  const { id } = useParams();
  const toast = useToast();
  const { data: d, error, loading, reload } = useFetch(`/admin/pendaftar/${id}`);
  const [catatanModal, setCatatanModal] = useState(null); // {tipe:'berkas'|'keputusan', status/aksi, berkas?}
  const [catatan, setCatatan] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(null); // {aksi, catatan}
  const [tetapkan, setTetapkan] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const bisaVerifikasi = ['Menunggu Verifikasi', 'Revisi', 'Diverifikasi'].includes(d.status);
  const bisaKeputusan = ['Menunggu Verifikasi', 'Revisi', 'Diverifikasi'].includes(d.status);

  const aksiBerkas = async (b, status, cat) => {
    setBusy(true);
    try { const r = await api.put(`/admin/berkas/${b.berkas_id}`, { status, catatan: cat }); toast.success(r.message); setCatatanModal(null); setCatatan(''); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const keputusan = async (aksi, cat) => {
    setBusy(true);
    try { const r = await api.post(`/admin/pendaftar/${d.id}/keputusan`, { aksi, catatan: cat }); toast.success(r.message); setKonfirmasi(null); setCatatanModal(null); setCatatan(''); reload(); }
    catch (e) { toast.error(e.message); setKonfirmasi(null); } finally { setBusy(false); }
  };
  const doTetapkan = async () => {
    setBusy(true);
    try { const r = await api.post('/admin/peserta', { pendaftaran_id: d.id, sesi: tetapkan.sesi, nomor_kursi: tetapkan.nomor_kursi }); toast.success(r.message); setTetapkan(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const submitCatatan = () => {
    if (!catatan.trim()) return toast.error('Alasan wajib diisi.');
    if (catatanModal.tipe === 'berkas') return aksiBerkas(catatanModal.berkas, catatanModal.status, catatan);
    setKonfirmasi({ aksi: catatanModal.aksi, catatan });
  };

  return (
    <>
      <PageHead title="Detail Pendaftar" subtitle={`${d.nama} · ${d.nim}`}>
        <Link className="btn ghost" to="/admin/verifikasi">← Antrian verifikasi</Link>
        <Link className="btn ghost" to="/admin/pendaftar">Semua pendaftar</Link>
      </PageHead>

      <div className="grid two">
        <div className="card">
          <div className="card-head"><h2>Identitas mahasiswa</h2><Badge status={d.status_kelulusan} /></div>
          <dl className="kv">
            <dt>NIM</dt><dd>{d.nim}</dd><dt>Nama</dt><dd>{d.nama}</dd>
            <dt>Fakultas</dt><dd>{d.fakultas}</dd><dt>Program studi</dt><dd>{d.program_studi}</dd>
            <dt>IPK</dt><dd>{Number(d.ipk).toFixed(2)} <span className="muted small">(minimal {Number(d.min_ipk).toFixed(2)})</span></dd>
            <dt>Judul skripsi/TA</dt><dd>{d.judul_skripsi || '-'}</dd>
            <dt>Email / HP</dt><dd>{d.email} · {d.no_hp || '-'}</dd>
            <dt>Masuk / Lulus</dt><dd>{d.tahun_masuk || '-'} / {d.tahun_lulus || '-'}</dd>
          </dl>
        </div>
        <div className="card">
          <div className="card-head"><h2>Data pendaftaran</h2><Badge status={d.status} /></div>
          <dl className="kv">
            <dt>Periode wisuda</dt><dd>{d.nama_periode}</dd>
            <dt>Tanggal wisuda</dt><dd>{fmtTanggal(d.tanggal_wisuda)}</dd>
            <dt>Tanggal pendaftaran</dt><dd>{d.tanggal_daftar ? fmtWaktu(d.tanggal_daftar) : 'Belum dikirim'}</dd>
            <dt>Pembayaran</dt><dd><Badge status={d.status_pembayaran} /> {rupiah(d.nominal)}</dd>
            <dt>Berkas wajib valid</dt><dd>{d.berkas_wajib_valid}/{d.berkas_wajib_total}</dd>
            <dt>Peserta</dt><dd>{d.nomor_peserta ? `${d.nomor_peserta} · ${d.sesi || 'sesi belum ditentukan'}` : 'Belum ditetapkan'}</dd>
            <dt>Catatan</dt><dd>{d.catatan || '-'}</dd>
          </dl>
        </div>
      </div>

      <h2 className="mt mb">Berkas wisuda</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Nama berkas</th><th>File</th><th>Status</th><th>Catatan Admin</th><th>Tindakan</th></tr></thead>
        <tbody>{d.berkas.map((b) => (
          <tr key={b.jenis_id}>
            <td><strong>{b.jenis_nama}</strong>{!b.wajib && <span className="muted small"> (opsional)</span>}</td>
            <td>{b.berkas_id ? (<><button className="btn sm ghost" onClick={() => downloadFile(`/admin/berkas/${b.berkas_id}/file`, b.nama_file, { open: true }).catch((e) => toast.error(e.message))}>Lihat file</button>
              <div className="muted small">{b.nama_file}</div></>) : <span className="muted">Belum upload</span>}</td>
            <td><Badge status={b.status} /></td>
            <td style={{ maxWidth: 240 }}>{b.catatan || '-'}</td>
            <td className="nowrap">
              {b.berkas_id && bisaVerifikasi ? (
                <div className="btn-row">
                  <button className="btn sm ok" disabled={busy || b.status === 'Valid'} onClick={() => aksiBerkas(b, 'Valid', '')}>Valid</button>
                  <button className="btn sm warn" disabled={busy} onClick={() => { setCatatan(''); setCatatanModal({ tipe: 'berkas', status: 'Revisi', berkas: b }); }}>Revisi</button>
                  <button className="btn sm bad" disabled={busy} onClick={() => { setCatatan(''); setCatatanModal({ tipe: 'berkas', status: 'Ditolak', berkas: b }); }}>Tolak</button>
                </div>
              ) : <span className="muted small">-</span>}
            </td>
          </tr>
        ))}</tbody>
      </table></div>

      <div className="card mt">
        <div className="card-head"><h2>Keputusan akhir</h2></div>
        {bisaKeputusan ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>Persetujuan hanya dapat diberikan jika seluruh berkas wajib berstatus Valid.</p>
            <div className="btn-row">
              <button className="btn ok" disabled={busy} onClick={() => setKonfirmasi({ aksi: 'setujui', catatan: '' })}>SETUJUI</button>
              <button className="btn warn" disabled={busy} onClick={() => { setCatatan(''); setCatatanModal({ tipe: 'keputusan', aksi: 'revisi' }); }}>REVISI</button>
              <button className="btn bad" disabled={busy} onClick={() => { setCatatan(''); setCatatanModal({ tipe: 'keputusan', aksi: 'tolak' }); }}>TOLAK</button>
            </div>
          </>
        ) : d.status === 'Disetujui' ? (
          <div className="btn-row"><span className="alert ok" style={{ margin: 0 }}>Pendaftaran disetujui.</span>
            <button className="btn gold" onClick={() => setTetapkan({ sesi: 'Sesi 1', nomor_kursi: '' })}>Tetapkan sebagai peserta</button></div>
        ) : d.status === 'Peserta Wisuda' ? (
          <div className="alert ok" style={{ margin: 0 }}>Peserta resmi dengan nomor <strong>{d.nomor_peserta}</strong>. Kelola sesi di menu Peserta Wisuda.</div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Tidak ada keputusan yang dapat diberikan pada status "{d.status}".</p>
        )}
      </div>

      {catatanModal && (
        <Modal title={catatanModal.tipe === 'berkas' ? `${catatanModal.status === 'Revisi' ? 'Minta revisi' : 'Tolak'} berkas: ${catatanModal.berkas.jenis_nama}` : catatanModal.aksi === 'revisi' ? 'Minta revisi pendaftaran' : 'Tolak pendaftaran'}
          onClose={() => setCatatanModal(null)}
          footer={<><button className="btn ghost" onClick={() => setCatatanModal(null)}>Batal</button><button className="btn" onClick={submitCatatan} disabled={busy}>Lanjut</button></>}>
          <Field label="Alasan (wajib)" hint="Alasan ini akan dilihat mahasiswa."><textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} autoFocus placeholder="Contoh: Pas foto tidak sesuai ketentuan ukuran. Silakan upload ulang." /></Field>
        </Modal>
      )}
      {konfirmasi && (
        <Confirm title={{ setujui: 'Setujui pendaftaran?', revisi: 'Kembalikan untuk revisi?', tolak: 'Tolak pendaftaran?' }[konfirmasi.aksi]}
          tone={{ setujui: 'ok', revisi: 'warn', tolak: 'bad' }[konfirmasi.aksi]} busy={busy}
          confirmText={{ setujui: 'Ya, setujui', revisi: 'Ya, kembalikan', tolak: 'Ya, tolak' }[konfirmasi.aksi]}
          message={{ setujui: `Pendaftaran ${d.nama} akan disetujui dan mahasiswa dapat ditetapkan sebagai peserta.`, revisi: `Pendaftaran ${d.nama} akan dikembalikan untuk diperbaiki.`, tolak: `Pendaftaran ${d.nama} akan ditolak. Tindakan ini tidak dapat dibatalkan.` }[konfirmasi.aksi]}
          onConfirm={() => keputusan(konfirmasi.aksi, konfirmasi.catatan)} onCancel={() => setKonfirmasi(null)} />
      )}
      {tetapkan && (
        <Modal title="Tetapkan sebagai peserta wisuda" onClose={() => setTetapkan(null)}
          footer={<><button className="btn ghost" onClick={() => setTetapkan(null)}>Batal</button><button className="btn gold" disabled={busy} onClick={doTetapkan}>Tetapkan</button></>}>
          <p className="muted" style={{ marginTop: 0 }}>Nomor peserta dibuat otomatis (format WIS-{d.kode_periode}-001).</p>
          <div className="form-grid">
            <Field label="Sesi"><input value={tetapkan.sesi} onChange={(e) => setTetapkan({ ...tetapkan, sesi: e.target.value })} /></Field>
            <Field label="Nomor kursi (opsional)"><input value={tetapkan.nomor_kursi} onChange={(e) => setTetapkan({ ...tetapkan, nomor_kursi: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
