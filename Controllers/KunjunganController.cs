using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KunjunganController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public KunjunganController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Kunjungan>>>> GetAll(
        [FromQuery] string? tanggal,
        [FromQuery] string? status,
        [FromQuery] int? poliId)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                k.*,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                pol.nama_poli AS NamaPoli,
                pol.tarif_pendaftaran AS TarifPendaftaran,
                dok.nama_dokter AS NamaDokter,
                dok.tarif_konsultasi AS TarifKonsultasi
            FROM kunjungan k
            JOIN pasien p ON k.pasien_id = p.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(tanggal))
        {
            sql += " AND k.tanggal_kunjungan = @Tanggal";
        }
        else
        {
            // Default filter to today or recent if needed
            // sql += " AND k.tanggal_kunjungan >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)";
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            sql += " AND k.status = @Status";
        }

        if (poliId.HasValue && poliId.Value > 0)
        {
            sql += " AND k.poli_id = @PoliId";
        }

        sql += " ORDER BY k.tanggal_kunjungan DESC, k.id DESC";

        var items = await conn.QueryAsync<Kunjungan>(sql, new { Tanggal = tanggal, Status = status, PoliId = poliId });
        return Ok(ApiResponse<IEnumerable<Kunjungan>>.Ok(items, "Data kunjungan berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Kunjungan>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                k.*,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                pol.nama_poli AS NamaPoli,
                pol.tarif_pendaftaran AS TarifPendaftaran,
                dok.nama_dokter AS NamaDokter,
                dok.tarif_konsultasi AS TarifKonsultasi
            FROM kunjungan k
            JOIN pasien p ON k.pasien_id = p.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE k.id = @Id";
        var item = await conn.QueryFirstOrDefaultAsync<Kunjungan>(sql, new { Id = id });
        if (item == null) return NotFound(ApiResponse<Kunjungan>.Fail("Kunjungan tidak ditemukan"));
        return Ok(ApiResponse<Kunjungan>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Kunjungan>>> Create([FromBody] Kunjungan model)
    {
        if (model.PasienId <= 0)
            return BadRequest(ApiResponse<Kunjungan>.Fail("Pasien wajib dipilih"));

        using var conn = _db.CreateConnection();

        if (model.TanggalKunjungan == default)
        {
            model.TanggalKunjungan = DateTime.Today;
        }

        // Auto-generate No Kunjungan REG-YYYYMMDD-XXX
        var dateStr = model.TanggalKunjungan.ToString("yyyyMMdd");
        var dailyCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM kunjungan WHERE tanggal_kunjungan = @Tgl", 
            new { Tgl = model.TanggalKunjungan.ToString("yyyy-MM-dd") });

        model.NoKunjungan = $"REG-{dateStr}-{(dailyCount + 1).ToString().PadLeft(3, '0')}";
        if (model.JamDaftar == null || model.JamDaftar == TimeSpan.Zero)
        {
            model.JamDaftar = DateTime.Now.TimeOfDay;
        }

        const string sql = @"
            INSERT INTO kunjungan (
                no_kunjungan, pasien_id, poli_id, dokter_id, user_pendaftaran_id,
                tanggal_kunjungan, jam_daftar, jenis_kunjungan, cara_bayar,
                no_bpjs, keluhan_awal, status
            ) VALUES (
                @NoKunjungan, @PasienId, @PoliId, @DokterId, @UserPendaftaranId,
                @TanggalKunjungan, @JamDaftar, @JenisKunjungan, @CaraBayar,
                @NoBpjs, @KeluhanAwal, @Status
            );
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;

        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Kunjungan>.Ok(model, "Pendaftaran kunjungan pasien berhasil dibuat"));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateStatus(int id, [FromBody] StatusUpdateDto dto)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("UPDATE kunjungan SET status = @Status WHERE id = @Id", new { dto.Status, Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Kunjungan tidak ditemukan"));

        return Ok(ApiResponse<object>.Ok(new { id, status = dto.Status }, "Status kunjungan berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM kunjungan WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Kunjungan tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Kunjungan berhasil dihapus"));
    }
}

public class StatusUpdateDto
{
    public string Status { get; set; } = "menunggu";
}
