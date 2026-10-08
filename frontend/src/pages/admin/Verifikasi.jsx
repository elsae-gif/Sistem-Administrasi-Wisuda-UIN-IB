import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtTanggal, toQuery } from '../../api.js';
import FilterBar from '../../components/FilterBar.jsx';
import { Badge, Empty, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';

// Antrian verifikasi: pendaftar yang membutuhkan tindakan Admin
export default function Verifikasi() {
  const [filter, setFilter] = useState({ status: 'Menunggu Verifikasi' });
  const { data, error, loading, reload } = useFetch(`/admin/pendaftar${toQuery(filter)}`);
  const antrian = (data || []).filter((r) => ['Menunggu Verifikasi', 'Revisi', 'Diverifikasi', 'Disetujui'].includes(r.status) || filter.status);
  return (
    <>
      <PageHead title="Verifikasi Berkas" subtitle="Periksa berkas pendaftar, beri status valid atau revisi, lalu ambil keputusan akhir." />
      <FilterBar fields={['q', 'periode_id', 'fakultas', 'status']} value={filter} onChange={setFilter} />
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : antrian.length === 0 ? (
        <div className="card"><Empty title="Tidak ada pendaftar dalam antrian">Semua pendaftar dengan filter ini sudah diproses.</Empty></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>NIM</th><th>Nama</th><th>Prodi</th><th>Tgl daftar</th><th>Berkas valid</th><th>Status</th><th></th></tr></thead>
          <tbody>{antrian.map((r) => (
            <tr key={r.id}><td>{r.nim}</td><td><strong>{r.nama}</strong></td><td>{r.program_studi}</td><td className="nowrap">{fmtTanggal(r.tanggal_daftar)}</td>
              <td>{r.berkas_valid}/{r.berkas_wajib}</td><td><Badge status={r.status} /></td>
              <td><Link className="btn sm" to={`/admin/verifikasi/${r.id}`}>Verifikasi</Link></td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
