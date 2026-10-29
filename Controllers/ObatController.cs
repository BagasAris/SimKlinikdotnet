using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ObatController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public ObatController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Obat>>>> GetAll([FromQuery] string? search, [FromQuery] int? kategoriId)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT o.*, k.nama_kategori AS NamaKategori, s.nama_satuan AS NamaSatuan
            FROM obat o
            LEFT JOIN kategori_obat k ON o.kategori_id = k.id
            LEFT JOIN satuan_obat s ON o.satuan_id = s.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (o.kode_obat LIKE @Search OR o.nama_obat LIKE @Search)";
        }
        if (kategoriId.HasValue && kategoriId.Value > 0)
        {
            sql += " AND o.kategori_id = @KategoriId";
        }

        sql += " ORDER BY o.nama_obat ASC";

        var items = await conn.QueryAsync<Obat>(sql, new { Search = $"%{search}%", KategoriId = kategoriId });
        return Ok(ApiResponse<IEnumerable<Obat>>.Ok(items, "Data obat berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Obat>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT o.*, k.nama_kategori AS NamaKategori, s.nama_satuan AS NamaSatuan
            FROM obat o
            LEFT JOIN kategori_obat k ON o.kategori_id = k.id
            LEFT JOIN satuan_obat s ON o.satuan_id = s.id
            WHERE o.id = @Id";
        var item = await conn.QueryFirstOrDefaultAsync<Obat>(sql, new { Id = id });
        if (item == null) return NotFound(ApiResponse<Obat>.Fail("Obat tidak ditemukan"));
        return Ok(ApiResponse<Obat>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Obat>>> Create([FromBody] Obat model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaObat))
            return BadRequest(ApiResponse<Obat>.Fail("Nama Obat wajib diisi"));

        using var conn = _db.CreateConnection();
        if (string.IsNullOrWhiteSpace(model.KodeObat))
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM obat");
            model.KodeObat = $"OBT-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        const string sql = @"
            INSERT INTO obat (
                kode_obat, nama_obat, kategori_id, satuan_id, jenis_obat,
                bentuk_obat, harga_beli, harga_jual, stok, stok_minimum,
                tanggal_expired, nomor_batch, deskripsi, status
            ) VALUES (
                @KodeObat, @NamaObat, @KategoriId, @SatuanId, @JenisObat,
                @BentukObat, @HargaBeli, @HargaJual, @Stok, @StokMinimum,
                @TanggalExpired, @NomorBatch, @Deskripsi, @Status
            );
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;

        // Log initial stock if > 0
        if (model.Stok > 0)
        {
            const string logSql = @"
                INSERT INTO stok_obat_log (obat_id, jenis, jumlah, stok_sebelum, stok_sesudah, referensi, keterangan)
                VALUES (@ObatId, 'masuk', @Jumlah, 0, @Jumlah, 'STOK-AWAL', 'Stok awal saat input master obat')";
            await conn.ExecuteAsync(logSql, new { ObatId = id, Jumlah = model.Stok });
        }

        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Obat>.Ok(model, "Obat berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Obat>>> Update(int id, [FromBody] Obat model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE obat SET
                kode_obat = @KodeObat,
                nama_obat = @NamaObat,
                kategori_id = @KategoriId,
                satuan_id = @SatuanId,
                jenis_obat = @JenisObat,
                bentuk_obat = @BentukObat,
                harga_beli = @HargaBeli,
                harga_jual = @HargaJual,
                stok = @Stok,
                stok_minimum = @StokMinimum,
                tanggal_expired = @TanggalExpired,
                nomor_batch = @NomorBatch,
                deskripsi = @Deskripsi,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Obat>.Fail("Obat tidak ditemukan"));

        return Ok(ApiResponse<Obat>.Ok(model, "Data obat berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM obat WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Obat tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Obat berhasil dihapus"));
    }

    [HttpGet("kategori")]
    public async Task<ActionResult<ApiResponse<IEnumerable<KategoriObat>>>> GetKategori()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM kategori_obat ORDER BY nama_kategori ASC";
        var items = await conn.QueryAsync<KategoriObat>(sql);
        return Ok(ApiResponse<IEnumerable<KategoriObat>>.Ok(items));
    }

    [HttpGet("satuan")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SatuanObat>>>> GetSatuan()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT * FROM satuan_obat ORDER BY nama_satuan ASC";
        var items = await conn.QueryAsync<SatuanObat>(sql);
        return Ok(ApiResponse<IEnumerable<SatuanObat>>.Ok(items));
    }

    [HttpGet("kritis")]
    public async Task<ActionResult<ApiResponse<IEnumerable<Obat>>>> GetObatKritis()
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT o.*, k.nama_kategori AS NamaKategori, s.nama_satuan AS NamaSatuan
            FROM obat o
            LEFT JOIN kategori_obat k ON o.kategori_id = k.id
            LEFT JOIN satuan_obat s ON o.satuan_id = s.id
            WHERE o.stok <= o.stok_minimum AND o.status = 'aktif'
            ORDER BY o.stok ASC";
        var items = await conn.QueryAsync<Obat>(sql);
        return Ok(ApiResponse<IEnumerable<Obat>>.Ok(items, "Daftar obat stok menipis / kritis"));
    }
}
