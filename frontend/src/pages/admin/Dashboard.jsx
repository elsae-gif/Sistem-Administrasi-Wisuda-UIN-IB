import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtWaktu } from '../../api.js';
import { Badge, BarChart, Empty, ErrorBox, Loading, PageHead, Stat, useFetch } from '../../components/ui.jsx';

export default function Dashboard() {
  const [periode, setPeriode] = useState('');
  const opsi = useFetch('/admin/opsi');
  const { data, error, loading, reload } = useFetch(`/admin/dashboard${periode ? `?periode_id=${periode}` : ''}`);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const k = data ? data.kartu : null;

  return (
    <>
      <PageHead title="Dashboard Admin" subtitle="Ringkasan proses administrasi wisuda.">
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} style={{ width: 240 }} aria-label="Filter periode">
          <option value="">Semua periode</option>
          {(opsi.data ? opsi.data.periode : []).map((p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>)}
        </select>
      </PageHead>
      {loading || !k ? <Loading /> : (
        <>
          <div className="grid stats">
            <Stat label="Total pendaftar" value={k.total_pendaftar} tone="info" />
            <Stat label="Menunggu verifikasi" value={k.menunggu} tone="warn" />
            <Stat label="Perlu revisi" value={k.revisi} tone="bad" />
            <Stat label="Disetujui" value={k.disetujui} tone="ok" />
            <Stat label="Peserta wisuda" value={k.peserta} tone="gold" />
            <Stat label="Hadir" value={k.hadir} tone="ok" />
            <Stat label="Tidak hadir" value={k.tidak_hadir} tone="bad" />
          </div>
          <div className="grid two mt">
            <div className="card"><div className="card-head"><h2>Pendaftar per periode</h2></div><BarChart data={data.perPeriode} gold /></div>
            <div className="card"><div className="card-head"><h2>Pendaftar per fakultas</h2></div><BarChart data={data.perFakultas} /></div>
            <div className="card"><div className="card-head"><h2>Pendaftar per program studi</h2></div><BarChart data={data.perProdi} /></div>
            <div className="card"><div className="card-head"><h2>Berdasarkan status</h2></div><BarChart data={data.perStatus} gold /></div>
          </div>
          <div className="grid two mt">
            <div className="card">
              <div className="card-head"><h2>Pendaftar terbaru</h2><Link className="btn sm ghost" to="/admin/pendaftar">Semua pendaftar</Link></div>
              {data.terbaru.length === 0 ? <Empty title="Belum ada pendaftar" /> : (
                <div className="table-wrap"><table style={{ minWidth: 420 }}><tbody>
                  {data.terbaru.map((r) => (
                    <tr key={r.id}><td><Link to={`/admin/pendaftar/${r.id}`}><strong>{r.nama}</strong></Link><div className="muted small">{r.nim} · {r.program_studi}</div></td>
                      <td className="right"><Badge status={r.status} /></td></tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
            <div className="card">
              <div className="card-head"><h2>Aktivitas terbaru</h2></div>
              {data.aktivitas.length === 0 ? <Empty title="Belum ada aktivitas" /> : (
                <ul className="activity">{data.aktivitas.map((a, i) => <li key={i}>{a.aktivitas}<time>{fmtWaktu(a.created_at)}</time></li>)}</ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
