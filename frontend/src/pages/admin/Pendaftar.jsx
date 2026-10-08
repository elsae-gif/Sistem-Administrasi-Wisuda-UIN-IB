import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtTanggal, toQuery } from '../../api.js';
import FilterBar from '../../components/FilterBar.jsx';
import { Badge, Empty, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';

export default function Pendaftar() {
  const [filter, setFilter] = useState({});
  const { data, error, loading, reload } = useFetch(`/admin/pendaftar${toQuery(filter)}`);
  return (
    <>
      <PageHead title="Data Pendaftar" subtitle="Cari dan filter seluruh pendaftar wisuda." />
      <FilterBar fields={['q', 'periode_id', 'fakultas', 'program_studi', 'status', 'status_berkas', 'status_peserta', 'status_kehadiran']} value={filter} onChange={setFilter}>
        <button className="btn ghost" onClick={() => setFilter({})}>Reset filter</button>
      </FilterBar>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : data.length === 0 ? (
        <div className="card"><Empty title="Tidak ada pendaftar yang cocok">Ubah atau reset filter untuk melihat data lain.</Empty></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>NIM</th><th>Nama</th><th>Fakultas / Prodi</th><th>IPK</th><th>Periode</th><th>Tgl daftar</th><th>Berkas valid</th><th>Status</th><th>Peserta</th><th></th></tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.id}>
              <td className="nowrap">{r.nim}</td><td><strong>{r.nama}</strong></td>
              <td>{r.fakultas}<div className="muted small">{r.program_studi}</div></td><td>{Number(r.ipk).toFixed(2)}</td>
              <td>{r.nama_periode}</td><td className="nowrap">{fmtTanggal(r.tanggal_daftar)}</td>
              <td>{r.berkas_valid}/{r.berkas_wajib}</td><td><Badge status={r.status} /></td>
              <td>{r.nomor_peserta || '-'}</td>
              <td><Link className="btn sm ghost" to={`/admin/pendaftar/${r.id}`}>Detail</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {data && <p className="muted small mt-s">{data.length} data ditampilkan.</p>}
    </>
  );
}
