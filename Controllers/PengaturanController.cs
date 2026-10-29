using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PengaturanController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PengaturanController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        var list = await conn.QueryAsync<Pengaturan>("SELECT * FROM pengaturan");
        var dict = list.ToDictionary(x => x.Kunci, x => x.Nilai ?? "");
        return Ok(ApiResponse<Dictionary<string, string>>.Ok(dict, "Pengaturan klinik berhasil dimuat"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> UpdateBatch([FromBody] Dictionary<string, string> settings)
    {
        using var conn = _db.CreateConnection();
        foreach (var kvp in settings)
        {
            await conn.ExecuteAsync(@"
                INSERT INTO pengaturan (kunci, nilai) VALUES (@Kunci, @Nilai)
                ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)",
                new { Kunci = kvp.Key, Nilai = kvp.Value });
        }
        return Ok(ApiResponse<object>.Ok(null, "Pengaturan klinik berhasil disimpan"));
    }
}
