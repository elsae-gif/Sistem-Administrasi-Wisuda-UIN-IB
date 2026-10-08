import { useFetch } from './ui.jsx';

export const STATUS_PENDAFTARAN = ['Menunggu Verifikasi', 'Revisi', 'Diverifikasi', 'Disetujui', 'Ditolak', 'Peserta Wisuda'];
export const STATUS_BERKAS = ['Belum Upload', 'Menunggu Verifikasi', 'Valid', 'Revisi', 'Ditolak'];

// Bar filter yang dipakai di banyak halaman admin.
// fields: daftar kunci filter yang ditampilkan. value/onChange: objek filter.
export default function FilterBar({ fields, value, onChange, children }) {
  const { data: opsi } = useFetch('/admin/opsi');
  const set = (k, v) => {
    const next = { ...value, [k]: v };
    if (k === 'fakultas') next.program_studi = '';
    onChange(next);
  };
  const prodi = opsi ? opsi.prodi.filter((p) => !value.fakultas || p.fakultas === value.fakultas) : [];
  const sel = (k, label, options, render) => (
    <div className="field" key={k}>
      <label>{label}</label>
      <select value={value[k] || ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">Semua</option>
        {options.map((o) => (render ? render(o) : <option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
  const el = {
    q: () => (<div className="field" key="q"><label>Cari NIM / Nama</label>
      <input value={value.q || ''} onChange={(e) => set('q', e.target.value)} placeholder="Ketik NIM atau nama" /></div>),
    periode_id: () => sel('periode_id', 'Periode wisuda', opsi ? opsi.periode : [], (p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>),
    fakultas: () => sel('fakultas', 'Fakultas', opsi ? opsi.fakultas : []),
    program_studi: () => sel('program_studi', 'Program studi', prodi, (p) => <option key={p.program_studi} value={p.program_studi}>{p.program_studi}</option>),
    status: () => sel('status', 'Status pendaftaran', STATUS_PENDAFTARAN),
    status_berkas: () => sel('status_berkas', 'Status berkas', STATUS_BERKAS),
    status_peserta: () => sel('status_peserta', 'Status peserta', ['Peserta', 'Bukan Peserta']),
    status_kehadiran: () => sel('status_kehadiran', 'Kehadiran', ['Belum Hadir', 'Hadir', 'Tidak Hadir']),
    sesi: () => sel('sesi', 'Sesi', opsi ? opsi.sesi : []),
  };
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="filters">
        {fields.map((f) => el[f]())}
        {children}
      </div>
    </div>
  );
}
