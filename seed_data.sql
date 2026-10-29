USE klinik_db;

-- 1. SEED DOKTER
INSERT INTO dokter (id, user_id, kode_dokter, nama_dokter, no_str, no_sip, spesialisasi, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, telepon, email, tarif_konsultasi, status)
VALUES
(1, 2, 'DOC-001', 'dr. Budi Santoso, Sp.PD', 'STR-3301-1980-001', 'SIP-503/001/DKS/2022', 'Spesialis Penyakit Dalam', 'L', 'Jakarta', '1980-05-14', 'Jl. Sudirman No. 45, Jakarta', '081234567801', 'dr.budi@klinik.com', 75000, 'aktif'),
(2, NULL, 'DOC-002', 'drg. Ratna Sari, Sp.KG', 'STR-3301-1985-002', 'SIP-503/002/DKS/2023', 'Dokter Gigi Spesialis Konservasi Gigi', 'P', 'Bandung', '1985-08-20', 'Jl. Mawar No. 10, Jakarta', '081234567802', 'drg.ratna@klinik.com', 60000, 'aktif'),
(3, NULL, 'DOC-003', 'dr. Hendra Wijaya, Sp.A', 'STR-3301-1988-003', 'SIP-503/003/DKS/2024', 'Spesialis Anak', 'L', 'Surabaya', '1988-11-03', 'Jl. Melati No. 88, Jakarta', '081234567803', 'dr.hendra@klinik.com', 70000, 'aktif')
ON DUPLICATE KEY UPDATE nama_dokter = VALUES(nama_dokter);

-- 2. SEED JADWAL DOKTER
INSERT INTO jadwal_dokter (dokter_id, poli_id, hari, jam_mulai, jam_selesai, kuota_pasien, status)
VALUES
(1, 1, 'Senin', '08:00:00', '14:00:00', 30, 'aktif'),
(1, 1, 'Selasa', '08:00:00', '14:00:00', 30, 'aktif'),
(1, 1, 'Rabu', '08:00:00', '14:00:00', 30, 'aktif'),
(1, 1, 'Kamis', '08:00:00', '14:00:00', 30, 'aktif'),
(1, 1, 'Jumat', '08:00:00', '14:00:00', 30, 'aktif'),
(2, 2, 'Senin', '09:00:00', '15:00:00', 20, 'aktif'),
(2, 2, 'Rabu', '09:00:00', '15:00:00', 20, 'aktif'),
(2, 2, 'Jumat', '09:00:00', '15:00:00', 20, 'aktif'),
(3, 3, 'Selasa', '10:00:00', '16:00:00', 25, 'aktif'),
(3, 3, 'Kamis', '10:00:00', '16:00:00', 25, 'aktif'),
(3, 3, 'Sabtu', '08:00:00', '13:00:00', 20, 'aktif')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 3. SEED PASIEN
INSERT INTO pasien (id, no_rm, nik, nama_pasien, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, telepon, email, golongan_darah, status_pernikahan, pekerjaan, alergi, kontak_darurat, telepon_darurat, status)
VALUES
(1, 'RM-2026-0001', '3201011504900001', 'Ahmad Fauzi', 'L', 'Jakarta', '1990-04-15', 'Jl. Flamboyan Blok B No. 12, Kebayoran', '081389001122', 'fauzi@email.com', 'O', 'Menikah', 'Karyawan Swasta', 'Tidak ada', 'Siti Rahma (Istri)', '081389001123', 'aktif'),
(2, 'RM-2026-0002', '3201012208950002', 'Siti Aminah', 'P', 'Bandung', '1995-08-22', 'Jl. Pinus Raya No. 4, Tebet', '085712345678', 'siti.aminah@email.com', 'A', 'Menikah', 'Guru', 'Alergi Dingin', 'Hasan Basri (Suami)', '085712345679', 'aktif'),
(3, 'RM-2026-0003', '3201011012160003', 'Ananda Rizky Pratama', 'L', 'Jakarta', '2016-12-10', 'Jl. Anggrek No. 7, Cilandak', '081298765432', 'ortu.rizky@email.com', 'B', 'Belum Menikah', 'Pelajar', 'Amoxicillin', 'Bambang (Ayah)', '081298765432', 'aktif'),
(4, 'RM-2026-0004', '3201010303720004', 'Bambang Suryono', 'L', 'Semarang', '1972-03-03', 'Jl. Kenanga Mas No. 18, Pasar Minggu', '081809123456', 'bambang.s@email.com', 'AB', 'Menikah', 'Wiraswasta', 'Tidak ada', 'Endang (Istri)', '081809123457', 'aktif'),
(5, 'RM-2026-0005', '3201011809830005', 'Dewi Lestari', 'P', 'Yogyakarta', '1983-09-18', 'Jl. Cempaka Putih No. 25, Kemang', '081567890123', 'dewi.lestari@email.com', 'O', 'Menikah', 'PNS', 'Seafood', 'Irwan (Suami)', '081567890124', 'aktif')
ON DUPLICATE KEY UPDATE nama_pasien = VALUES(nama_pasien);

-- 4. SEED SUPPLIER
INSERT INTO supplier (id, kode_supplier, nama_supplier, alamat, telepon, email, kontak_person)
VALUES
(1, 'SUP-001', 'PT. Kimia Farma Trading & Distribution', 'Jl. Budi Utomo No. 1, Jakarta Pusat', '021-3847321', 'sales@kftd.co.id', 'Bpk. Hendro'),
(2, 'SUP-002', 'PT. Kalbe Farma Tbk', 'Kawasan Industri Delta Silicon, Cikarang', '021-8990123', 'order@kalbe.co.id', 'Ibu Maya'),
(3, 'SUP-003', 'PT. Mensa Binasukses', 'Jl. Pulokambing II No. 9, Jakarta Timur', '021-4609000', 'cs@mbs.co.id', 'Bpk. Aris')
ON DUPLICATE KEY UPDATE nama_supplier = VALUES(nama_supplier);

-- 5. SEED DATA OBAT
INSERT INTO obat (id, kode_obat, nama_obat, kategori_id, satuan_id, jenis_obat, bentuk_obat, harga_beli, harga_jual, stok, stok_minimum, tanggal_expired, nomor_batch, deskripsi, status)
VALUES
(1, 'OBT-001', 'Paracetamol 500mg', 1, 1, 'bebas', 'Tablet', 450, 1000, 320, 50, '2028-12-31', 'BATCH-PCT-202601', 'Pereda nyeri dan demam', 'aktif'),
(2, 'OBT-002', 'Amoxicillin 500mg', 3, 2, 'keras', 'Kapsul', 750, 1500, 180, 40, '2028-06-30', 'BATCH-AMX-202602', 'Antibiotik spektrum luas', 'aktif'),
(3, 'OBT-003', 'Antasida Doen', 1, 1, 'bebas', 'Tablet Kunyah', 350, 800, 150, 30, '2028-09-30', 'BATCH-ANT-202603', 'Mengurangi asam lambung dan maag', 'aktif'),
(4, 'OBT-004', 'Cetirizine 10mg', 2, 1, 'bebas_terbatas', 'Tablet', 650, 1200, 12, 20, '2027-11-20', 'BATCH-CTZ-202604', 'Antihistamin untuk alergi dan gatal (PERINGATAN: STOK MENIPIS)', 'aktif'),
(5, 'OBT-005', 'Vitamin C 500mg', 4, 1, 'vitamin', 'Tablet', 500, 1000, 450, 50, '2029-01-15', 'BATCH-VTC-202605', 'Suplemen daya tahan tubuh', 'aktif'),
(6, 'OBT-006', 'Betadine Salep Antiseptik 10g', 2, 4, 'bebas_terbatas', 'Salep / Tube', 12000, 18500, 40, 10, '2028-05-10', 'BATCH-BTD-202606', 'Antiseptik luka luar', 'aktif'),
(7, 'OBT-007', 'Ibuprofen 400mg', 2, 1, 'bebas_terbatas', 'Tablet', 600, 1200, 8, 25, '2027-10-15', 'BATCH-IBU-202607', 'Antiinflamasi dan pereda nyeri (PERINGATAN: STOK MENIPIS)', 'aktif'),
(8, 'OBT-008', 'Amlodipine 5mg', 3, 1, 'keras', 'Tablet', 900, 1800, 95, 30, '2028-08-20', 'BATCH-AML-202608', 'Obat antihipertensi golongan CCB', 'aktif'),
(9, 'OBT-009', 'Metformin 500mg', 3, 1, 'keras', 'Tablet', 800, 1600, 120, 30, '2028-07-25', 'BATCH-MET-202609', 'Obat pengendali gula darah diabetes', 'aktif'),
(10, 'OBT-010', 'Masker Medis 3 Ply (Box)', 6, 8, 'alat_kesehatan', 'Box 50 Pcs', 25000, 35000, 60, 15, '2029-12-31', 'BATCH-MSK-202610', 'Masker bedah medis 3 lapis', 'aktif')
ON DUPLICATE KEY UPDATE nama_obat = VALUES(nama_obat);

-- 6. TAMBAHAN TINDAKAN
INSERT INTO tindakan (id, kode_tindakan, nama_tindakan, kategori, tarif, deskripsi, status)
VALUES
(4, 'TDK-004', 'Injeksi / Suntik Obat', 'Tindakan Medis', 30000, 'Pemberian obat via injeksi intramuskular/intravena', 'aktif'),
(5, 'TDK-005', 'Pembersihan Karang Gigi (Scaling)', 'Gigi & Mulut', 150000, 'Pembersihan plak dan karang gigi lengkap', 'aktif'),
(6, 'TDK-006', 'Penambalan Gigi Komposit', 'Gigi & Mulut', 180000, 'Penambalan gigi berlubang estetis', 'aktif'),
(7, 'TDK-007', 'Nebulisasi / Uap Asma', 'Tindakan Medis', 60000, 'Terapi inhalasi untuk pernapasan dan asma', 'aktif'),
(8, 'TDK-008', 'Pemasangan Balut & Perban Luka', 'Bedah Minor', 45000, 'Pembersihan luka dan perban steril', 'aktif')
ON DUPLICATE KEY UPDATE nama_tindakan = VALUES(nama_tindakan);

-- 7. SEED KUNJUNGAN PASIEN (Antrian & Hari Ini)
INSERT INTO kunjungan (id, no_kunjungan, pasien_id, poli_id, dokter_id, user_pendaftaran_id, tanggal_kunjungan, jam_daftar, jenis_kunjungan, cara_bayar, no_bpjs, keluhan_awal, status)
VALUES
(1, 'REG-20261029-001', 1, 1, 1, 3, CURRENT_DATE(), '08:15:00', 'lama', 'umum', NULL, 'Demam sejak 2 hari lalu disertai flu dan batuk berdahak', 'selesai'),
(2, 'REG-20261029-002', 2, 2, 2, 3, CURRENT_DATE(), '08:30:00', 'lama', 'umum', NULL, 'Gigi geraham kanan bawah ngilu berdenyut saat makan manis dan dingin', 'selesai'),
(3, 'REG-20261029-003', 3, 3, 3, 3, CURRENT_DATE(), '09:00:00', 'baru', 'bpjs', '0001234567890', 'Anak batuk pilek dan demam panas naik turun', 'diperiksa'),
(4, 'REG-20261029-004', 4, 1, 1, 3, CURRENT_DATE(), '09:15:00', 'lama', 'umum', NULL, 'Kontrol tekanan darah rutin, kepala sering terasa berat di bagian tengkuk', 'dipanggil'),
(5, 'REG-20261029-005', 5, 1, 1, 3, CURRENT_DATE(), '09:40:00', 'lama', 'bpjs', '0009876543210', 'Pemeriksaan gula darah rutin dan refill obat bulanan', 'menunggu')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 8. SEED REKAM MEDIS UNTUK KUNJUNGAN 1 & 2
INSERT INTO rekam_medis (id, kunjungan_id, pasien_id, dokter_id, tanggal_pemeriksaan, keluhan_utama, riwayat_penyakit, riwayat_alergi, tekanan_darah, suhu, berat_badan, tinggi_badan, denyut_nadi, frekuensi_nafas, pemeriksaan_fisik, hasil_pemeriksaan, diagnosis, tindakan, catatan_dokter, status)
VALUES
(1, 1, 1, 1, NOW(), 'Demam 2 hari, hidung tersumbat, batuk dahak putih', 'Tidak ada riwayat asma', 'Tidak ada alergi', '120/80', 38.2, 68.0, 172.0, 84, 18, 'Faring hiperemis ringan, ronki -/-, wheezing -/-', 'Infeksi Saluran Pernapasan Akut / Common Cold', 'Common Cold (J00)', 'Konsultasi dan edukasi istirahat cukup & hidrasi', 'Banyak minum air hangat, kontrol jika demam > 3 hari', 'selesai'),
(2, 2, 2, 2, NOW(), 'Nyeri gigi geraham kanan bawah berdenyut', 'Riwayat sakit maag', 'Alergi dingin', '110/70', 36.8, 54.0, 160.0, 78, 16, 'Karies profunda pada gigi 46, vitalitas (+), perkusi (+)', 'Pulpitis reversible gigi 46', 'Pemeriksaan Gigi dan Aplikasi Tumpatan Sementara', 'Tumpatan sementara dan resep analgesik', 'Jadwalkan penambalan permanen minggu depan', 'selesai')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Rekam Medis Diagnosa
INSERT INTO rekam_medis_diagnosa (rekam_medis_id, diagnosa_id, tipe)
VALUES
(1, 1, 'utama'),
(1, 2, 'sekunder'),
(2, 2, 'utama')
ON DUPLICATE KEY UPDATE tipe = VALUES(tipe);

-- Detail Tindakan
INSERT INTO detail_tindakan (rekam_medis_id, tindakan_id, jumlah, harga_satuan, subtotal, catatan)
VALUES
(1, 1, 1, 50000, 50000, 'Konsultasi Dokter Umum Spesialis'),
(1, 2, 1, 10000, 10000, 'Cek Tekanan Darah Lengkap'),
(2, 1, 1, 50000, 50000, 'Konsultasi Dokter Gigi'),
(2, 6, 1, 180000, 180000, 'Perawatan Tumpatan Gigi')
ON DUPLICATE KEY UPDATE subtotal = VALUES(subtotal);

-- 9. SEED RESEP OBAT
INSERT INTO resep (id, no_resep, rekam_medis_id, pasien_id, dokter_id, tanggal_resep, status, catatan)
VALUES
(1, 'RSP-20261029-001', 1, 1, 1, NOW(), 'selesai', 'Minum obat sesudah makan. Habiskan vitamin.'),
(2, 'RSP-20261029-002', 2, 2, 2, NOW(), 'selesai', 'Diminum saat nyeri berdenyut.')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Detail Resep
INSERT INTO detail_resep (resep_id, obat_id, jumlah, dosis, frekuensi, aturan_pakai, waktu_pakai, harga_satuan, subtotal, catatan)
VALUES
(1, 1, 10, '500 mg', '3x1', '1 tablet sesudah makan', 'Pagi, Siang, Malam', 1000, 10000, 'Jika demam/nyeri'),
(1, 5, 10, '500 mg', '1x1', '1 tablet sesudah sarapan', 'Pagi', 1000, 10000, 'Vitamin C daya tahan'),
(2, 7, 10, '400 mg', '3x1', '1 tablet sesudah makan', 'Bila nyeri', 1200, 12000, 'Analgesik anti-inflamasi')
ON DUPLICATE KEY UPDATE subtotal = VALUES(subtotal);

-- 10. SEED PEMBAYARAN KASIR (BILLING)
INSERT INTO pembayaran (id, no_pembayaran, kunjungan_id, pasien_id, user_id, tanggal_pembayaran, biaya_pendaftaran, biaya_konsultasi, biaya_tindakan, biaya_obat, diskon, pajak, total_tagihan, total_bayar, kembalian, metode_pembayaran, status, catatan)
VALUES
(1, 'INV-20261029-001', 1, 1, 4, NOW(), 10000, 75000, 10000, 20000, 0, 0, 115000, 120000, 5000, 'tunai', 'lunas', 'Pembayaran Pelayanan Poli Umum Lunas'),
(2, 'INV-20261029-002', 2, 2, 4, NOW(), 15000, 60000, 180000, 120000, 0, 0, 375000, 375000, 0, 'qris', 'lunas', 'Pembayaran QRIS Poli Gigi Sukses')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Detail Pembayaran Kunjungan 1
INSERT INTO detail_pembayaran (pembayaran_id, jenis, referensi_id, keterangan, jumlah, harga_satuan, subtotal)
VALUES
(1, 'pendaftaran', 1, 'Biaya Pendaftaran Poli Umum', 1, 10000, 10000),
(1, 'konsultasi', 1, 'Konsultasi dr. Budi Santoso, Sp.PD', 1, 75000, 75000),
(1, 'tindakan', 2, 'Pemeriksaan Tekanan Darah', 1, 10000, 10000),
(1, 'obat', 1, 'Paracetamol 500mg (10 tab) & Vit C (10 tab)', 1, 20000, 20000),
(2, 'pendaftaran', 2, 'Biaya Pendaftaran Poli Gigi', 1, 15000, 15000),
(2, 'konsultasi', 2, 'Konsultasi drg. Ratna Sari', 1, 60000, 60000),
(2, 'tindakan', 6, 'Perawatan Tumpatan Gigi Komposit', 1, 180000, 180000),
(2, 'obat', 7, 'Ibuprofen 400mg (10 tab)', 1, 120000, 120000)
ON DUPLICATE KEY UPDATE subtotal = VALUES(subtotal);

-- 11. UPDATE PENGATURAN KLINIK LENGKAP
UPDATE pengaturan SET nilai = 'Klinik Pratama Sehat Mandiri' WHERE kunci = 'nama_klinik';
UPDATE pengaturan SET nilai = 'Jl. Gatot Subroto Kav. 42, Setiabudi, Jakarta Selatan' WHERE kunci = 'alamat_klinik';
UPDATE pengaturan SET nilai = '(021) 5296-1234 / WA: 0812-3456-7890' WHERE kunci = 'telepon_klinik';
UPDATE pengaturan SET nilai = 'layanan@sehatmandiri.co.id' WHERE kunci = 'email_klinik';
UPDATE pengaturan SET nilai = 'dr. Budi Santoso, Sp.PD' WHERE kunci = 'nama_dokter_penanggung_jawab';
UPDATE pengaturan SET nilai = '445/098/SIP.KLINIK/DPMPTSP/2023' WHERE kunci = 'nomor_izin_klinik';
