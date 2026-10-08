import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../Toast.jsx';
import { Field, PageHead } from '../components/ui.jsx';

// Kartu ganti password (+ ubah nama/email untuk akun admin)
export function AkunCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState({ password_lama: '', password_baru: '', ulangi: '' });
  const [prof, setProf] = useState({ nama: user.nama, email: user.email });
  const [busy, setBusy] = useState(false);

  const gantiPw = async (e) => {
    e.preventDefault();
    if (pw.password_baru.length < 6) return toast.error('Password baru minimal 6 karakter.');
    if (pw.password_baru !== pw.ulangi) return toast.error('Konfirmasi password tidak sama.');
    setBusy(true);
    try { const r = await api.put('/auth/password', pw); toast.success(r.message); setPw({ password_lama: '', password_baru: '', ulangi: '' }); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const simpanProfil = async (e) => {
    e.preventDefault();
    try { const r = await api.put('/auth/profil', prof); toast.success(r.message); setUser({ ...user, ...prof }); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="grid two">
      {user.role === 'admin' && (
        <form className="card" onSubmit={simpanProfil}>
          <div className="card-head"><h2>Profil akun</h2></div>
          <Field label="Nama"><input value={prof.nama} onChange={(e) => setProf({ ...prof, nama: e.target.value })} /></Field>
          <Field label="Email"><input value={prof.email} onChange={(e) => setProf({ ...prof, email: e.target.value })} /></Field>
          <button className="btn">Simpan profil</button>
        </form>
      )}
      <form className="card" onSubmit={gantiPw}>
        <div className="card-head"><h2>Ganti password</h2></div>
        <Field label="Password lama"><input type="password" value={pw.password_lama} onChange={(e) => setPw({ ...pw, password_lama: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="Password baru" hint="Minimal 6 karakter."><input type="password" value={pw.password_baru} onChange={(e) => setPw({ ...pw, password_baru: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="Ulangi password baru"><input type="password" value={pw.ulangi} onChange={(e) => setPw({ ...pw, ulangi: e.target.value })} autoComplete="new-password" /></Field>
        <button className="btn" disabled={busy}>{busy ? 'Menyimpan...' : 'Ubah password'}</button>
      </form>
    </div>
  );
}

export default function Pengaturan() {
  return (<><PageHead title="Pengaturan" subtitle="Kelola keamanan akun Anda." /><AkunCard /></>);
}
