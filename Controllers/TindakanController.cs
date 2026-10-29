using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TindakanController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public TindakanController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Tindakan>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM tindakan ORDER BY nama_tindakan ASC";
        var items = await conn.QueryAsync<Tindakan>(sql);
        return Ok(ApiResponse<IEnumerable<Tindakan>>.Ok(items, "Data tindakan berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Tindakan>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        var item = await conn.QueryFirstOrDefaultAsync<Tindakan>("SELECT * FROM tindakan WHERE id = @Id", new { Id = id });
        if (item == null) return NotFound(ApiResponse<Tindakan>.Fail("Tindakan tidak ditemukan"));
        return Ok(ApiResponse<Tindakan>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Tindakan>>> Create([FromBody] Tindakan model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaTindakan))
            return BadRequest(ApiResponse<Tindakan>.Fail("Nama Tindakan wajib diisi"));

        using var conn = _db.CreateConnection();
        if (string.IsNullOrWhiteSpace(model.KodeTindakan))
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM tindakan");
            model.KodeTindakan = $"TDK-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        const string sql = @"
            INSERT INTO tindakan (kode_tindakan, nama_tindakan, kategori, tarif, deskripsi, status)
            VALUES (@KodeTindakan, @NamaTindakan, @Kategori, @Tarif, @Deskripsi, @Status);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Tindakan>.Ok(model, "Tindakan berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Tindakan>>> Update(int id, [FromBody] Tindakan model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE tindakan SET 
                kode_tindakan = @KodeTindakan,
                nama_tindakan = @NamaTindakan,
                kategori = @Kategori,
                tarif = @Tarif,
                deskripsi = @Deskripsi,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Tindakan>.Fail("Tindakan tidak ditemukan"));

        return Ok(ApiResponse<Tindakan>.Ok(model, "Data tindakan berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM tindakan WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Tindakan tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Tindakan berhasil dihapus"));
    }

    // Diagnosa Helper Endpoints
    [HttpGet("diagnosa-list")]
    public async Task<ActionResult<ApiResponse<IEnumerable<Diagnosa>>>> GetDiagnosaList()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM diagnosa ORDER BY kode_icd ASC, nama_diagnosa ASC";
        var items = await conn.QueryAsync<Diagnosa>(sql);
        return Ok(ApiResponse<IEnumerable<Diagnosa>>.Ok(items, "Data diagnosa ICD-10 berhasil diambil"));
    }
}
