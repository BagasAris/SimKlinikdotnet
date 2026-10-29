using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PoliController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PoliController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Poli>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM poli ORDER BY nama_poli ASC";
        var items = await conn.QueryAsync<Poli>(sql);
        return Ok(ApiResponse<IEnumerable<Poli>>.Ok(items, "Data poli berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Poli>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        var item = await conn.QueryFirstOrDefaultAsync<Poli>("SELECT * FROM poli WHERE id = @Id", new { Id = id });
        if (item == null) return NotFound(ApiResponse<Poli>.Fail("Poli tidak ditemukan"));
        return Ok(ApiResponse<Poli>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Poli>>> Create([FromBody] Poli model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaPoli))
            return BadRequest(ApiResponse<Poli>.Fail("Nama Poli wajib diisi"));

        using var conn = _db.CreateConnection();
        if (string.IsNullOrWhiteSpace(model.KodePoli))
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM poli");
            model.KodePoli = $"POLI-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        const string sql = @"
            INSERT INTO poli (kode_poli, nama_poli, deskripsi, tarif_pendaftaran, status)
            VALUES (@KodePoli, @NamaPoli, @Deskripsi, @TarifPendaftaran, @Status);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Poli>.Ok(model, "Poli berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Poli>>> Update(int id, [FromBody] Poli model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE poli SET 
                kode_poli = @KodePoli,
                nama_poli = @NamaPoli,
                deskripsi = @Deskripsi,
                tarif_pendaftaran = @TarifPendaftaran,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Poli>.Fail("Poli tidak ditemukan"));

        return Ok(ApiResponse<Poli>.Ok(model, "Data poli berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM poli WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Poli tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Poli berhasil dihapus"));
    }
}
