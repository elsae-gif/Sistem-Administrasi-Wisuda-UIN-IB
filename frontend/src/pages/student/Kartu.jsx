import { Link } from 'react-router-dom';
import { downloadFile, fmtTanggal } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { useToast } from '../../Toast.jsx';
import { Badge, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';

export default function Kartu() {
  const toast = useToast();
  const { kampus } = useAuth();
  const { data, error, loading, reload } = useFetch('/student/kartu');
  if (loading) return <Loading />;
  if (error) return (<><PageHead title="Kartu Peserta" /><div className="card"><div className="empty"><strong>Kartu peserta belum tersedia</strong>
    <span>{error}</span><br /><Link className="btn mt-s ghost" to="/mahasiswa/status">Lihat status pendaftaran</Link></div></div>
    <button className="btn sm ghost mt" onClick={reload}>Muat ulang</button></>);
  const { peserta: p, jadwal, qr } = data;
  return (
    <>
      <PageHead title="Kartu Peserta Wisuda" subtitle="Tunjukkan QR Code ini saat registrasi kehadiran.">
        <button className="btn gold" onClick={() => downloadFile('/student/kartu/pdf', `kartu-${p.nomor_peserta}.pdf`).catch((e) => toast.error(e.message))}>Download Kartu Peserta</button>
        <button className="btn ghost" onClick={() => window.print()}>Cetak</button>
      </PageHead>
      <div className="id-card">
        <div className="id-head">
          <div className="brand-logo">S</div>
          <div><strong>{kampus}</strong><small>Kartu Peserta Wisuda · {p.nama_periode}</small></div>
        </div>
        <div className="id-body">
          <dl>
            <div><dt>Nama</dt><dd>{p.nama}</dd></div>
            <div><dt>NIM</dt><dd>{p.nim}</dd></div>
            <div><dt>Fakultas / Program Studi</dt><dd>{p.fakultas} · {p.program_studi}</dd></div>
            <div><dt>Nomor peserta</dt><dd style={{ fontSize: '1.2rem' }}>{p.nomor_peserta}</dd></div>
            <div><dt>Sesi / Kursi</dt><dd>{p.sesi || '-'} / {p.nomor_kursi || '-'}</dd></div>
            <div><dt>Tanggal & waktu</dt><dd>{fmtTanggal(jadwal ? jadwal.tanggal : p.tanggal_wisuda)}{jadwal && ` · ${jadwal.waktu}`}</dd></div>
          </dl>
          <div className="id-qr"><img src={qr} alt={`QR Code ${p.nomor_peserta}`} /></div>
        </div>
        <div className="id-foot">Status kehadiran: <Badge status={p.status_kehadiran} /></div>
      </div>
    </>
  );
}
