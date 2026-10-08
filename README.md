# SIWIS — Sistem Informasi Administrasi Wisudawan

**Perancangan dan Pengembangan Sistem Informasi Administrasi Wisudawan Berbasis Web pada [NAMA KAMPUS]**

Aplikasi web full-stack untuk mengelola administrasi wisuda: pendaftaran, upload dan verifikasi berkas, revisi,
persetujuan, penetapan peserta, kartu peserta + QR Code, jadwal, kehadiran, laporan, dan export Excel.

## Teknologi

| Bagian   | Teknologi                                                                 |
|----------|---------------------------------------------------------------------------|
| Frontend | React 18 + Vite + React Router                                            |
| Backend  | Node.js + Express (REST API)                                              |
| Database | MySQL 8 (MariaDB 10.5+ juga bisa)                                         |
| Auth     | JWT + bcrypt (password di-hash)                                           |
| Upload   | multer (PDF/JPG/PNG, maks. 2 MB)                                          |
| Excel/PDF| ExcelJS (.xlsx), PDFKit (kartu peserta & laporan PDF)                     |
| QR Code  | `qrcode` (pembuatan) + `BarcodeDetector` browser / scanner USB (pembacaan)|

## Requirement

- **Node.js 18 atau lebih baru** (disarankan 20 LTS) — https://nodejs.org
- **MySQL 8** (atau XAMPP/Laragon dengan MariaDB 10.5+)
- **Visual Studio Code**
- Browser modern (Chrome/Edge disarankan; scan QR lewat kamera memakai `BarcodeDetector`)

## Struktur folder

```
SIWIS/
├── database/siwis.sql          # skema database + jenis berkas bawaan
├── backend/
│   ├── server.js               # entry point Express
│   ├── seed.js                 # data dummy (akun, mahasiswa, periode, jadwal, pendaftaran)
│   ├── test.js                 # uji alur utama end-to-end
│   ├── config/db.js            # koneksi MySQL
│   ├── middleware/             # auth (JWT + role), upload (validasi file)
│   ├── routes/                 # auth, student, admin, export
│   ├── utils/                  # helper, filter laporan, status pendaftaran, QR
│   └── uploads/                # file berkas (tidak dapat diakses publik)
└── frontend/
    └── src/
        ├── pages/student/      # halaman Mahasiswa
        ├── pages/admin/        # halaman Admin
        ├── layouts/            # sidebar + navbar
        ├── components/         # UI, filter, kartu kirim pendaftaran
        └── api.js, Toast.jsx, AuthContext.jsx, styles.css
```

## Instalasi (dari awal)

1. **Salin project** ke komputer Anda, mis. `C:\SIWIS`.
2. **Buka folder di VS Code**: `File > Open Folder > SIWIS`, lalu buka terminal (`Ctrl + ~`).
3. **Pastikan MySQL berjalan.**
4. **Import database.** Pilih salah satu:
   ```bash
   mysql -u root -p < database/siwis.sql
   ```
   atau lewat phpMyAdmin/MySQL Workbench: buka `database/siwis.sql` lalu jalankan (skrip membuat database `siwis`).
5. **Atur `.env` backend.** File `backend/.env` sudah disediakan (salinan `.env.example`). Sesuaikan:
   ```
   DB_USER=root
   DB_PASSWORD=<password MySQL Anda, kosongkan jika tidak ada>
   JWT_SECRET=<ganti dengan kalimat rahasia panjang>
   NAMA_KAMPUS=<nama kampus Anda>
   ```
6. **Install dependency & isi data dummy** (terminal 1):
   ```bash
   cd backend
   npm install
   npm run seed
   npm start
   ```
   Backend berjalan di http://localhost:5000 (cek http://localhost:5000/api/health).
7. **Jalankan frontend** (terminal 2, buka dengan tombol `+` di panel terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
8. Buka **http://localhost:5173**.

### Akun demo

| Role      | Login                                         | Password       |
|-----------|-----------------------------------------------|----------------|
| Admin     | `admin@siwis.test`                            | `admin123`     |
| Mahasiswa | `mahasiswa@siwis.test` atau NIM `2317020138`  | `mahasiswa123` |

Mahasiswa demo (NIM 2317020138) **belum mendaftar**, sehingga Anda dapat menguji alur dari awal.
Mahasiswa dummy lain (`<NIM>@siwis.test`, password `mahasiswa123`) sudah berada di berbagai status
(Menunggu Verifikasi, Revisi, Disetujui, Peserta Wisuda, dst.) agar dashboard, laporan, dan export langsung terisi.

## Alur simulasi

**Mahasiswa:** Login → Data Diri (lengkapi) → Pendaftaran Wisuda (pilih periode, konfirmasi) → Berkas (upload semua berkas wajib)
→ kirim pendaftaran → Status Pendaftaran → *(jika direvisi)* upload ulang → Jadwal → Kartu Peserta (download PDF + QR).

**Admin:** Login → Periode Wisuda → Verifikasi (buka detail pendaftar) → tandai berkas **Valid / Revisi / Tolak** (alasan wajib)
→ **Setujui** → Peserta Wisuda (**Tetapkan**, nomor peserta otomatis `WIS-<kode periode>-001`) → Jadwal → Kehadiran
(scan QR / ketik nomor peserta → konfirmasi hadir) → Laporan → Export Excel.

Status pendaftaran: `Draft → Menunggu Verifikasi → Revisi ⇄ Menunggu Verifikasi → Diverifikasi → Disetujui → Peserta Wisuda`
(atau `Ditolak`). Hanya status **Disetujui** yang dapat ditetapkan sebagai peserta.

## Mengetes otomatis

Dengan backend berjalan dan data hasil `npm run seed`:
```bash
cd backend
npm test
```
Skrip menjalankan alur lengkap (login, otorisasi, pendaftaran, validasi file, revisi, persetujuan, penetapan peserta,
kartu/QR, kehadiran, laporan, seluruh export Excel/PDF). Jalankan `npm run seed` lagi untuk mengulang dari awal.

## Keamanan yang diterapkan

- Password di-hash (bcrypt); autentikasi JWT; setiap endpoint memeriksa token dan role (`/api/admin`, `/api/export` hanya Admin; `/api/student` hanya Mahasiswa).
- Mahasiswa hanya dapat membaca/mengubah datanya sendiri (semua query dibatasi `mahasiswa_id` milik akun login).
- Upload dibatasi ekstensi (PDF/JPG/PNG) dan ukuran (2 MB), nama file diacak; folder `uploads` tidak dipublikasikan — file hanya dapat diunduh lewat endpoint terautentikasi.
- Validasi input di server dan di form; query memakai parameter (anti SQL injection).

## Export Excel

Menu **Export** dan **Laporan** (mengikuti filter periode/fakultas/prodi/status): seluruh peserta, data pendaftar, peserta disetujui,
daftar kehadiran, rekap fakultas/prodi (2 sheet), serta laporan (Excel dan PDF). Library: ExcelJS.

## Mode produksi sederhana (opsional)

```bash
cd frontend && npm run build
cd ../backend && npm start     # backend otomatis menyajikan frontend/dist di http://localhost:5000
```

## Pemecahan masalah

| Gejala | Solusi |
|--------|--------|
| `Tidak dapat terhubung ke MySQL` | Jalankan MySQL; cek `DB_*` di `backend/.env`. |
| `Database belum siap` | Import `database/siwis.sql` lalu `npm run seed`. |
| `Access denied for user` | Isi `DB_PASSWORD` yang benar. |
| Login gagal setelah mengimpor ulang SQL | Jalankan `npm run seed` lagi (membuat akun demo). |
| Layar login "Tidak dapat terhubung ke server" | Pastikan backend berjalan di port 5000 (`npm start`). |
| Port 5000/5173 terpakai | Ubah `PORT` di `.env` dan `proxy` di `frontend/vite.config.js`. |
| Scan kamera tidak muncul | Browser tidak mendukung `BarcodeDetector`; gunakan scanner QR USB atau ketik nomor peserta. |

## Pengembangan lanjutan

Impor data mahasiswa dari Excel/SIAKAD, notifikasi email/WhatsApp, log aktivitas lengkap, tabel `fakultas` dan `program_studi` terpisah,
dan pengaturan banyak hari/sesi pada satu periode.
