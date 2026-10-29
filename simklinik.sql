-- ============================================================
-- DATABASE SISTEM MANAJEMEN KLINIK
-- Versi: 1.0
-- Tanggal: 2026-09-25
--
-- Modul:
-- - Manajemen User //master  
-- - Manajemen //master
-- - Manajemen Dokter//master
-- - Manajemen Poli//master
-- - Pendaftaran/Kunjungan//transaksional
-- - Rekam Medis//transaksional
-- - Pemeriksaan//detail transaksional
-- - Diagnosa//detail transaksional
-- - Tindakan //detail transaksional
-- - Resep & Obat // detail transaksional
-- - Apotek / Stok Obat //master
-- - Supplier & Pembelian
-- - Pembayaran
-- - Laporan
-- - Pengaturan Klinik
-- ============================================================


CREATE DATABASE IF NOT EXISTS klinik_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE klinik_db;


-- ============================================================
-- 1. USERS
-- Admin, dokter, perawat, kasir, apoteker, pendaftaran
-- ============================================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM(
        'admin',
        'dokter',
        'perawat',
        'pendaftaran',
        'kasir',
        'apoteker',
        'gudang'
    ) NOT NULL,
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. DATA POLI
-- ============================================================

CREATE TABLE poli (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_poli VARCHAR(20) UNIQUE NOT NULL,
    nama_poli VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    tarif_pendaftaran DECIMAL(12,2) DEFAULT 0,
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. DATA DOKTER
-- ============================================================

CREATE TABLE dokter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    kode_dokter VARCHAR(30) UNIQUE NOT NULL,
    nama_dokter VARCHAR(150) NOT NULL,
    no_str VARCHAR(100),
    no_sip VARCHAR(100),
    spesialisasi VARCHAR(100),
    jenis_kelamin ENUM('L', 'P'),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    telepon VARCHAR(20),
    email VARCHAR(100),
    tarif_konsultasi DECIMAL(12,2) DEFAULT 0,
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 4. DATA PASIEN
-- ============================================================

CREATE TABLE pasien (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_rm VARCHAR(30) UNIQUE NOT NULL,
    nik VARCHAR(30),
    nama_pasien VARCHAR(150) NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    telepon VARCHAR(20),
    email VARCHAR(100),
    golongan_darah ENUM(
        'A',
        'B',
        'AB',
        'O',
        'Tidak Diketahui'
    ) DEFAULT 'Tidak Diketahui',
    status_pernikahan ENUM(
        'Belum Menikah',
        'Menikah',
        'Cerai',
        'Tidak Diketahui'
    ) DEFAULT 'Tidak Diketahui',
    pekerjaan VARCHAR(100),
    alergi TEXT,
    kontak_darurat VARCHAR(150),
    telepon_darurat VARCHAR(20),
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 5. DATA SUPPLIER OBAT / ALKES
-- ============================================================

CREATE TABLE supplier (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_supplier VARCHAR(30) UNIQUE NOT NULL,
    nama_supplier VARCHAR(200) NOT NULL,
    alamat TEXT,
    telepon VARCHAR(20),
    email VARCHAR(100),
    kontak_person VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. KATEGORI OBAT
-- ============================================================

CREATE TABLE kategori_obat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kategori VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. SATUAN OBAT
-- ============================================================

CREATE TABLE satuan_obat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_satuan VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. DATA OBAT
-- ============================================================

CREATE TABLE obat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_obat VARCHAR(30) UNIQUE NOT NULL,
    nama_obat VARCHAR(200) NOT NULL,
    kategori_id INT,
    satuan_id INT,
    jenis_obat ENUM(
        'bebas',
        'bebas_terbatas',
        'keras',
        'herbal',
        'vitamin',
        'alat_kesehatan'
    ) DEFAULT 'bebas',

    bentuk_obat VARCHAR(50),
    harga_beli DECIMAL(12,2) DEFAULT 0,
    harga_jual DECIMAL(12,2) DEFAULT 0,

    stok INT DEFAULT 0,
    stok_minimum INT DEFAULT 0,

    tanggal_expired DATE,
    nomor_batch VARCHAR(100),

    deskripsi TEXT,

    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (kategori_id)
        REFERENCES kategori_obat(id)
        ON DELETE SET NULL,

    FOREIGN KEY (satuan_id)
        REFERENCES satuan_obat(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 9. PENDAFTARAN / KUNJUNGAN PASIEN
-- ============================================================

CREATE TABLE kunjungan (
    id INT AUTO_INCREMENT PRIMARY KEY,

    no_kunjungan VARCHAR(50) UNIQUE NOT NULL,

    pasien_id INT NOT NULL,
    poli_id INT,
    dokter_id INT,

    user_pendaftaran_id INT,

    tanggal_kunjungan DATE NOT NULL,
    jam_daftar TIME,

    jenis_kunjungan ENUM(
        'baru',
        'lama'
    ) DEFAULT 'lama',

    cara_bayar ENUM(
        'umum',
        'bpjs',
        'asuransi'
    ) DEFAULT 'umum',

    no_bpjs VARCHAR(50),

    keluhan_awal TEXT,

    status ENUM(
        'menunggu',
        'dipanggil',
        'diperiksa',
        'selesai',
        'batal'
    ) DEFAULT 'menunggu',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pasien_id)
        REFERENCES pasien(id)
        ON DELETE CASCADE,

    FOREIGN KEY (poli_id)
        REFERENCES poli(id)
        ON DELETE SET NULL,

    FOREIGN KEY (dokter_id)
        REFERENCES dokter(id)
        ON DELETE SET NULL,

    FOREIGN KEY (user_pendaftaran_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 10. REKAM MEDIS
-- ============================================================

CREATE TABLE rekam_medis (
    id INT AUTO_INCREMENT PRIMARY KEY,

    kunjungan_id INT NOT NULL,
    pasien_id INT NOT NULL,
    dokter_id INT,

    tanggal_pemeriksaan DATETIME DEFAULT CURRENT_TIMESTAMP,

    keluhan_utama TEXT,

    riwayat_penyakit TEXT,

    riwayat_alergi TEXT,

    tekanan_darah VARCHAR(20),
    suhu DECIMAL(4,1),
    berat_badan DECIMAL(6,2),
    tinggi_badan DECIMAL(6,2),
    denyut_nadi INT,
    frekuensi_nafas INT,

    pemeriksaan_fisik TEXT,

    hasil_pemeriksaan TEXT,

    diagnosis TEXT,

    tindakan TEXT,

    catatan_dokter TEXT,

    status ENUM(
        'draft',
        'selesai'
    ) DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (kunjungan_id)
        REFERENCES kunjungan(id)
        ON DELETE CASCADE,

    FOREIGN KEY (pasien_id)
        REFERENCES pasien(id)
        ON DELETE CASCADE,

    FOREIGN KEY (dokter_id)
        REFERENCES dokter(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 11. DIAGNOSA
-- ============================================================

CREATE TABLE diagnosa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_icd VARCHAR(20),
    nama_diagnosa VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 12. DETAIL DIAGNOSA REKAM MEDIS
-- ============================================================

CREATE TABLE rekam_medis_diagnosa (
    id INT AUTO_INCREMENT PRIMARY KEY,

    rekam_medis_id INT NOT NULL,
    diagnosa_id INT NOT NULL,

    tipe ENUM(
        'utama',
        'sekunder'
    ) DEFAULT 'utama',

    FOREIGN KEY (rekam_medis_id)
        REFERENCES rekam_medis(id)
        ON DELETE CASCADE,

    FOREIGN KEY (diagnosa_id)
        REFERENCES diagnosa(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 13. MASTER TINDAKAN
-- ============================================================

CREATE TABLE tindakan (
    id INT AUTO_INCREMENT PRIMARY KEY,

    kode_tindakan VARCHAR(30) UNIQUE NOT NULL,
    nama_tindakan VARCHAR(200) NOT NULL,

    kategori VARCHAR(100),

    tarif DECIMAL(12,2) DEFAULT 0,

    deskripsi TEXT,

    status ENUM(
        'aktif',
        'nonaktif'
    ) DEFAULT 'aktif',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 14. TINDAKAN PADA PASIEN
-- ============================================================

CREATE TABLE detail_tindakan (
    id INT AUTO_INCREMENT PRIMARY KEY,

    rekam_medis_id INT NOT NULL,
    tindakan_id INT NOT NULL,

    jumlah INT DEFAULT 1,

    harga_satuan DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,

    catatan TEXT,

    FOREIGN KEY (rekam_medis_id)
        REFERENCES rekam_medis(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tindakan_id)
        REFERENCES tindakan(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 15. RESEP
-- ============================================================

CREATE TABLE resep (
    id INT AUTO_INCREMENT PRIMARY KEY,

    no_resep VARCHAR(50) UNIQUE NOT NULL,

    rekam_medis_id INT NOT NULL,
    pasien_id INT NOT NULL,
    dokter_id INT,

    tanggal_resep DATETIME DEFAULT CURRENT_TIMESTAMP,

    status ENUM(
        'menunggu',
        'diproses',
        'selesai',
        'batal'
    ) DEFAULT 'menunggu',

    catatan TEXT,

    FOREIGN KEY (rekam_medis_id)
        REFERENCES rekam_medis(id)
        ON DELETE CASCADE,

    FOREIGN KEY (pasien_id)
        REFERENCES pasien(id)
        ON DELETE CASCADE,

    FOREIGN KEY (dokter_id)
        REFERENCES dokter(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 16. DETAIL RESEP
-- ============================================================

CREATE TABLE detail_resep (
    id INT AUTO_INCREMENT PRIMARY KEY,

    resep_id INT NOT NULL,
    obat_id INT NOT NULL,

    jumlah INT NOT NULL,

    dosis VARCHAR(100),
    frekuensi VARCHAR(100),
    aturan_pakai VARCHAR(255),
    waktu_pakai VARCHAR(100),

    harga_satuan DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,

    catatan TEXT,

    FOREIGN KEY (resep_id)
        REFERENCES resep(id)
        ON DELETE CASCADE,

    FOREIGN KEY (obat_id)
        REFERENCES obat(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 17. PEMBELIAN OBAT
-- ============================================================

CREATE TABLE pembelian_obat (
    id INT AUTO_INCREMENT PRIMARY KEY,

    no_faktur VARCHAR(50) UNIQUE NOT NULL,

    supplier_id INT,
    user_id INT,

    tanggal_pembelian DATE NOT NULL,

    subtotal DECIMAL(12,2) DEFAULT 0,
    diskon DECIMAL(12,2) DEFAULT 0,
    pajak DECIMAL(12,2) DEFAULT 0,
    total_harga DECIMAL(12,2) DEFAULT 0,

    status ENUM(
        'pending',
        'completed',
        'batal'
    ) DEFAULT 'pending',

    catatan TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
        REFERENCES supplier(id)
        ON DELETE SET NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 18. DETAIL PEMBELIAN OBAT
-- ============================================================

CREATE TABLE detail_pembelian_obat (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pembelian_id INT NOT NULL,
    obat_id INT NOT NULL,

    jumlah INT NOT NULL,

    harga_satuan DECIMAL(12,2) NOT NULL,

    nomor_batch VARCHAR(100),
    tanggal_expired DATE,

    subtotal DECIMAL(12,2) NOT NULL,

    FOREIGN KEY (pembelian_id)
        REFERENCES pembelian_obat(id)
        ON DELETE CASCADE,

    FOREIGN KEY (obat_id)
        REFERENCES obat(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 19. PEMBAYARAN
-- ============================================================

CREATE TABLE pembayaran (
    id INT AUTO_INCREMENT PRIMARY KEY,

    no_pembayaran VARCHAR(50) UNIQUE NOT NULL,

    kunjungan_id INT NOT NULL,
    pasien_id INT NOT NULL,

    user_id INT,

    tanggal_pembayaran DATETIME DEFAULT CURRENT_TIMESTAMP,

    biaya_pendaftaran DECIMAL(12,2) DEFAULT 0,
    biaya_konsultasi DECIMAL(12,2) DEFAULT 0,
    biaya_tindakan DECIMAL(12,2) DEFAULT 0,
    biaya_obat DECIMAL(12,2) DEFAULT 0,

    diskon DECIMAL(12,2) DEFAULT 0,
    pajak DECIMAL(12,2) DEFAULT 0,

    total_tagihan DECIMAL(12,2) DEFAULT 0,
    total_bayar DECIMAL(12,2) DEFAULT 0,
    kembalian DECIMAL(12,2) DEFAULT 0,

    metode_pembayaran ENUM(
        'tunai',
        'debit',
        'kredit',
        'transfer',
        'qris',
        'bpjs',
        'asuransi'
    ) DEFAULT 'tunai',

    status ENUM(
        'belum_bayar',
        'sebagian',
        'lunas',
        'batal'
    ) DEFAULT 'belum_bayar',

    catatan TEXT,

    FOREIGN KEY (kunjungan_id)
        REFERENCES kunjungan(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (pasien_id)
        REFERENCES pasien(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 20. DETAIL PEMBAYARAN
-- ============================================================

CREATE TABLE detail_pembayaran (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pembayaran_id INT NOT NULL,

    jenis ENUM(
        'pendaftaran',
        'konsultasi',
        'tindakan',
        'obat',
        'lainnya'
    ) NOT NULL,

    referensi_id INT NULL,

    keterangan VARCHAR(255),

    jumlah INT DEFAULT 1,

    harga_satuan DECIMAL(12,2) DEFAULT 0,

    subtotal DECIMAL(12,2) DEFAULT 0,

    FOREIGN KEY (pembayaran_id)
        REFERENCES pembayaran(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 21. LOG STOK OBAT
-- ============================================================

CREATE TABLE stok_obat_log (
    id INT AUTO_INCREMENT PRIMARY KEY,

    obat_id INT NOT NULL,

    user_id INT,

    jenis ENUM(
        'masuk',
        'keluar',
        'penyesuaian',
        'retur'
    ) NOT NULL,

    jumlah INT NOT NULL,

    stok_sebelum INT NOT NULL,
    stok_sesudah INT NOT NULL,

    referensi VARCHAR(100),

    keterangan TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (obat_id)
        REFERENCES obat(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 22. JADWAL DOKTER
-- ============================================================

CREATE TABLE jadwal_dokter (
    id INT AUTO_INCREMENT PRIMARY KEY,

    dokter_id INT NOT NULL,
    poli_id INT NOT NULL,

    hari ENUM(
        'Senin',
        'Selasa',
        'Rabu',
        'Kamis',
        'Jumat',
        'Sabtu',
        'Minggu'
    ) NOT NULL,

    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,

    kuota_pasien INT DEFAULT 0,

    status ENUM(
        'aktif',
        'nonaktif'
    ) DEFAULT 'aktif',

    FOREIGN KEY (dokter_id)
        REFERENCES dokter(id)
        ON DELETE CASCADE,

    FOREIGN KEY (poli_id)
        REFERENCES poli(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 23. PENGATURAN KLINIK
-- ============================================================

CREATE TABLE pengaturan (
    id INT AUTO_INCREMENT PRIMARY KEY,

    kunci VARCHAR(100) UNIQUE NOT NULL,

    nilai TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- DATA AWAL USER
-- Password contoh: password
-- Gunakan password_hash() dari aplikasi untuk produksi.
-- ============================================================

INSERT INTO users
(username, password, nama_lengkap, email, role)
VALUES

(
    'admin',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Administrator',
    'admin@klinik.com',
    'admin'
),

(
    'dokter1',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Dokter Klinik',
    'dokter@klinik.com',
    'dokter'
),

(
    'pendaftaran1',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Petugas Pendaftaran',
    'pendaftaran@klinik.com',
    'pendaftaran'
),

(
    'kasir1',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Kasir Klinik',
    'kasir@klinik.com',
    'kasir'
),

(
    'apoteker1',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Apoteker',
    'apoteker@klinik.com',
    'apoteker'
);


-- ============================================================
-- DATA AWAL POLI
-- ============================================================

INSERT INTO poli
(kode_poli, nama_poli, deskripsi, tarif_pendaftaran)
VALUES

(
    'POLI-UMUM',
    'Poli Umum',
    'Pelayanan kesehatan umum',
    10000
),

(
    'POLI-GIGI',
    'Poli Gigi',
    'Pelayanan kesehatan gigi dan mulut',
    15000
),

(
    'POLI-ANAK',
    'Poli Anak',
    'Pelayanan kesehatan anak',
    15000
);


-- ============================================================
-- DATA AWAL KATEGORI OBAT
-- ============================================================

INSERT INTO kategori_obat
(nama_kategori, deskripsi)
VALUES

(
    'Obat Bebas',
    'Obat yang dapat diperoleh tanpa resep dokter'
),

(
    'Obat Bebas Terbatas',
    'Obat yang penggunaannya memiliki batasan tertentu'
),

(
    'Obat Keras',
    'Obat yang penggunaannya berdasarkan resep dokter'
),

(
    'Vitamin',
    'Vitamin dan suplemen'
),

(
    'Herbal',
    'Produk kesehatan berbahan herbal'
),

(
    'Alat Kesehatan',
    'Peralatan kesehatan'
);


-- ============================================================
-- DATA SATUAN
-- ============================================================

INSERT INTO satuan_obat
(nama_satuan)
VALUES

('Tablet'),
('Kapsul'),
('Botol'),
('Tube'),
('Sachet'),
('Strip'),
('Ampul'),
('Pcs');


-- ============================================================
-- DATA DIAGNOSA CONTOH
-- ============================================================

INSERT INTO diagnosa
(kode_icd, nama_diagnosa, deskripsi)
VALUES

('J00', 'Common Cold', 'Infeksi saluran pernapasan atas'),

('R50.9', 'Demam', 'Demam tidak spesifik'),

('I10', 'Hipertensi Esensial', 'Tekanan darah tinggi'),

('E11', 'Diabetes Mellitus Tipe 2',
 'Diabetes mellitus tipe 2');


-- ============================================================
-- DATA TINDAKAN CONTOH
-- ============================================================

INSERT INTO tindakan
(kode_tindakan, nama_tindakan, kategori, tarif)
VALUES

(
    'TDK-001',
    'Konsultasi Dokter',
    'Konsultasi',
    50000
),

(
    'TDK-002',
    'Pemeriksaan Tekanan Darah',
    'Pemeriksaan',
    10000
),

(
    'TDK-003',
    'Pemeriksaan Gula Darah',
    'Laboratorium',
    25000
);


-- ============================================================
-- PENGATURAN DEFAULT
-- ============================================================

INSERT INTO pengaturan
(kunci, nilai)
VALUES

('nama_klinik', 'Klinik Sehat'),

('alamat_klinik', ''),

('telepon_klinik', ''),

('email_klinik', ''),

('nama_dokter_penanggung_jawab', ''),

('nomor_izin_klinik', ''),

('ppn_persen', '0'),

('footer_kwitansi',
 'Terima kasih telah menggunakan layanan Klinik Sehat'),

('warna_primary', '#667eea'),

('warna_secondary', '#764ba2'),

('warna_sidebar', '#2c3e50'),

('warna_success', '#27ae60'),

('warna_danger', '#e74c3c'),

('warna_warning', '#f39c12'),

('warna_info', '#3498db');