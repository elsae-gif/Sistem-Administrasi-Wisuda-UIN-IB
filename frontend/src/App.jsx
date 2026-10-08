import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import { Loading } from './components/ui.jsx';

import SDashboard from './pages/student/Dashboard.jsx';
import SDataDiri from './pages/student/DataDiri.jsx';
import SPendaftaran from './pages/student/Pendaftaran.jsx';
import SBerkas from './pages/student/Berkas.jsx';
import SStatus from './pages/student/Status.jsx';
import SJadwal from './pages/student/Jadwal.jsx';
import SKartu from './pages/student/Kartu.jsx';
import Pengaturan from './pages/Pengaturan.jsx';

import ADashboard from './pages/admin/Dashboard.jsx';
import APeriode from './pages/admin/Periode.jsx';
import APendaftar from './pages/admin/Pendaftar.jsx';
import AVerifikasi from './pages/admin/Verifikasi.jsx';
import ADetail from './pages/admin/DetailPendaftar.jsx';
import APeserta from './pages/admin/Peserta.jsx';
import AJadwal from './pages/admin/Jadwal.jsx';
import AKehadiran from './pages/admin/Kehadiran.jsx';
import ALaporan from './pages/admin/Laporan.jsx';
import AExport from './pages/admin/Export.jsx';
import APengaturan from './pages/admin/Pengaturan.jsx';

// Pembatas route: harus login dan sesuai role
function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/mahasiswa'} replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/mahasiswa'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route path="/mahasiswa" element={<Guard role="mahasiswa"><AppLayout role="mahasiswa" /></Guard>}>
        <Route index element={<SDashboard />} />
        <Route path="data-diri" element={<SDataDiri />} />
        <Route path="pendaftaran" element={<SPendaftaran />} />
        <Route path="berkas" element={<SBerkas />} />
        <Route path="status" element={<SStatus />} />
        <Route path="jadwal" element={<SJadwal />} />
        <Route path="kartu" element={<SKartu />} />
        <Route path="pengaturan" element={<Pengaturan />} />
      </Route>

      <Route path="/admin" element={<Guard role="admin"><AppLayout role="admin" /></Guard>}>
        <Route index element={<ADashboard />} />
        <Route path="periode" element={<APeriode />} />
        <Route path="pendaftar" element={<APendaftar />} />
        <Route path="pendaftar/:id" element={<ADetail />} />
        <Route path="verifikasi" element={<AVerifikasi />} />
        <Route path="verifikasi/:id" element={<ADetail />} />
        <Route path="peserta" element={<APeserta />} />
        <Route path="jadwal" element={<AJadwal />} />
        <Route path="kehadiran" element={<AKehadiran />} />
        <Route path="laporan" element={<ALaporan />} />
        <Route path="export" element={<AExport />} />
        <Route path="pengaturan" element={<APengaturan />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
