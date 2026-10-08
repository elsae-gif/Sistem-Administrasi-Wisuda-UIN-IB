// Pembungkus fetch: otomatis menambahkan token & mengubah error menjadi Error(message)
const BASE = '/api';
export const getToken = () => localStorage.getItem('siwis_token');
export const setToken = (t) => (t ? localStorage.setItem('siwis_token', t) : localStorage.removeItem('siwis_token'));

async function request(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan backend sudah dijalankan.');
  }
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const err = new Error((data && data.message) || 'Terjadi kesalahan.');
    err.detail = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b || {}),
  put: (p, b) => request('PUT', p, b || {}),
  del: (p) => request('DELETE', p),
  upload: (p, formData) => request('POST', p, formData, true),
};

// Unduh file (butuh token) lalu simpan / buka di tab baru
export async function downloadFile(path, filename, { open = false } = {}) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let msg = 'Gagal mengunduh file.';
    try { msg = (await res.json()).message || msg; } catch { /* abaikan */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (open) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const toQuery = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const fmtTanggal = (s) => {
  if (!s) return '-';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
export const fmtWaktu = (s) => {
  if (!s) return '-';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
