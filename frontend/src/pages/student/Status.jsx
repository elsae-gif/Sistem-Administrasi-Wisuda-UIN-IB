import { Link } from 'react-router-dom';
import { fmtTanggal, fmtWaktu, rupiah } from '../../api.js';
import { Badge, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';
import { Timeline } from './Dashboard.jsx';

export default function Status() {
  const { data, error, loading, reload } = useFetch('/student/pendaftaran');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const p = data.pendaftaran;
  if (!p) return (<><PageHead title="Status Pendaftaran" /><div className="card"><div className="empty"><strong>Belum ada pendaftaran</strong><Link className="btn mt-s" to="/mahasiswa/pendaftaran">Daftar wisuda</Link></div></div></>);

  const pesan = {
    Draft: 'Pendaftaran masih draft. Lengkapi berkas lalu kirim.',
    'Menunggu Verifikasi': 'Berkas Anda sedang diverifikasi Admin.',
    Diajukan: 'Pendaftaran telah diajukan.',
    Revisi: 'Ada berkas yang perlu diperbaiki. Lihat catatan Admin di bawah.',
    Diverifikasi: 'Seluruh berkas valid. Menunggu persetujuan akhir Admin.',
    Disetujui: 'Pendaftaran disetujui. Menunggu penetapan sebagai peserta wisuda.',
    'Peserta Wisuda': 'Selamat, Anda adalah peserta wisuda resmi.',
    Ditolak: 'Pendaftaran ditolak.',
  }[p.status];
  const tone = { Revisi: 'bad', Ditolak: 'bad', Disetujui: 'ok', 'Peserta Wisuda': 'ok' }[p.status] || 'info';

  return (
    <>
      <PageHead title="Status Pendaftaran" subtitle="Detail verifikasi pendaftaran dan berkas Anda." />
      <div className="card">
        <div className="card-head"><h2>Progres</h2><Badge status={p.status} /></div>
        <Timeline p={p} />
        <div className={`alert ${tone} mt-s`} style={{ marginBottom: 0 }}>{pesan}{p.catatan && <><br /><strong>Catatan Admin:</strong> {p.catatan}</>}</div>
      </div>
      <div className="grid two mt">
        <div className="card">
          <div className="card-head"><h2>Informasi pendaftaran</h2></div>
          <dl className="kv">
            <dt>Periode</dt><dd>{p.nama_periode}</dd>
            <dt>Tanggal daftar</dt><dd>{p.tanggal_daftar ? fmtWaktu(p.tanggal_daftar) : 'Belum dikirim'}</dd>
            <dt>Tanggal wisuda</dt><dd>{fmtTanggal(p.tanggal_wisuda)}</dd>
            <dt>Pembayaran</dt><dd><Badge status={p.status_pembayaran}>{p.status_pembayaran} ({rupiah(p.nominal)})</Badge></dd>
            <dt>Peserta resmi</dt><dd>{p.nomor_peserta ? <>Ya · {p.nomor_peserta}</> : 'Belum'}</dd>
            <dt>Kehadiran</dt><dd>{p.nomor_peserta ? <Badge status={p.status_kehadiran} /> : '-'}</dd>
          </dl>
        </div>
        <div className="card">
          <div className="card-head"><h2>Ringkasan berkas</h2></div>
          <dl className="kv">
            <dt>Berkas wajib</dt><dd>{p.berkas_wajib_total}</dd>
            <dt>Sudah diupload</dt><dd>{p.berkas_wajib_terupload}</dd>
            <dt>Dinyatakan valid</dt><dd>{p.berkas_wajib_valid}</dd>
          </dl>
          {['Draft', 'Revisi'].includes(p.status) && <Link className="btn mt" to="/mahasiswa/berkas">Ke halaman berkas</Link>}
        </div>
      </div>
      <h2 className="mt mb">Status setiap berkas</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Berkas</th><th>Status</th><th>Catatan Admin</th><th>Diverifikasi</th></tr></thead>
          <tbody>
            {p.berkas.map((b) => (
              <tr key={b.jenis_id}>
                <td>{b.jenis_nama}</td><td><Badge status={b.status} /></td>
                <td>{b.catatan ? <span style={{ color: 'var(--bad)' }}>{b.catatan}</span> : '-'}</td>
                <td className="nowrap">{b.tanggal_verifikasi ? fmtWaktu(b.tanggal_verifikasi) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
