import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const BADGE = {
  // status pendaftaran
  Draft: 'neutral', Diajukan: 'info', 'Menunggu Verifikasi': 'warn', Revisi: 'bad', Diverifikasi: 'info',
  Disetujui: 'ok', Ditolak: 'bad', 'Peserta Wisuda': 'gold',
  // status berkas
  'Belum Upload': 'neutral', Valid: 'ok',
  // kehadiran
  'Belum Hadir': 'neutral', Hadir: 'ok', 'Tidak Hadir': 'bad',
  // periode & pembayaran
  Dibuka: 'ok', Ditutup: 'neutral', Lunas: 'ok', 'Belum Bayar': 'neutral',
  Lulus: 'ok', 'Belum Lulus': 'bad',
};
export const Badge = ({ status, children }) => (
  <span className={`badge ${BADGE[status] || ''}`}>{children || status}</span>
);

export const Loading = ({ text = 'Memuat data...' }) => (
  <div className="loading"><div className="spinner" />{text}</div>
);

export const Empty = ({ title = 'Belum ada data', children }) => (
  <div className="empty"><strong>{title}</strong>{children}</div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="alert bad">
    {message}
    {onRetry && <> <button className="btn sm ghost" onClick={onRetry} style={{ marginLeft: 8 }}>Coba lagi</button></>}
  </div>
);

export const PageHead = ({ title, subtitle, children }) => (
  <div className="page-head">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children && <div className="btn-row">{children}</div>}
  </div>
);

export const Stat = ({ label, value, tone = '', small }) => (
  <div className={`card stat ${tone}`}>
    <div className="label">{label}</div>
    <div className={`value ${small ? 'sm' : ''}`}>{value}</div>
  </div>
);

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button className="x" onClick={onClose} aria-label="Tutup">×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Dialog konfirmasi (dipakai sebelum hapus / setujui / tolak / kirim)
export function Confirm({ title = 'Konfirmasi', message, confirmText = 'Ya, lanjutkan', tone = '', onConfirm, onCancel, busy, children }) {
  return (
    <Modal title={title} onClose={onCancel} footer={<>
      <button className="btn ghost" onClick={onCancel} disabled={busy}>Batal</button>
      <button className={`btn ${tone}`} onClick={onConfirm} disabled={busy}>{busy ? 'Memproses...' : confirmText}</button>
    </>}>
      <p style={{ margin: 0 }}>{message}</p>
      {children}
    </Modal>
  );
}

export function BarChart({ data, gold }) {
  if (!data || !data.length) return <Empty title="Belum ada data grafik" />;
  const max = Math.max(...data.map((d) => d.jumlah), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span title={d.label}>{d.label}</span>
          <div className="track"><div className={`fill ${gold ? 'gold' : ''}`} style={{ width: `${(d.jumlah / max) * 100}%` }} /></div>
          <span className="num">{d.jumlah}</span>
        </div>
      ))}
    </div>
  );
}

// Hook sederhana untuk memuat data dari API
export function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api.get(path)); } catch (e) { setError(e.message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
