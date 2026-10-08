import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api, fmtWaktu } from '../api.js';
import { Confirm } from '../components/ui.jsx';

const MENU = {
  mahasiswa: [
    ['/mahasiswa', '▦', 'Dashboard', true],
    ['/mahasiswa/data-diri', '☺', 'Data Diri'],
    ['/mahasiswa/pendaftaran', '✎', 'Pendaftaran Wisuda'],
    ['/mahasiswa/berkas', '⇪', 'Berkas'],
    ['/mahasiswa/status', '◔', 'Status Pendaftaran'],
    ['/mahasiswa/jadwal', '▤', 'Jadwal Wisuda'],
    ['/mahasiswa/kartu', '▣', 'Kartu Peserta'],
    ['/mahasiswa/pengaturan', '⚙', 'Pengaturan'],
  ],
  admin: [
    ['/admin', '▦', 'Dashboard', true],
    ['/admin/periode', '◷', 'Periode Wisuda'],
    ['/admin/pendaftar', '☰', 'Pendaftar'],
    ['/admin/verifikasi', '✔', 'Verifikasi'],
    ['/admin/peserta', '★', 'Peserta Wisuda'],
    ['/admin/jadwal', '▤', 'Jadwal'],
    ['/admin/kehadiran', '◉', 'Kehadiran'],
    ['/admin/laporan', '≣', 'Laporan'],
    ['/admin/export', '⇩', 'Export'],
    ['/admin/pengaturan', '⚙', 'Pengaturan'],
  ],
};

export default function AppLayout({ role }) {
  const { user, kampus, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const base = role === 'admin' ? '/admin' : '/student';

  useEffect(() => { setOpen(false); setShowNotif(false); }, [loc.pathname]);

  const loadNotif = () => api.get(`${base}/notifikasi`).then(setNotif).catch(() => {});
  useEffect(() => { loadNotif(); const t = setInterval(loadNotif, 30000); return () => clearInterval(t); }, []); // eslint-disable-line

  const unread = notif.filter((n) => !n.dibaca).length;
  const toggleNotif = async () => {
    const next = !showNotif;
    setShowNotif(next);
    if (next && unread) { await api.post(`${base}/notifikasi/baca`); setTimeout(loadNotif, 1500); }
  };
  const judul = (MENU[role].find((m) => (m[3] ? loc.pathname === m[0] : loc.pathname.startsWith(m[0]))) || [])[2] || 'SIWIS';

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><div className="brand-logo">S</div><div className="brand-name">SIWIS</div></div>
          <div className="brand-sub">Sistem Informasi Administrasi Wisudawan<br />{kampus}</div>
        </div>
        <nav className="nav">
          {MENU[role].map(([to, ico, label, end]) => (
            <NavLink key={to} to={to} end={!!end}><span className="ico">{ico}</span>{label}</NavLink>
          ))}
          <button className="navbtn" onClick={() => setConfirmOut(true)}><span className="ico">⏻</span>Logout</button>
        </nav>
      </aside>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setOpen(true)} aria-label="Buka menu">☰</button>
            <strong style={{ color: 'var(--ink)' }}>{judul}</strong>
          </div>
          <div className="topbar-right">
            <button className="bell" onClick={toggleNotif} aria-label="Notifikasi">🔔{unread > 0 && <span className="dot">{unread}</span>}</button>
            <div className="userchip">
              <div className="avatar">{(user.nama || '?').slice(0, 1).toUpperCase()}</div>
              <div className="uname"><div style={{ fontWeight: 600, lineHeight: 1.2 }}>{user.nama}</div><div className="muted small">{role === 'admin' ? 'Admin' : 'Mahasiswa'}</div></div>
            </div>
          </div>
          {showNotif && (
            <div className="notif-panel">
              {notif.length === 0 && <div className="notif-item muted">Belum ada notifikasi.</div>}
              {notif.map((n) => (
                <div key={n.id} className={`notif-item ${n.dibaca ? '' : 'unread'}`}>{n.pesan}<time>{fmtWaktu(n.created_at)}</time></div>
              ))}
            </div>
          )}
        </header>
        <main className="content"><Outlet /></main>
      </div>
      {confirmOut && (
        <Confirm title="Logout" message="Anda yakin ingin keluar dari SIWIS?" confirmText="Logout"
          onCancel={() => setConfirmOut(false)} onConfirm={() => { logout(); nav('/login'); }} />
      )}
    </div>
  );
}
