import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadFile, fmtWaktu } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import { Badge, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';
import SubmitCard from '../../components/SubmitCard.jsx';

const EXT = ['pdf', 'jpg', 'jpeg', 'png'];

export default function Berkas() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/student/pendaftaran');
  const [busyId, setBusyId] = useState(null);
  const fileRef = useRef(null);
  const target = useRef(null);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const p = data.pendaftaran;
  const maks = data.maks_ukuran_mb;
  if (!p || p.status === 'Ditolak') {
    return (<><PageHead title="Berkas" /><div className="card"><div className="empty"><strong>Anda belum memiliki pendaftaran aktif</strong>
      <Link className="btn mt-s" to="/mahasiswa/pendaftaran">Daftar wisuda</Link></div></div></>);
  }

  const bolehUpload = (b) => p.status === 'Draft' || (p.status === 'Revisi' && ['Revisi', 'Ditolak', 'Belum Upload'].includes(b.status));
  const pilihFile = (b) => { target.current = b; fileRef.current.value = ''; fileRef.current.click(); };

  const onFile = async (e) => {
    const file = e.target.files[0];
    const b = target.current;
    if (!file || !b) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!EXT.includes(ext)) return toast.error('Format file salah. Gunakan PDF, JPG, atau PNG.');
    if (file.size > maks * 1024 * 1024) return toast.error(`Ukuran file terlalu besar. Maksimal ${maks} MB.`);
    const fd = new FormData();
    fd.append('jenis_berkas_id', b.jenis_id);
    fd.append('file', file);
    setBusyId(b.jenis_id);
    try { const r = await api.upload('/student/berkas', fd); toast.success(r.message); reload(); }
    catch (err) { toast.error(err.message); } finally { setBusyId(null); }
  };

  return (
    <>
      <PageHead title="Upload Berkas" subtitle={`Format PDF, JPG, atau PNG. Ukuran maksimal ${maks} MB per file.`}>
        <Badge status={p.status} />
      </PageHead>
      {p.status === 'Revisi' && <div className="alert bad"><strong>Perlu revisi.</strong> {p.catatan || 'Perbaiki berkas yang ditandai Revisi, lalu upload ulang.'}</div>}
      {!['Draft', 'Revisi'].includes(p.status) && <div className="alert info">Berkas sedang diverifikasi atau sudah diproses, sehingga tidak dapat diubah.</div>}
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={onFile} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Berkas</th><th>File</th><th>Status</th><th>Catatan Admin</th><th></th></tr></thead>
          <tbody>
            {p.berkas.map((b) => (
              <tr key={b.jenis_id}>
                <td><strong>{b.jenis_nama}</strong>{!b.wajib && <span className="muted small"> (opsional)</span>}<div className="muted small">{b.keterangan}</div></td>
                <td>{b.berkas_id ? (<><button className="btn sm ghost" onClick={() => downloadFile(`/student/berkas/${b.berkas_id}/file`, b.nama_file, { open: true }).catch((e) => toast.error(e.message))}>Lihat</button>
                  <div className="muted small">{b.nama_file}<br />{fmtWaktu(b.tanggal_upload)}</div></>) : <span className="muted">-</span>}</td>
                <td><Badge status={b.status} /></td>
                <td style={{ maxWidth: 260 }}>{b.catatan ? <span style={{ color: 'var(--bad)' }}>{b.catatan}</span> : <span className="muted">-</span>}</td>
                <td className="right">
                  {b.status !== 'Valid' && bolehUpload(b) && (
                    <button className="btn sm" disabled={busyId === b.jenis_id} onClick={() => pilihFile(b)}>
                      {busyId === b.jenis_id ? 'Mengupload...' : b.status === 'Belum Upload' ? 'Upload' : 'Upload ulang'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt"><SubmitCard p={p} onDone={reload} /></div>
    </>
  );
}
