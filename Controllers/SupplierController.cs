using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupplierController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public SupplierController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Supplier>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM supplier ORDER BY nama_supplier ASC";
        var items = await conn.QueryAsync<Supplier>(sql);
        return Ok(ApiResponse<IEnumerable<Supplier>>.Ok(items, "Data supplier berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Supplier>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        var item = await conn.QueryFirstOrDefaultAsync<Supplier>("SELECT * FROM supplier WHERE id = @Id", new { Id = id });
        if (item == null) return NotFound(ApiResponse<Supplier>.Fail("Supplier tidak ditemukan"));
        return Ok(ApiResponse<Supplier>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Supplier>>> Create([FromBody] Supplier model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaSupplier))
            return BadRequest(ApiResponse<Supplier>.Fail("Nama Supplier wajib diisi"));

        using var conn = _db.CreateConnection();
        if (string.IsNullOrWhiteSpace(model.KodeSupplier))
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM supplier");
            model.KodeSupplier = $"SUP-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        const string sql = @"
            INSERT INTO supplier (kode_supplier, nama_supplier, alamat, telepon, email, kontak_person)
            VALUES (@KodeSupplier, @NamaSupplier, @Alamat, @Telepon, @Email, @KontakPerson);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Supplier>.Ok(model, "Supplier berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Supplier>>> Update(int id, [FromBody] Supplier model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE supplier SET
                kode_supplier = @KodeSupplier,
                nama_supplier = @NamaSupplier,
                alamat = @Alamat,
                telepon = @Telepon,
                email = @Email,
                kontak_person = @KontakPerson
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Supplier>.Fail("Supplier tidak ditemukan"));

        return Ok(ApiResponse<Supplier>.Ok(model, "Data supplier berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM supplier WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Supplier tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Supplier berhasil dihapus"));
    }
}
