using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PublicController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet("info")]
    public async Task<ActionResult<ApiResponse<object>>> GetClinicPublicInfo()
    {
        using var conn = _db.CreateConnection();

        // 1. Settings
        var settingsList = await conn.QueryAsync<Pengaturan>("SELECT * FROM pengaturan");
        var settings = settingsList.ToDictionary(x => x.Kunci, x => x.Nilai ?? "");

        // 2. Active Poliklinik
        var poli = await conn.QueryAsync<Poli>("SELECT id, kode_poli, nama_poli, deskripsi, tarif_pendaftaran FROM poli WHERE status = 'aktif' ORDER BY nama_poli ASC");

        // 3. Active Doctors with Schedules
        var dokter = await conn.QueryAsync<Dokter>("SELECT id, kode_dokter, nama_dokter, spesialisasi, tarif_konsultasi FROM dokter WHERE status = 'aktif' ORDER BY nama_dokter ASC");

        var jadwal = await conn.QueryAsync<JadwalDokter>(@"
            SELECT jd.*, d.nama_dokter AS NamaDokter, d.spesialisasi AS Spesialisasi, p.nama_poli AS NamaPoli
            FROM jadwal_dokter jd
            JOIN dokter d ON jd.dokter_id = d.id
            JOIN poli p ON jd.poli_id = p.id
            WHERE jd.status = 'aktif'
            ORDER BY FIELD(jd.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')");

        // 4. Quick stats
        var totalPasien = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pasien WHERE status = 'aktif'");
        var totalDokter = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dokter WHERE status = 'aktif'");
        var totalPoli = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM poli WHERE status = 'aktif'");

        return Ok(ApiResponse<object>.Ok(new
        {
            settings,
            poli,
            dokter,
            jadwal,
            stats = new { totalPasien, totalDokter, totalPoli }
        }, "Informasi publik klinik berhasil dimuat"));
    }

    [HttpGet("antrian")]
    public async Task<ActionResult<ApiResponse<object>>> GetLiveAntrian()
    {
        using var conn = _db.CreateConnection();

        // List antrian per poli hari ini
        const string sql = @"
            SELECT 
                pol.id AS PoliId,
                pol.nama_poli AS NamaPoli,
                (SELECT no_kunjungan FROM kunjungan WHERE poli_id = pol.id AND tanggal_kunjungan = CURRENT_DATE() AND status = 'diperiksa' ORDER BY id DESC LIMIT 1) AS SedangDiperiksa,
                (SELECT no_kunjungan FROM kunjungan WHERE poli_id = pol.id AND tanggal_kunjungan = CURRENT_DATE() AND status = 'dipanggil' ORDER BY id DESC LIMIT 1) AS SedangDipanggil,
                (SELECT COUNT(*) FROM kunjungan WHERE poli_id = pol.id AND tanggal_kunjungan = CURRENT_DATE() AND status IN ('menunggu', 'dipanggil')) AS SisaAntrian,
                (SELECT COUNT(*) FROM kunjungan WHERE poli_id = pol.id AND tanggal_kunjungan = CURRENT_DATE()) AS TotalHariIni
            FROM poli pol
            WHERE pol.status = 'aktif'
            ORDER BY pol.nama_poli ASC";

        var antrian = await conn.QueryAsync(sql);
        return Ok(ApiResponse<object>.Ok(antrian, "Status antrian live"));
    }

    [HttpPost("booking")]
    public async Task<ActionResult<ApiResponse<object>>> OnlineBooking([FromBody] OnlineBookingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NamaPasien))
            return BadRequest(ApiResponse<object>.Fail("Nama pasien wajib diisi"));

        if (request.PoliId <= 0)
            return BadRequest(ApiResponse<object>.Fail("Pilihan poliklinik wajib dipilih"));

        using var conn = _db.CreateConnection();

        if (request.TanggalKunjungan == default || request.TanggalKunjungan < DateTime.Today)
        {
            request.TanggalKunjungan = DateTime.Today;
        }

        // Check if patient exists by NIK or Phone, otherwise create new patient
        int pasienId = 0;
        string noRm = "";

        if (!string.IsNullOrWhiteSpace(request.Nik))
        {
            var existing = await conn.QueryFirstOrDefaultAsync<Pasien>("SELECT id, no_rm FROM pasien WHERE nik = @Nik", new { request.Nik });
            if (existing != null)
            {
                pasienId = existing.Id;
                noRm = existing.NoRm;
            }
        }

        if (pasienId == 0 && !string.IsNullOrWhiteSpace(request.Telepon))
        {
            var existing = await conn.QueryFirstOrDefaultAsync<Pasien>("SELECT id, no_rm FROM pasien WHERE telepon = @Telepon", new { request.Telepon });
            if (existing != null)
            {
                pasienId = existing.Id;
                noRm = existing.NoRm;
            }
        }

        string jenisKunjungan = "lama";
        if (pasienId == 0)
        {
            jenisKunjungan = "baru";
            var year = DateTime.Now.Year;
            var maxId = await conn.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(id), 0) + 1 FROM pasien");
            noRm = $"RM-{year}-{maxId.ToString().PadLeft(4, '0')}";

            const string insertPasienSql = @"
                INSERT INTO pasien (no_rm, nik, nama_pasien, jenis_kelamin, telepon, alamat, status)
                VALUES (@NoRm, @Nik, @NamaPasien, @JenisKelamin, @Telepon, @Alamat, 'aktif');
                SELECT LAST_INSERT_ID();";

            pasienId = await conn.ExecuteScalarAsync<int>(insertPasienSql, new
            {
                NoRm = noRm,
                request.Nik,
                request.NamaPasien,
                request.JenisKelamin,
                request.Telepon,
                request.Alamat
            });
        }

        // Generate No Kunjungan
        var dateStr = request.TanggalKunjungan.ToString("yyyyMMdd");
        var dailyCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM kunjungan WHERE tanggal_kunjungan = @Tgl",
            new { Tgl = request.TanggalKunjungan.ToString("yyyy-MM-dd") });

        var noKunjungan = $"REG-{dateStr}-{(dailyCount + 1).ToString().PadLeft(3, '0')}";
        var noAntrianUrut = dailyCount + 1;

        const string insertKunjunganSql = @"
            INSERT INTO kunjungan (
                no_kunjungan, pasien_id, poli_id, dokter_id,
                tanggal_kunjungan, jam_daftar, jenis_kunjungan, cara_bayar,
                no_bpjs, keluhan_awal, status
            ) VALUES (
                @NoKunjungan, @PasienId, @PoliId, @DokterId,
                @TanggalKunjungan, CURTIME(), @JenisKunjungan, @CaraBayar,
                @NoBpjs, @Keluhan, 'menunggu'
            );
            SELECT LAST_INSERT_ID();";

        var kunjunganId = await conn.ExecuteScalarAsync<int>(insertKunjunganSql, new
        {
            NoKunjungan = noKunjungan,
            PasienId = pasienId,
            request.PoliId,
            request.DokterId,
            request.TanggalKunjungan,
            JenisKunjungan = jenisKunjungan,
            request.CaraBayar,
            request.NoBpjs,
            request.Keluhan
        });

        // Ambil nama poli
        var namaPoli = await conn.ExecuteScalarAsync<string>("SELECT nama_poli FROM poli WHERE id = @PoliId", new { request.PoliId });

        return Ok(ApiResponse<object>.Ok(new
        {
            kunjunganId,
            noKunjungan,
            noAntrianUrut,
            noRm,
            namaPasien = request.NamaPasien,
            namaPoli,
            tanggal = request.TanggalKunjungan.ToString("yyyy-MM-dd"),
            status = "menunggu",
            pesan = "Pendaftaran online berhasil! Silakan simpan nomor kunjungan Anda."
        }, "Pendaftaran antrian online berhasil"));
    }
}
