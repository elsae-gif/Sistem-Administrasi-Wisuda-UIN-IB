-- SIWIS - Sistem Informasi Administrasi Wisudawan
-- Jalankan file ini di MySQL 8 (atau MariaDB 10.5+).
-- Data dummy (akun & mahasiswa) diisi lewat:  cd backend && npm run seed

CREATE DATABASE IF NOT EXISTS siwis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE siwis;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS log_aktivitas, notifikasi, jadwal_wisuda, peserta_wisuda, pembayaran,
  berkas_wisuda, pendaftaran_wisuda, jenis_berkas, periode_wisuda, mahasiswa, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','mahasiswa') NOT NULL,
  nama VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE mahasiswa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nim VARCHAR(20) NOT NULL UNIQUE,
  nama VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  no_hp VARCHAR(20) NULL,
  fakultas VARCHAR(100) NOT NULL,
  program_studi VARCHAR(100) NOT NULL,
  ipk DECIMAL(3,2) NOT NULL DEFAULT 0,
  judul_skripsi VARCHAR(300) NULL,
  status_kelulusan ENUM('Belum Lulus','Lulus') NOT NULL DEFAULT 'Belum Lulus',
  tahun_masuk YEAR NULL,
  tahun_lulus YEAR NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE periode_wisuda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(10) NOT NULL UNIQUE,
  nama_periode VARCHAR(120) NOT NULL,
  tanggal_wisuda DATE NOT NULL,
  lokasi VARCHAR(200) NOT NULL,
  biaya DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_ipk DECIMAL(3,2) NOT NULL DEFAULT 2.00,
  status ENUM('Dibuka','Ditutup') NOT NULL DEFAULT 'Dibuka',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE jenis_berkas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(120) NOT NULL,
  keterangan VARCHAR(255) NULL,
  wajib TINYINT(1) NOT NULL DEFAULT 1,
  is_pembayaran TINYINT(1) NOT NULL DEFAULT 0,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE pendaftaran_wisuda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_id INT NOT NULL,
  periode_id INT NOT NULL,
  tanggal_daftar DATETIME NULL,
  status ENUM('Draft','Diajukan','Menunggu Verifikasi','Revisi','Diverifikasi','Disetujui','Ditolak','Peserta Wisuda') NOT NULL DEFAULT 'Draft',
  catatan TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mhs_periode (mahasiswa_id, periode_id),
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
  FOREIGN KEY (periode_id) REFERENCES periode_wisuda(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE berkas_wisuda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pendaftaran_id INT NOT NULL,
  jenis_berkas_id INT NOT NULL,
  nama_file VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  status ENUM('Belum Upload','Menunggu Verifikasi','Valid','Revisi','Ditolak') NOT NULL DEFAULT 'Menunggu Verifikasi',
  catatan TEXT NULL,
  tanggal_upload DATETIME NOT NULL,
  tanggal_verifikasi DATETIME NULL,
  UNIQUE KEY uq_daftar_jenis (pendaftaran_id, jenis_berkas_id),
  FOREIGN KEY (pendaftaran_id) REFERENCES pendaftaran_wisuda(id) ON DELETE CASCADE,
  FOREIGN KEY (jenis_berkas_id) REFERENCES jenis_berkas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pendaftaran_id INT NOT NULL UNIQUE,
  nominal DECIMAL(12,2) NOT NULL DEFAULT 0,
  bukti_pembayaran VARCHAR(255) NULL,
  status ENUM('Belum Bayar','Menunggu Verifikasi','Lunas','Ditolak') NOT NULL DEFAULT 'Belum Bayar',
  tanggal_pembayaran DATETIME NULL,
  FOREIGN KEY (pendaftaran_id) REFERENCES pendaftaran_wisuda(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE peserta_wisuda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pendaftaran_id INT NOT NULL UNIQUE,
  nomor_peserta VARCHAR(30) NOT NULL UNIQUE,
  sesi VARCHAR(30) NULL,
  nomor_kursi VARCHAR(20) NULL,
  qr_code VARCHAR(120) NOT NULL,
  status_kehadiran ENUM('Belum Hadir','Hadir','Tidak Hadir') NOT NULL DEFAULT 'Belum Hadir',
  waktu_hadir DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pendaftaran_id) REFERENCES pendaftaran_wisuda(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE jadwal_wisuda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  periode_id INT NOT NULL,
  sesi VARCHAR(30) NOT NULL,
  tanggal DATE NOT NULL,
  waktu VARCHAR(30) NOT NULL,
  lokasi VARCHAR(200) NOT NULL,
  keterangan VARCHAR(300) NULL,
  FOREIGN KEY (periode_id) REFERENCES periode_wisuda(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifikasi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pesan VARCHAR(300) NOT NULL,
  dibaca TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE log_aktivitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  aktivitas VARCHAR(300) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Jenis berkas bawaan (dapat diubah Admin di menu Pengaturan)
INSERT INTO jenis_berkas (nama, keterangan, wajib, is_pembayaran, urutan) VALUES
('Bukti Pembayaran', 'Bukti transfer biaya wisuda (JPG/PNG/PDF)', 1, 1, 1),
('Surat Bebas Pustaka', 'Surat keterangan bebas pinjaman dari perpustakaan', 1, 0, 2),
('Surat Bebas Laboratorium', 'Surat keterangan bebas laboratorium', 1, 0, 3),
('Bukti Bebas Administrasi', 'Bukti tidak memiliki tunggakan administrasi', 1, 0, 4),
('Pas Foto', 'Pas foto 3x4, latar merah/biru, format JPG/PNG', 1, 0, 5),
('Dokumen Kelulusan', 'SK Yudisium / transkrip nilai akhir', 1, 0, 6),
('Dokumen Lainnya', 'Dokumen tambahan jika diminta kampus (opsional)', 0, 0, 7);
