using System;
using System.Collections.Generic;

namespace SimKlinik.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string? Password { get; set; }
    public string NamaLengkap { get; set; } = "";
    public string? Email { get; set; }
    public string Role { get; set; } = "admin";
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class Poli
{
    public int Id { get; set; }
    public string KodePoli { get; set; } = "";
    public string NamaPoli { get; set; } = "";
    public string? Deskripsi { get; set; }
    public decimal TarifPendaftaran { get; set; }
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
}

public class Dokter
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string KodeDokter { get; set; } = "";
    public string NamaDokter { get; set; } = "";
    public string? NoStr { get; set; }
    public string? NoSip { get; set; }
    public string? Spesialisasi { get; set; }
    public string? JenisKelamin { get; set; }
    public string? TempatLahir { get; set; }
    public DateTime? TanggalLahir { get; set; }
    public string? Alamat { get; set; }
    public string? Telepon { get; set; }
    public string? Email { get; set; }
    public decimal TarifKonsultasi { get; set; }
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
    public string? NamaUser { get; set; }
    public string? NamaPoli { get; set; }
}

public class JadwalDokter
{
    public int Id { get; set; }
    public int DokterId { get; set; }
    public int PoliId { get; set; }
    public string Hari { get; set; } = "";
    public TimeSpan JamMulai { get; set; }
    public TimeSpan JamSelesai { get; set; }
    public int KuotaPasien { get; set; } = 30;
    public string Status { get; set; } = "aktif";
    public string? NamaDokter { get; set; }
    public string? Spesialisasi { get; set; }
    public string? NamaPoli { get; set; }
}

public class Pasien
{
    public int Id { get; set; }
    public string NoRm { get; set; } = "";
    public string? Nik { get; set; }
    public string NamaPasien { get; set; } = "";
    public string JenisKelamin { get; set; } = "L";
    public string? TempatLahir { get; set; }
    public DateTime? TanggalLahir { get; set; }
    public string? Alamat { get; set; }
    public string? Telepon { get; set; }
    public string? Email { get; set; }
    public string? GolonganDarah { get; set; } = "Tidak Diketahui";
    public string? StatusPernikahan { get; set; } = "Tidak Diketahui";
    public string? Pekerjaan { get; set; }
    public string? Alergi { get; set; }
    public string? KontakDarurat { get; set; }
    public string? TeleponDarurat { get; set; }
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class Supplier
{
    public int Id { get; set; }
    public string KodeSupplier { get; set; } = "";
    public string NamaSupplier { get; set; } = "";
    public string? Alamat { get; set; }
    public string? Telepon { get; set; }
    public string? Email { get; set; }
    public string? KontakPerson { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class KategoriObat
{
    public int Id { get; set; }
    public string NamaKategori { get; set; } = "";
    public string? Deskripsi { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class SatuanObat
{
    public int Id { get; set; }
    public string NamaSatuan { get; set; } = "";
    public DateTime? CreatedAt { get; set; }
}

public class Obat
{
    public int Id { get; set; }
    public string KodeObat { get; set; } = "";
    public string NamaObat { get; set; } = "";
    public int? KategoriId { get; set; }
    public int? SatuanId { get; set; }
    public string JenisObat { get; set; } = "bebas";
    public string? BentukObat { get; set; }
    public decimal HargaBeli { get; set; }
    public decimal HargaJual { get; set; }
    public int Stok { get; set; }
    public int StokMinimum { get; set; }
    public DateTime? TanggalExpired { get; set; }
    public string? NomorBatch { get; set; }
    public string? Deskripsi { get; set; }
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Join properties
    public string? NamaKategori { get; set; }
    public string? NamaSatuan { get; set; }
}

public class Tindakan
{
    public int Id { get; set; }
    public string KodeTindakan { get; set; } = "";
    public string NamaTindakan { get; set; } = "";
    public string? Kategori { get; set; }
    public decimal Tarif { get; set; }
    public string? Deskripsi { get; set; }
    public string Status { get; set; } = "aktif";
    public DateTime? CreatedAt { get; set; }
}

public class Diagnosa
{
    public int Id { get; set; }
    public string? KodeIcd { get; set; }
    public string NamaDiagnosa { get; set; } = "";
    public string? Deskripsi { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class Kunjungan
{
    public int Id { get; set; }
    public string NoKunjungan { get; set; } = "";
    public int PasienId { get; set; }
    public int? PoliId { get; set; }
    public int? DokterId { get; set; }
    public int? UserPendaftaranId { get; set; }
    public DateTime TanggalKunjungan { get; set; }
    public TimeSpan? JamDaftar { get; set; }
    public string JenisKunjungan { get; set; } = "lama";
    public string CaraBayar { get; set; } = "umum";
    public string? NoBpjs { get; set; }
    public string? KeluhanAwal { get; set; }
    public string Status { get; set; } = "menunggu";
    public DateTime? CreatedAt { get; set; }

    // Joins
    public string? NamaPasien { get; set; }
    public string? NoRm { get; set; }
    public string? NamaPoli { get; set; }
    public string? NamaDokter { get; set; }
    public decimal TarifPendaftaran { get; set; }
    public decimal TarifKonsultasi { get; set; }
}

public class RekamMedis
{
    public int Id { get; set; }
    public int KunjunganId { get; set; }
    public int PasienId { get; set; }
    public int? DokterId { get; set; }
    public DateTime? TanggalPemeriksaan { get; set; }
    public string? KeluhanUtama { get; set; }
    public string? RiwayatPenyakit { get; set; }
    public string? RiwayatAlergi { get; set; }
    public string? TekananDarah { get; set; }
    public decimal? Suhu { get; set; }
    public decimal? BeratBadan { get; set; }
    public decimal? TinggiBadan { get; set; }
    public int? DenyutNadi { get; set; }
    public int? FrekuensiNafas { get; set; }
    public string? PemeriksaanFisik { get; set; }
    public string? HasilPemeriksaan { get; set; }
    public string? Diagnosis { get; set; }
    public string? Tindakan { get; set; }
    public string? CatatanDokter { get; set; }
    public string Status { get; set; } = "draft";
    public DateTime? CreatedAt { get; set; }

    // Joins
    public string? NoKunjungan { get; set; }
    public string? NamaPasien { get; set; }
    public string? NoRm { get; set; }
    public string? NamaDokter { get; set; }
    public List<DetailTindakanDto> ListTindakan { get; set; } = new();
    public List<int> DiagnosaIds { get; set; } = new();
}

public class DetailTindakanDto
{
    public int TindakanId { get; set; }
    public string? NamaTindakan { get; set; }
    public int Jumlah { get; set; } = 1;
    public decimal HargaSatuan { get; set; }
    public decimal Subtotal { get; set; }
    public string? Catatan { get; set; }
}

public class Resep
{
    public int Id { get; set; }
    public string NoResep { get; set; } = "";
    public int RekamMedisId { get; set; }
    public int PasienId { get; set; }
    public int? DokterId { get; set; }
    public DateTime? TanggalResep { get; set; }
    public string Status { get; set; } = "menunggu";
    public string? Catatan { get; set; }

    // Joins
    public string? NoKunjungan { get; set; }
    public string? NamaPasien { get; set; }
    public string? NoRm { get; set; }
    public string? NamaDokter { get; set; }
    public decimal TotalBiayaObat { get; set; }
    public List<DetailResepDto> Items { get; set; } = new();
}

public class DetailResepDto
{
    public int Id { get; set; }
    public int ResepId { get; set; }
    public int ObatId { get; set; }
    public string? NamaObat { get; set; }
    public int Jumlah { get; set; }
    public string? Dosis { get; set; }
    public string? Frekuensi { get; set; }
    public string? AturanPakai { get; set; }
    public string? WaktuPakai { get; set; }
    public decimal HargaSatuan { get; set; }
    public decimal Subtotal { get; set; }
    public string? Catatan { get; set; }
}

public class Pembayaran
{
    public int Id { get; set; }
    public string NoPembayaran { get; set; } = "";
    public int KunjunganId { get; set; }
    public int PasienId { get; set; }
    public int? UserId { get; set; }
    public DateTime? TanggalPembayaran { get; set; }
    public decimal BiayaPendaftaran { get; set; }
    public decimal BiayaKonsultasi { get; set; }
    public decimal BiayaTindakan { get; set; }
    public decimal BiayaObat { get; set; }
    public decimal Diskon { get; set; }
    public decimal Pajak { get; set; }
    public decimal TotalTagihan { get; set; }
    public decimal TotalBayar { get; set; }
    public decimal Kembalian { get; set; }
    public string MetodePembayaran { get; set; } = "tunai";
    public string Status { get; set; } = "belum_bayar";
    public string? Catatan { get; set; }

    // Joins
    public string? NoKunjungan { get; set; }
    public string? NamaPasien { get; set; }
    public string? NoRm { get; set; }
    public string? NamaKasir { get; set; }
    public List<DetailPembayaranDto> Items { get; set; } = new();
}

public class DetailPembayaranDto
{
    public int Id { get; set; }
    public int PembayaranId { get; set; }
    public string Jenis { get; set; } = "";
    public int? ReferensiId { get; set; }
    public string? Keterangan { get; set; }
    public int Jumlah { get; set; } = 1;
    public decimal HargaSatuan { get; set; }
    public decimal Subtotal { get; set; }
}

public class PembelianObat
{
    public int Id { get; set; }
    public string NoFaktur { get; set; } = "";
    public int? SupplierId { get; set; }
    public int? UserId { get; set; }
    public DateTime TanggalPembelian { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Diskon { get; set; }
    public decimal Pajak { get; set; }
    public decimal TotalHarga { get; set; }
    public string Status { get; set; } = "pending";
    public string? Catatan { get; set; }
    public DateTime? CreatedAt { get; set; }

    // Joins
    public string? NamaSupplier { get; set; }
    public string? NamaPetugas { get; set; }
    public List<DetailPembelianDto> Items { get; set; } = new();
}

public class DetailPembelianDto
{
    public int ObatId { get; set; }
    public string? NamaObat { get; set; }
    public int Jumlah { get; set; }
    public decimal HargaSatuan { get; set; }
    public string? NomorBatch { get; set; }
    public DateTime? TanggalExpired { get; set; }
    public decimal Subtotal { get; set; }
}

public class DashboardStatsDto
{
    public int TotalPasien { get; set; }
    public int TotalDokter { get; set; }
    public int KunjunganHariIni { get; set; }
    public int AntrianMenunggu { get; set; }
    public decimal PendapatanHariIni { get; set; }
    public decimal PendapatanBulanIni { get; set; }
    public int ObatKritis { get; set; }
    public int ResepHariIni { get; set; }
    public List<KunjunganGrafikDto> GrafikKunjungan { get; set; } = new();
    public List<PenyakitTerbanyakDto> TopPenyakit { get; set; } = new();
    public List<Kunjungan> AntrianAktif { get; set; } = new();
    public List<Obat> ObatMenipisList { get; set; } = new();
}

public class KunjunganGrafikDto
{
    public string Tanggal { get; set; } = "";
    public int Jumlah { get; set; }
}

public class PenyakitTerbanyakDto
{
    public string KodeIcd { get; set; } = "";
    public string NamaDiagnosa { get; set; } = "";
    public int Jumlah { get; set; }
}

public class LoginRequest
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public class OnlineBookingRequest
{
    public string NamaPasien { get; set; } = "";
    public string? Nik { get; set; }
    public string JenisKelamin { get; set; } = "L";
    public string? Telepon { get; set; }
    public string? Alamat { get; set; }
    public int PoliId { get; set; }
    public int? DokterId { get; set; }
    public DateTime TanggalKunjungan { get; set; }
    public string CaraBayar { get; set; } = "umum";
    public string? NoBpjs { get; set; }
    public string? Keluhan { get; set; }
}

public class Pengaturan
{
    public int Id { get; set; }
    public string Kunci { get; set; } = "";
    public string? Nilai { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

