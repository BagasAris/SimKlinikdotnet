using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PembelianController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PembelianController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<PembelianObat>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                po.*,
                s.nama_supplier AS NamaSupplier,
                u.nama_lengkap AS NamaPetugas
            FROM pembelian_obat po
            LEFT JOIN supplier s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.user_id = u.id
            ORDER BY po.id DESC";

        var items = await conn.QueryAsync<PembelianObat>(sql);
        return Ok(ApiResponse<IEnumerable<PembelianObat>>.Ok(items, "Data pembelian obat berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PembelianObat>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                po.*,
                s.nama_supplier AS NamaSupplier,
                u.nama_lengkap AS NamaPetugas
            FROM pembelian_obat po
            LEFT JOIN supplier s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.user_id = u.id
            WHERE po.id = @Id";

        var pembelian = await conn.QueryFirstOrDefaultAsync<PembelianObat>(sql, new { Id = id });
        if (pembelian == null) return NotFound(ApiResponse<PembelianObat>.Fail("Data pembelian tidak ditemukan"));

        const string sqlItems = @"
            SELECT dpo.*, o.nama_obat AS NamaObat
            FROM detail_pembelian_obat dpo
            JOIN obat o ON dpo.obat_id = o.id
            WHERE dpo.pembelian_id = @PembelianId";
        pembelian.Items = (await conn.QueryAsync<DetailPembelianDto>(sqlItems, new { PembelianId = id })).AsList();

        return Ok(ApiResponse<PembelianObat>.Ok(pembelian));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PembelianObat>>> Create([FromBody] PembelianObat model)
    {
        if (model.SupplierId <= 0)
            return BadRequest(ApiResponse<PembelianObat>.Fail("Supplier wajib dipilih"));

        if (model.Items == null || model.Items.Count == 0)
            return BadRequest(ApiResponse<PembelianObat>.Fail("Item obat wajib diisi"));

        using var conn = _db.CreateConnection();

        if (string.IsNullOrWhiteSpace(model.NoFaktur))
        {
            var dateStr = DateTime.Today.ToString("yyyyMMdd");
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pembelian_obat WHERE DATE(tanggal_pembelian) = CURRENT_DATE()");
            model.NoFaktur = $"FAK-{dateStr}-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        if (model.TanggalPembelian == default)
        {
            model.TanggalPembelian = DateTime.Today;
        }

        decimal subtotal = 0;
        foreach (var itm in model.Items)
        {
            itm.Subtotal = itm.Jumlah * itm.HargaSatuan;
            subtotal += itm.Subtotal;
        }
        model.Subtotal = subtotal;
        model.TotalHarga = subtotal - model.Diskon + model.Pajak;
        model.Status = "completed";

        const string sql = @"
            INSERT INTO pembelian_obat (
                no_faktur, supplier_id, user_id, tanggal_pembelian,
                subtotal, diskon, pajak, total_harga, status, catatan
            ) VALUES (
                @NoFaktur, @SupplierId, @UserId, @TanggalPembelian,
                @Subtotal, @Diskon, @Pajak, @TotalHarga, @Status, @Catatan
            );
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;

        // Insert items, increase stock, and add stock mutation log
        foreach (var itm in model.Items)
        {
            await conn.ExecuteAsync(@"
                INSERT INTO detail_pembelian_obat (pembelian_id, obat_id, jumlah, harga_satuan, nomor_batch, tanggal_expired, subtotal)
                VALUES (@PembelianId, @ObatId, @Jumlah, @HargaSatuan, @NomorBatch, @TanggalExpired, @Subtotal)",
                new {
                    PembelianId = id,
                    itm.ObatId,
                    itm.Jumlah,
                    itm.HargaSatuan,
                    itm.NomorBatch,
                    itm.TanggalExpired,
                    itm.Subtotal
                });

            // Get current stock
            var currentStock = await conn.ExecuteScalarAsync<int>("SELECT COALESCE(stok, 0) FROM obat WHERE id = @Id", new { Id = itm.ObatId });
            var newStock = currentStock + itm.Jumlah;

            await conn.ExecuteAsync(@"
                UPDATE obat SET 
                    stok = @NewStock, 
                    harga_beli = @HargaBeli,
                    nomor_batch = COALESCE(@NomorBatch, nomor_batch),
                    tanggal_expired = COALESCE(@TanggalExpired, tanggal_expired)
                WHERE id = @Id",
                new { NewStock = newStock, HargaBeli = itm.HargaSatuan, itm.NomorBatch, itm.TanggalExpired, Id = itm.ObatId });

            await conn.ExecuteAsync(@"
                INSERT INTO stok_obat_log (obat_id, user_id, jenis, jumlah, stok_sebelum, stok_sesudah, referensi, keterangan)
                VALUES (@ObatId, @UserId, 'masuk', @Jumlah, @StokSebelum, @StokSesudah, @Referensi, 'Pembelian restok obat dari supplier')",
                new {
                    ObatId = itm.ObatId,
                    model.UserId,
                    itm.Jumlah,
                    StokSebelum = currentStock,
                    StokSesudah = newStock,
                    Referensi = model.NoFaktur
                });
        }

        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<PembelianObat>.Ok(model, "Pembelian obat berhasil disimpan dan stok otomatis bertambah!"));
    }
}
