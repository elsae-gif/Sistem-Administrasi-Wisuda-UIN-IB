import { useState } from 'react';
import { downloadFile, toQuery } from '../../api.js';
import { useToast } from '../../Toast.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import { PageHead } from '../../components/ui.jsx';

const ITEM = [
  ['peserta', 'Seluruh peserta wisuda', 'Daftar peserta resmi beserta nomor peserta, sesi, dan kursi.', 'peserta-wisuda.xlsx'],
  ['pendaftar', 'Data pendaftar', 'Semua pendaftar (selain draft) dengan kontak, judul, dan status.', 'data-pendaftar.xlsx'],
  ['disetujui', 'Peserta yang disetujui', 'Mahasiswa berstatus Disetujui dan Peserta Wisuda.', 'peserta-disetujui.xlsx'],
  ['kehadiran', 'Daftar kehadiran', 'Status dan waktu kehadiran setiap peserta.', 'daftar-kehadiran.xlsx'],
  ['rekap', 'Rekap fakultas / prodi', 'Dua sheet: rekap per fakultas dan per program studi.', 'rekap-fakultas-prodi.xlsx'],
];

export default function Export() {
  const toast = useToast();
  const [filter, setFilter] = useState({});
  const [busy, setBusy] = useState('');
  const unduh = async (tipe, nama) => {
    setBusy(tipe);
    try { await downloadFile(`/export/${tipe}${toQuery(filter)}`, nama); toast.success('File Excel berhasil dibuat.'); }
    catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };
  return (
    <>
      <PageHead title="Export Excel" subtitle="Hasil export mengikuti filter di bawah. Kosongkan filter untuk mengekspor semua data." />
      <FilterBar fields={['periode_id', 'fakultas', 'program_studi', 'status', 'sesi']} value={filter} onChange={setFilter}>
        <button className="btn ghost" onClick={() => setFilter({})}>Reset filter</button>
      </FilterBar>
      <div className="grid three">
        {ITEM.map(([tipe, judul, ket, nama]) => (
          <div className="card" key={tipe}>
            <h2>{judul}</h2>
            <p className="muted">{ket}</p>
            <button className="btn gold" disabled={busy === tipe} onClick={() => unduh(tipe, nama)}>{busy === tipe ? 'Membuat file...' : 'Export Excel'}</button>
          </div>
        ))}
      </div>
    </>
  );
}
