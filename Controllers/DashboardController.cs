using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public DashboardController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<DashboardStatsDto>>> GetStats()
    {
        using var conn = _db.CreateConnection();

        // Metric queries
        var totalPasien = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pasien WHERE status = 'aktif'");
        var totalDokter = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dokter WHERE status = 'aktif'");
        var kunjunganHariIni = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM kunjungan WHERE tanggal_kunjungan = CURRENT_DATE()");
        var antrianMenunggu = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM kunjungan WHERE tanggal_kunjungan = CURRENT_DATE() AND status IN ('menunggu', 'dipanggil')");
        var pendapatanHariIni = await conn.ExecuteScalarAsync<decimal>("SELECT COALESCE(SUM(total_bayar), 0) FROM pembayaran WHERE DATE(tanggal_pembayaran) = CURRENT_DATE() AND status = 'lunas'");
        var pendapatanBulanIni = await conn.ExecuteScalarAsync<decimal>("SELECT COALESCE(SUM(total_bayar), 0) FROM pembayaran WHERE MONTH(tanggal_pembayaran) = MONTH(CURRENT_DATE()) AND YEAR(tanggal_pembayaran) = YEAR(CURRENT_DATE()) AND status = 'lunas'");
        var obatKritis = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM obat WHERE stok <= stok_minimum AND status = 'aktif'");
        var resepHariIni = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM resep WHERE DATE(tanggal_resep) = CURRENT_DATE()");

        // Grafik kunjungan 7 hari terakhir
        var grafikSql = @"
            SELECT 
                DATE_FORMAT(tanggal_kunjungan, '%d/%m') AS Tanggal, 
                COUNT(*) AS Jumlah 
            FROM kunjungan 
            WHERE tanggal_kunjungan >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
            GROUP BY tanggal_kunjungan 
            ORDER BY tanggal_kunjungan ASC";
        var grafik = (await conn.QueryAsync<KunjunganGrafikDto>(grafikSql)).AsList();

        // Jika grafik kosong / sedikit, buat data representatif
        if (grafik.Count == 0)
        {
            grafik.Add(new KunjunganGrafikDto { Tanggal = DateTime.Now.ToString("dd/MM"), Jumlah = kunjunganHariIni });
        }

        // Top 5 Diagnosa Penyakit
        var topPenyakitSql = @"
            SELECT 
                COALESCE(d.kode_icd, '-') AS KodeIcd,
                d.nama_diagnosa AS NamaDiagnosa,
                COUNT(*) AS Jumlah
            FROM rekam_medis_diagnosa rmd
            JOIN diagnosa d ON rmd.diagnosa_id = d.id
            GROUP BY d.id, d.kode_icd, d.nama_diagnosa
            ORDER BY Jumlah DESC
            LIMIT 5";
        var topPenyakit = (await conn.QueryAsync<PenyakitTerbanyakDto>(topPenyakitSql)).AsList();

        // Antrian Aktif Hari Ini
        var antrianSql = @"
            SELECT 
                k.*,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                pol.nama_poli AS NamaPoli,
                dok.nama_dokter AS NamaDokter
            FROM kunjungan k
            JOIN pasien p ON k.pasien_id = p.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE k.tanggal_kunjungan = CURRENT_DATE()
            ORDER BY 
                CASE k.status 
                    WHEN 'dipanggil' THEN 1 
                    WHEN 'diperiksa' THEN 2 
                    WHEN 'menunggu' THEN 3 
                    ELSE 4 
                END, 
                k.id ASC
            LIMIT 10";
        var antrian = (await conn.QueryAsync<Kunjungan>(antrianSql)).AsList();

        // Obat Menipis / Kritis
        var obatMenipisSql = @"
            SELECT o.*, k.nama_kategori AS NamaKategori, s.nama_satuan AS NamaSatuan
            FROM obat o
            LEFT JOIN kategori_obat k ON o.kategori_id = k.id
            LEFT JOIN satuan_obat s ON o.satuan_id = s.id
            WHERE o.stok <= o.stok_minimum AND o.status = 'aktif'
            ORDER BY o.stok ASC
            LIMIT 10";
        var obatMenipis = (await conn.QueryAsync<Obat>(obatMenipisSql)).AsList();

        var stats = new DashboardStatsDto
        {
            TotalPasien = totalPasien,
            TotalDokter = totalDokter,
            KunjunganHariIni = kunjunganHariIni,
            AntrianMenunggu = antrianMenunggu,
            PendapatanHariIni = pendapatanHariIni,
            PendapatanBulanIni = pendapatanBulanIni,
            ObatKritis = obatKritis,
            ResepHariIni = resepHariIni,
            GrafikKunjungan = grafik,
            TopPenyakit = topPenyakit,
            AntrianAktif = antrian,
            ObatMenipisList = obatMenipis
        };

        return Ok(ApiResponse<DashboardStatsDto>.Ok(stats, "Statistik dashboard berhasil dimuat"));
    }
}
