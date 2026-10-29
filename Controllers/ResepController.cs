using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResepController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public ResepController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Resep>>>> GetAll([FromQuery] string? status)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                r.*,
                k.no_kunjungan AS NoKunjungan,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                d.nama_dokter AS NamaDokter,
                COALESCE((SELECT SUM(subtotal) FROM detail_resep WHERE resep_id = r.id), 0) AS TotalBiayaObat
            FROM resep r
            JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
            JOIN kunjungan k ON rm.kunjungan_id = k.id
            JOIN pasien p ON r.pasien_id = p.id
            LEFT JOIN dokter d ON r.dokter_id = d.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(status))
        {
            sql += " AND r.status = @Status";
        }

        sql += " ORDER BY r.id DESC";

        var items = await conn.QueryAsync<Resep>(sql, new { Status = status });
        return Ok(ApiResponse<IEnumerable<Resep>>.Ok(items, "Data resep berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Resep>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                r.*,
                k.no_kunjungan AS NoKunjungan,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                d.nama_dokter AS NamaDokter,
                COALESCE((SELECT SUM(subtotal) FROM detail_resep WHERE resep_id = r.id), 0) AS TotalBiayaObat
            FROM resep r
            JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
            JOIN kunjungan k ON rm.kunjungan_id = k.id
            JOIN pasien p ON r.pasien_id = p.id
            LEFT JOIN dokter d ON r.dokter_id = d.id
            WHERE r.id = @Id";

        var resep = await conn.QueryFirstOrDefaultAsync<Resep>(sql, new { Id = id });
        if (resep == null) return NotFound(ApiResponse<Resep>.Fail("Resep tidak ditemukan"));

        const string sqlItems = @"
            SELECT dr.*, o.nama_obat AS NamaObat
            FROM detail_resep dr
            JOIN obat o ON dr.obat_id = o.id
            WHERE dr.resep_id = @ResepId";
        resep.Items = (await conn.QueryAsync<DetailResepDto>(sqlItems, new { ResepId = id })).AsList();

        return Ok(ApiResponse<Resep>.Ok(resep));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Resep>>> Create([FromBody] Resep model)
    {
        if (model.RekamMedisId <= 0 || model.PasienId <= 0)
            return BadRequest(ApiResponse<Resep>.Fail("Rekam Medis dan Pasien wajib valid"));

        if (model.Items == null || model.Items.Count == 0)
            return BadRequest(ApiResponse<Resep>.Fail("Item obat dalam resep tidak boleh kosong"));

        using var conn = _db.CreateConnection();

        // Auto-generate No Resep RSP-YYYYMMDD-XXX
        var today = DateTime.Today.ToString("yyyyMMdd");
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM resep WHERE DATE(tanggal_resep) = CURRENT_DATE()");
        model.NoResep = $"RSP-{today}-{(count + 1).ToString().PadLeft(3, '0')}";

        const string sql = @"
            INSERT INTO resep (no_resep, rekam_medis_id, pasien_id, dokter_id, tanggal_resep, status, catatan)
            VALUES (@NoResep, @RekamMedisId, @PasienId, @DokterId, NOW(), 'menunggu', @Catatan);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;

        foreach (var item in model.Items)
        {
            var obat = await conn.QueryFirstOrDefaultAsync<Obat>("SELECT harga_jual FROM obat WHERE id = @ObatId", new { item.ObatId });
            var harga = obat?.HargaJual ?? item.HargaSatuan;
            var subtotal = harga * item.Jumlah;

            await conn.ExecuteAsync(@"
                INSERT INTO detail_resep (resep_id, obat_id, jumlah, dosis, frekuensi, aturan_pakai, waktu_pakai, harga_satuan, subtotal, catatan)
                VALUES (@ResepId, @ObatId, @Jumlah, @Dosis, @Frekuensi, @AturanPakai, @WaktuPakai, @HargaSatuan, @Subtotal, @Catatan)",
                new {
                    ResepId = id,
                    item.ObatId,
                    item.Jumlah,
                    item.Dosis,
                    item.Frekuensi,
                    item.AturanPakai,
                    item.WaktuPakai,
                    HargaSatuan = harga,
                    Subtotal = subtotal,
                    item.Catatan
                });
        }

        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Resep>.Ok(model, "Resep dokter berhasil dibuat dan diteruskan ke apotek"));
    }

    [HttpPut("{id}/dispense")]
    public async Task<ActionResult<ApiResponse<object>>> Dispense(int id)
    {
        using var conn = _db.CreateConnection();
        var resep = await conn.QueryFirstOrDefaultAsync<Resep>("SELECT * FROM resep WHERE id = @Id", new { Id = id });
        if (resep == null) return NotFound(ApiResponse<object>.Fail("Resep tidak ditemukan"));
        if (resep.Status == "selesai") return BadRequest(ApiResponse<object>.Fail("Resep sudah pernah diproses/selesai"));

        var items = (await conn.QueryAsync<DetailResepDto>("SELECT * FROM detail_resep WHERE resep_id = @ResepId", new { ResepId = id })).AsList();

        // Check stock availability
        foreach (var item in items)
        {
            var obat = await conn.QueryFirstOrDefaultAsync<Obat>("SELECT id, nama_obat, stok FROM obat WHERE id = @Id", new { Id = item.ObatId });
            if (obat == null || obat.Stok < item.Jumlah)
            {
                return BadRequest(ApiResponse<object>.Fail($"Stok obat '{obat?.NamaObat ?? "Obat"}' tidak mencukupi (Tersisa: {obat?.Stok ?? 0}, Dibutuhkan: {item.Jumlah})"));
            }
        }

        // Deduct stock and record logs
        foreach (var item in items)
        {
            var obat = await conn.QueryFirstOrDefaultAsync<Obat>("SELECT id, stok FROM obat WHERE id = @Id", new { Id = item.ObatId });
            var stokSebelum = obat!.Stok;
            var stokSesudah = stokSebelum - item.Jumlah;

            await conn.ExecuteAsync("UPDATE obat SET stok = @StokSesudah WHERE id = @Id", new { StokSesudah = stokSesudah, Id = item.ObatId });

            await conn.ExecuteAsync(@"
                INSERT INTO stok_obat_log (obat_id, jenis, jumlah, stok_sebelum, stok_sesudah, referensi, keterangan)
                VALUES (@ObatId, 'keluar', @Jumlah, @StokSebelum, @StokSesudah, @Referensi, 'Dispensing resep apotek')",
                new { ObatId = item.ObatId, item.Jumlah, StokSebelum = stokSebelum, StokSesudah = stokSesudah, Referensi = resep.NoResep });
        }

        await conn.ExecuteAsync("UPDATE resep SET status = 'selesai' WHERE id = @Id", new { Id = id });

        return Ok(ApiResponse<object>.Ok(new { id, status = "selesai" }, "Resep berhasil diproses (dispensed) dan stok obat otomatis dipotong!"));
    }
}
