import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Field } from '../components/ui.jsx';

export default function Login() {
  const { user, login, kampus } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/mahasiswa'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Email/NIM dan password wajib diisi.');
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      nav(u.role === 'admin' ? '/admin' : '/mahasiswa', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <section className="login-art">
        <div className="brand-mark" style={{ position: 'relative', zIndex: 1 }}>
          <div className="brand-logo">S</div><span className="brand-name">{kampus}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>SIWIS</h1>
          <p>Sistem Informasi Administrasi Wisudawan. Daftar wisuda, kirim berkas, dan pantau verifikasinya di satu tempat.</p>
          <ul className="login-steps">
            <li>Daftar dan lengkapi data</li><li>Upload berkas persyaratan</li><li>Pantau verifikasi dan revisi</li>
            <li>Unduh kartu peserta dan QR Code</li>
          </ul>
        </div>
        <small style={{ color: '#9db3c8', position: 'relative', zIndex: 1 }}>© {new Date().getFullYear()} {kampus}</small>
      </section>
      <section className="login-form">
        <form className="login-box" onSubmit={submit} noValidate>
          <h1 style={{ marginBottom: 6 }}>Masuk ke SIWIS</h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 22 }}>Mahasiswa dapat memakai email atau NIM.</p>
          {error && <div className="alert bad" role="alert">{error}</div>}
          <Field label="Email / NIM"><input value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="username" /></Field>
          <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
          <button className="btn gold" style={{ width: '100%' }} disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
          <div className="demo">
            <strong>Akun demo</strong><br />
            Admin: admin@siwis.test / admin123 <button type="button" onClick={() => { setEmail('admin@siwis.test'); setPassword('admin123'); }}>isi</button><br />
            Mahasiswa: mahasiswa@siwis.test / mahasiswa123 <button type="button" onClick={() => { setEmail('mahasiswa@siwis.test'); setPassword('mahasiswa123'); }}>isi</button>
          </div>
        </form>
      </section>
    </div>
  );
}
