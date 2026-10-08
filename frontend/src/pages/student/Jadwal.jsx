import { fmtTanggal } from '../../api.js';
import { Badge, Empty, ErrorBox, Loading, PageHead, useFetch } from '../../components/ui.jsx';

export default function Jadwal() {
  const { data, error, loading, reload } = useFetch('/student/jadwal');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { pendaftaran: p, jadwal } = data;
  if (!p) return (<><PageHead title="Jadwal Wisuda" /><div className="card"><Empty title="Anda belum mendaftar wisuda">Jadwal akan tampil setelah Anda memilih periode.</Empty></div></>);
  return (
    <>
      <PageHead title="Jadwal Wisuda" subtitle={p.nama_periode} />
      <div className="alert info">
        {p.sesi ? <>Anda terdaftar pada <strong>{p.sesi}</strong>{p.nomor_kursi && <> · kursi <strong>{p.nomor_kursi}</strong></>}.</> :
          'Sesi Anda akan ditentukan setelah Anda ditetapkan sebagai peserta wisuda.'}
      </div>
      {jadwal.length === 0 ? <div className="card"><Empty title="Jadwal belum tersedia">Admin belum mengatur jadwal untuk periode ini.</Empty></div> : (
        <div className="grid three">
          {jadwal.map((j) => (
            <div key={j.id} className="card" style={j.sesi === p.sesi ? { borderColor: 'var(--gold)', borderWidth: 2 } : {}}>
              <div className="card-head"><h2>{j.sesi}</h2>{j.sesi === p.sesi && <Badge status="Peserta Wisuda">Sesi Anda</Badge>}</div>
              <dl className="kv">
                <dt>Tanggal</dt><dd>{fmtTanggal(j.tanggal)}</dd>
                <dt>Waktu</dt><dd>{j.waktu}</dd>
                <dt>Lokasi</dt><dd>{j.lokasi}</dd>
              </dl>
              {j.keterangan && <p className="muted small">{j.keterangan}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
