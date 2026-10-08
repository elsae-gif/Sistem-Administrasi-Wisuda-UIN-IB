import { useState } from 'react';
import { api, downloadFile, toQuery } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import { Badge, Empty, Loading, PageHead } from '../../components/ui.jsx';

export default function Laporan() {
  const toast = useToast();
  const [filter, setFilter] = useState({});
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const tampilkan = async () => {
    setLoading(true);
    try { setRows(await api.get(`/admin/laporan${toQuery(filter)}`)); }
    catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  const unduh = (path, nama) => downloadFile(`/export/${path}${toQuery(filter)}`, nama).catch((e) => toast.error(e.message));

  return (
    <>
      <PageHead title="Laporan" subtitle="Pilih filter, tampilkan data, lalu export sesuai filter yang dipilih.">
        <button className="btn gold" disabled={!rows} onClick={() => unduh('laporan', 'laporan-wisuda.xlsx')}>Export Excel</button>
        <button className="btn ghost" disabled={!rows} onClick={() => unduh('laporan-pdf', 'laporan-wisuda.pdf')}>Export PDF</button>
      </PageHead>
      <FilterBar fields={['periode_id', 'fakultas', 'program_studi', 'status']} value={filter} onChange={setFilter}>
        <button className="btn" onClick={tampilkan} disabled={loading}>{loading ? 'Memuat...' : 'Tampilkan Data'}</button>
      </FilterBar>
      {loading ? <Loading /> : rows === null ? (
        <div className="card"><Empty title="Belum ada data ditampilkan">Pilih filter lalu klik "Tampilkan Data".</Empty></div>
      ) : rows.length === 0 ? <div className="card"><Empty title="Tidak ada data untuk filter ini" /></div> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>No</th><th>NIM</th><th>Nama</th><th>Fakultas</th><th>Prodi</th><th>IPK</th><th>Status</th><th>No Peserta</th><th>Sesi</th><th>Kehadiran</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{r.nim}</td><td>{r.nama}</td><td>{r.fakultas}</td><td>{r.program_studi}</td><td>{Number(r.ipk).toFixed(2)}</td>
                <td><Badge status={r.status} /></td><td>{r.nomor_peserta || '-'}</td><td>{r.sesi || '-'}</td><td>{r.nomor_peserta ? <Badge status={r.status_kehadiran} /> : '-'}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="muted small mt-s">{rows.length} data.</p>
        </>
      )}
    </>
  );
}
