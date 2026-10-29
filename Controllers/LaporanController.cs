using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LaporanController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public LaporanController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet("kunjungan")]
    public async Task<ActionResult<ApiResponse<object>>> LaporanKunjungan(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] int? poliId,
        [FromQuery] string? status)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                k.*,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                p.jenis_kelamin AS JenisKelamin,
                pol.nama_poli AS NamaPoli,
                dok.nama_dokter AS NamaDokter
            FROM kunjungan k
            JOIN pasien p ON k.pasien_id = p.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(startDate))
            sql += " AND k.tanggal_kunjungan >= @StartDate";
        if (!string.IsNullOrWhiteSpace(endDate))
            sql += " AND k.tanggal_kunjungan <= @EndDate";
        if (poliId.HasValue && poliId.Value > 0)
            sql += " AND k.poli_id = @PoliId";
        if (!string.IsNullOrWhiteSpace(status))
            sql += " AND k.status = @Status";

        sql += " ORDER BY k.tanggal_kunjungan DESC, k.id DESC";

        var list = (await conn.QueryAsync(sql, new { StartDate = startDate, EndDate = endDate, PoliId = poliId, Status = status })).AsList();

        // Summary counts
        var total = list.Count;
        var selesai = list.Count(x => (string)x.status == "selesai");
        var menunggu = list.Count(x => (string)x.status == "menunggu" || (string)x.status == "dipanggil");

        return Ok(ApiResponse<object>.Ok(new
        {
            summary = new { total, selesai, menunggu },
            items = list
        }, "Laporan kunjungan berhasil dimuat"));
    }

    [HttpGet("pendapatan")]
    public async Task<ActionResult<ApiResponse<object>>> LaporanPendapatan(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] string? metode)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                p.*,
                k.no_kunjungan AS NoKunjungan,
                pas.nama_pasien AS NamaPasien,
                pas.no_rm AS NoRm,
                u.nama_lengkap AS NamaKasir
            FROM pembayaran p
            JOIN kunjungan k ON p.kunjungan_id = k.id
            JOIN pasien pas ON p.pasien_id = pas.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.status = 'lunas'";

        if (!string.IsNullOrWhiteSpace(startDate))
            sql += " AND DATE(p.tanggal_pembayaran) >= @StartDate";
        if (!string.IsNullOrWhiteSpace(endDate))
            sql += " AND DATE(p.tanggal_pembayaran) <= @EndDate";
        if (!string.IsNullOrWhiteSpace(metode))
            sql += " AND p.metode_pembayaran = @Metode";

        sql += " ORDER BY p.tanggal_pembayaran DESC";

        var list = (await conn.QueryAsync<Pembayaran>(sql, new { StartDate = startDate, EndDate = endDate, Metode = metode })).AsList();

        decimal totalPendapatan = list.Sum(x => x.TotalBayar);
        decimal totalPendaftaran = list.Sum(x => x.BiayaPendaftaran);
        decimal totalKonsultasi = list.Sum(x => x.BiayaKonsultasi);
        decimal totalTindakan = list.Sum(x => x.BiayaTindakan);
        decimal totalObat = list.Sum(x => x.BiayaObat);

        return Ok(ApiResponse<object>.Ok(new
        {
            summary = new
            {
                totalPendapatan,
                totalPendaftaran,
                totalKonsultasi,
                totalTindakan,
                totalObat,
                jumlahTransaksi = list.Count
            },
            items = list
        }, "Laporan pendapatan kasir berhasil dimuat"));
    }

    [HttpGet("rekammedis")]
    public async Task<ActionResult<ApiResponse<object>>> LaporanRekamMedis(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate)
    {
        using var conn = _db.CreateConnection();

        // 10 Besar Penyakit
        string sqlTopPenyakit = @"
            SELECT 
                d.kode_icd AS KodeIcd,
                d.nama_diagnosa AS NamaDiagnosa,
                COUNT(rmd.id) AS Jumlah
            FROM rekam_medis_diagnosa rmd
            JOIN diagnosa d ON rmd.diagnosa_id = d.id
            JOIN rekam_medis rm ON rmd.rekam_medis_id = rm.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(startDate))
            sqlTopPenyakit += " AND DATE(rm.tanggal_pemeriksaan) >= @StartDate";
        if (!string.IsNullOrWhiteSpace(endDate))
            sqlTopPenyakit += " AND DATE(rm.tanggal_pemeriksaan) <= @EndDate";

        sqlTopPenyakit += @"
            GROUP BY d.id, d.kode_icd, d.nama_diagnosa
            ORDER BY Jumlah DESC
            LIMIT 10";

        var topPenyakit = await conn.QueryAsync<PenyakitTerbanyakDto>(sqlTopPenyakit, new { StartDate = startDate, EndDate = endDate });

        // Riwayat Rekam Medis
        string sqlList = @"
            SELECT 
                rm.*,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                d.nama_dokter AS NamaDokter
            FROM rekam_medis rm
            JOIN pasien p ON rm.pasien_id = p.id
            LEFT JOIN dokter d ON rm.dokter_id = d.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(startDate))
            sqlList += " AND DATE(rm.tanggal_pemeriksaan) >= @StartDate";
        if (!string.IsNullOrWhiteSpace(endDate))
            sqlList += " AND DATE(rm.tanggal_pemeriksaan) <= @EndDate";

        sqlList += " ORDER BY rm.id DESC";
        var items = await conn.QueryAsync<RekamMedis>(sqlList, new { StartDate = startDate, EndDate = endDate });

        return Ok(ApiResponse<object>.Ok(new
        {
            topPenyakit,
            items
        }, "Laporan rekam medis dan 10 besar penyakit berhasil dimuat"));
    }

    [HttpGet("obat")]
    public async Task<ActionResult<ApiResponse<object>>> LaporanObat()
    {
        using var conn = _db.CreateConnection();

        // Daftar stok obat saat ini
        const string sqlObat = @"
            SELECT o.*, k.nama_kategori AS NamaKategori, s.nama_satuan AS NamaSatuan
            FROM obat o
            LEFT JOIN kategori_obat k ON o.kategori_id = k.id
            LEFT JOIN satuan_obat s ON o.satuan_id = s.id
            ORDER BY o.stok ASC";
        var items = (await conn.QueryAsync<Obat>(sqlObat)).AsList();

        // Mutasi log 20 terakhir
        const string sqlLog = @"
            SELECT l.*, o.nama_obat AS NamaObat, u.nama_lengkap AS NamaUser
            FROM stok_obat_log l
            JOIN obat o ON l.obat_id = o.id
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.id DESC
            LIMIT 50";
        var logs = await conn.QueryAsync(sqlLog);

        var totalItem = items.Count;
        var kritis = items.Count(x => x.Stok <= x.StokMinimum);
        var totalNilaiStok = items.Sum(x => x.Stok * x.HargaBeli);

        return Ok(ApiResponse<object>.Ok(new
        {
            summary = new { totalItem, kritis, totalNilaiStok },
            items,
            logs
        }, "Laporan stok obat dan log mutasi berhasil dimuat"));
    }
}
