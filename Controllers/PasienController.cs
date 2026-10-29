using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PasienController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PasienController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Pasien>>>> GetAll([FromQuery] string? search)
    {
        using var conn = _db.CreateConnection();
        string sql = "SELECT * FROM pasien WHERE 1=1";
        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (no_rm LIKE @Search OR nama_pasien LIKE @Search OR nik LIKE @Search OR telepon LIKE @Search)";
        }
        sql += " ORDER BY id DESC";

        var items = await conn.QueryAsync<Pasien>(sql, new { Search = $"%{search}%" });
        return Ok(ApiResponse<IEnumerable<Pasien>>.Ok(items, "Data pasien berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Pasien>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        var item = await conn.QueryFirstOrDefaultAsync<Pasien>("SELECT * FROM pasien WHERE id = @Id", new { Id = id });
        if (item == null) return NotFound(ApiResponse<Pasien>.Fail("Pasien tidak ditemukan"));
        return Ok(ApiResponse<Pasien>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Pasien>>> Create([FromBody] Pasien model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaPasien))
            return BadRequest(ApiResponse<Pasien>.Fail("Nama Pasien wajib diisi"));

        using var conn = _db.CreateConnection();

        // Auto-generate No RM if blank
        if (string.IsNullOrWhiteSpace(model.NoRm))
        {
            var year = DateTime.Now.Year;
            var maxId = await conn.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(id), 0) + 1 FROM pasien");
            model.NoRm = $"RM-{year}-{maxId.ToString().PadLeft(4, '0')}";
        }

        const string sql = @"
            INSERT INTO pasien (
                no_rm, nik, nama_pasien, jenis_kelamin, tempat_lahir, tanggal_lahir,
                alamat, telepon, email, golongan_darah, status_pernikahan,
                pekerjaan, alergi, kontak_darurat, telepon_darurat, status
            ) VALUES (
                @NoRm, @Nik, @NamaPasien, @JenisKelamin, @TempatLahir, @TanggalLahir,
                @Alamat, @Telepon, @Email, @GolonganDarah, @StatusPernikahan,
                @Pekerjaan, @Alergi, @KontakDarurat, @TeleponDarurat, @Status
            );
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Pasien>.Ok(model, "Pasien berhasil didaftarkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Pasien>>> Update(int id, [FromBody] Pasien model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE pasien SET
                nik = @Nik,
                nama_pasien = @NamaPasien,
                jenis_kelamin = @JenisKelamin,
                tempat_lahir = @TempatLahir,
                tanggal_lahir = @TanggalLahir,
                alamat = @Alamat,
                telepon = @Telepon,
                email = @Email,
                golongan_darah = @GolonganDarah,
                status_pernikahan = @StatusPernikahan,
                pekerjaan = @Pekerjaan,
                alergi = @Alergi,
                kontak_darurat = @KontakDarurat,
                telepon_darurat = @TeleponDarurat,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Pasien>.Fail("Pasien tidak ditemukan"));

        return Ok(ApiResponse<Pasien>.Ok(model, "Data pasien berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM pasien WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Pasien tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Data pasien berhasil dihapus"));
    }

    [HttpGet("{id}/riwayat")]
    public async Task<ActionResult<ApiResponse<object>>> GetRiwayat(int id)
    {
        using var conn = _db.CreateConnection();
        var pasien = await conn.QueryFirstOrDefaultAsync<Pasien>("SELECT * FROM pasien WHERE id = @Id", new { Id = id });
        if (pasien == null) return NotFound(ApiResponse<object>.Fail("Pasien tidak ditemukan"));

        const string sqlKunjungan = @"
            SELECT k.*, pol.nama_poli AS NamaPoli, dok.nama_dokter AS NamaDokter
            FROM kunjungan k
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE k.pasien_id = @Id
            ORDER BY k.tanggal_kunjungan DESC, k.id DESC";
        var kunjunganList = await conn.QueryAsync(sqlKunjungan, new { Id = id });

        const string sqlRm = @"
            SELECT rm.*, dok.nama_dokter AS NamaDokter
            FROM rekam_medis rm
            LEFT JOIN dokter dok ON rm.dokter_id = dok.id
            WHERE rm.pasien_id = @Id
            ORDER BY rm.tanggal_pemeriksaan DESC";
        var rmList = await conn.QueryAsync(sqlRm, new { Id = id });

        return Ok(ApiResponse<object>.Ok(new
        {
            pasien,
            kunjungan = kunjunganList,
            rekam_medis = rmList
        }, "Riwayat pasien berhasil dimuat"));
    }
}
