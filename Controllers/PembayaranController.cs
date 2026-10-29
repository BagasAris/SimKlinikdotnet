using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PembayaranController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public PembayaranController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Pembayaran>>>> GetAll([FromQuery] string? status, [FromQuery] string? tanggal)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                p.*,
                k.no_kunjungan AS NoKunjungan,
                pas.nama_pasien AS NamaPasien,
                pas.no_rm AS NoRm,
                u.nama_lengkap AS NamaKasir
            FROM pembayaran p
            JOIN kunjungan k ON p.kunjungan_id = k.id
            JOIN pasien pas ON p.pasien_id = pas.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(status))
        {
            sql += " AND p.status = @Status";
        }
        if (!string.IsNullOrWhiteSpace(tanggal))
        {
            sql += " AND DATE(p.tanggal_pembayaran) = @Tanggal";
        }

        sql += " ORDER BY p.id DESC";

        var items = await conn.QueryAsync<Pembayaran>(sql, new { Status = status, Tanggal = tanggal });
        return Ok(ApiResponse<IEnumerable<Pembayaran>>.Ok(items, "Data pembayaran berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Pembayaran>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                p.*,
                k.no_kunjungan AS NoKunjungan,
                pas.nama_pasien AS NamaPasien,
                pas.no_rm AS NoRm,
                u.nama_lengkap AS NamaKasir
            FROM pembayaran p
            JOIN kunjungan k ON p.kunjungan_id = k.id
            JOIN pasien pas ON p.pasien_id = pas.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = @Id";

        var payment = await conn.QueryFirstOrDefaultAsync<Pembayaran>(sql, new { Id = id });
        if (payment == null) return NotFound(ApiResponse<Pembayaran>.Fail("Data pembayaran tidak ditemukan"));

        const string sqlItems = "SELECT * FROM detail_pembayaran WHERE pembayaran_id = @Id";
        payment.Items = (await conn.QueryAsync<DetailPembayaranDto>(sqlItems, new { Id = id })).AsList();

        return Ok(ApiResponse<Pembayaran>.Ok(payment));
    }

    [HttpGet("kalkulasi/{kunjunganId}")]
    public async Task<ActionResult<ApiResponse<object>>> KalkulasiTagihan(int kunjunganId)
    {
        using var conn = _db.CreateConnection();

        // 1. Ambil data kunjungan
        const string sqlKunjungan = @"
            SELECT k.*, p.nama_pasien AS NamaPasien, p.no_rm AS NoRm, 
                   pol.nama_poli AS NamaPoli, pol.tarif_pendaftaran AS TarifPendaftaran,
                   dok.nama_dokter AS NamaDokter, dok.tarif_konsultasi AS TarifKonsultasi
            FROM kunjungan k
            JOIN pasien p ON k.pasien_id = p.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            WHERE k.id = @Id";
        var k = await conn.QueryFirstOrDefaultAsync<Kunjungan>(sqlKunjungan, new { Id = kunjunganId });
        if (k == null) return NotFound(ApiResponse<object>.Fail("Kunjungan tidak ditemukan"));

        var items = new List<DetailPembayaranDto>();

        // Biaya Pendaftaran
        decimal biayaPendaftaran = k.TarifPendaftaran;
        if (biayaPendaftaran > 0)
        {
            items.Add(new DetailPembayaranDto
            {
                Jenis = "pendaftaran",
                ReferensiId = k.PoliId,
                Keterangan = $"Biaya Pendaftaran {k.NamaPoli}",
                Jumlah = 1,
                HargaSatuan = biayaPendaftaran,
                Subtotal = biayaPendaftaran
            });
        }

        // Biaya Konsultasi Dokter
        decimal biayaKonsultasi = k.TarifKonsultasi;
        if (biayaKonsultasi > 0)
        {
            items.Add(new DetailPembayaranDto
            {
                Jenis = "konsultasi",
                ReferensiId = k.DokterId,
                Keterangan = $"Konsultasi {k.NamaDokter}",
                Jumlah = 1,
                HargaSatuan = biayaKonsultasi,
                Subtotal = biayaKonsultasi
            });
        }

        // Biaya Tindakan dari Rekam Medis
        decimal biayaTindakan = 0;
        const string sqlTindakan = @"
            SELECT dt.tindakan_id AS ReferensiId, t.nama_tindakan AS Keterangan, dt.jumlah, dt.harga_satuan AS HargaSatuan, dt.subtotal
            FROM detail_tindakan dt
            JOIN tindakan t ON dt.tindakan_id = t.id
            JOIN rekam_medis rm ON dt.rekam_medis_id = rm.id
            WHERE rm.kunjungan_id = @KunjunganId";
        var tindakanItems = await conn.QueryAsync<DetailPembayaranDto>(sqlTindakan, new { KunjunganId = kunjunganId });
        foreach (var tdk in tindakanItems)
        {
            tdk.Jenis = "tindakan";
            items.Add(tdk);
            biayaTindakan += tdk.Subtotal;
        }

        // Biaya Obat dari Resep
        decimal biayaObat = 0;
        const string sqlObat = @"
            SELECT dr.obat_id AS ReferensiId, CONCAT(o.nama_obat, ' (', dr.dosis, ')') AS Keterangan, dr.jumlah, dr.harga_satuan AS HargaSatuan, dr.subtotal
            FROM detail_resep dr
            JOIN obat o ON dr.obat_id = o.id
            JOIN resep r ON dr.resep_id = r.id
            JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
            WHERE rm.kunjungan_id = @KunjunganId";
        var obatItems = await conn.QueryAsync<DetailPembayaranDto>(sqlObat, new { KunjunganId = kunjunganId });
        foreach (var obt in obatItems)
        {
            obt.Jenis = "obat";
            items.Add(obt);
            biayaObat += obt.Subtotal;
        }

        decimal totalTagihan = biayaPendaftaran + biayaKonsultasi + biayaTindakan + biayaObat;

        return Ok(ApiResponse<object>.Ok(new
        {
            kunjungan = k,
            biaya_pendaftaran = biayaPendaftaran,
            biaya_konsultasi = biayaKonsultasi,
            biaya_tindakan = biayaTindakan,
            biaya_obat = biayaObat,
            total_tagihan = totalTagihan,
            items
        }, "Kalkulasi tagihan kasir berhasil"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Pembayaran>>> ProcessPayment([FromBody] Pembayaran model)
    {
        if (model.KunjunganId <= 0 || model.PasienId <= 0)
            return BadRequest(ApiResponse<Pembayaran>.Fail("Kunjungan dan Pasien wajib valid"));

        using var conn = _db.CreateConnection();

        // Check if already paid
        var existing = await conn.QueryFirstOrDefaultAsync<Pembayaran>(
            "SELECT id, no_pembayaran FROM pembayaran WHERE kunjungan_id = @KunjunganId AND status = 'lunas'", 
            new { model.KunjunganId });
        if (existing != null)
        {
            return BadRequest(ApiResponse<Pembayaran>.Fail($"Kunjungan ini sudah lunas dibayar dengan No Invoice: {existing.NoPembayaran}"));
        }

        // Auto-generate No Pembayaran INV-YYYYMMDD-XXX
        var today = DateTime.Today.ToString("yyyyMMdd");
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pembayaran WHERE DATE(tanggal_pembayaran) = CURRENT_DATE()");
        model.NoPembayaran = $"INV-{today}-{(count + 1).ToString().PadLeft(3, '0')}";

        model.TanggalPembayaran = DateTime.Now;
        model.Status = "lunas";
        model.Kembalian = Math.Max(0, model.TotalBayar - model.TotalTagihan);

        const string sql = @"
            INSERT INTO pembayaran (
                no_pembayaran, kunjungan_id, pasien_id, user_id,
                tanggal_pembayaran, biaya_pendaftaran, biaya_konsultasi,
                biaya_tindakan, biaya_obat, diskon, pajak, total_tagihan,
                total_bayar, kembalian, metode_pembayaran, status, catatan
            ) VALUES (
                @NoPembayaran, @KunjunganId, @PasienId, @UserId,
                @TanggalPembayaran, @BiayaPendaftaran, @BiayaKonsultasi,
                @BiayaTindakan, @BiayaObat, @Diskon, @Pajak, @TotalTagihan,
                @TotalBayar, @Kembalian, @MetodePembayaran, @Status, @Catatan
            );
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;

        // Insert items
        if (model.Items != null && model.Items.Count > 0)
        {
            foreach (var itm in model.Items)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO detail_pembayaran (pembayaran_id, jenis, referensi_id, keterangan, jumlah, harga_satuan, subtotal)
                    VALUES (@PembayaranId, @Jenis, @ReferensiId, @Keterangan, @Jumlah, @HargaSatuan, @Subtotal)",
                    new {
                        PembayaranId = id,
                        itm.Jenis,
                        itm.ReferensiId,
                        itm.Keterangan,
                        itm.Jumlah,
                        itm.HargaSatuan,
                        itm.Subtotal
                    });
            }
        }

        // Update status kunjungan ke 'selesai'
        await conn.ExecuteAsync("UPDATE kunjungan SET status = 'selesai' WHERE id = @KunjunganId", new { model.KunjunganId });

        return Ok(ApiResponse<Pembayaran>.Ok(model, "Pembayaran berhasil diproses dan kunjungan ditandai selesai!"));
    }

    [HttpGet("{id}/kwitansi")]
    public async Task<ActionResult<ApiResponse<object>>> GetKwitansi(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                p.*,
                k.no_kunjungan AS NoKunjungan,
                k.tanggal_kunjungan AS TanggalKunjungan,
                k.cara_bayar AS CaraBayar,
                pas.nama_pasien AS NamaPasien,
                pas.no_rm AS NoRm,
                pas.alamat AS AlamatPasien,
                u.nama_lengkap AS NamaKasir,
                pol.nama_poli AS NamaPoli,
                dok.nama_dokter AS NamaDokter
            FROM pembayaran p
            JOIN kunjungan k ON p.kunjungan_id = k.id
            JOIN pasien pas ON p.pasien_id = pas.id
            LEFT JOIN poli pol ON k.poli_id = pol.id
            LEFT JOIN dokter dok ON k.dokter_id = dok.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = @Id";

        var kwitansi = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = id });
        if (kwitansi == null) return NotFound(ApiResponse<object>.Fail("Data kwitansi tidak ditemukan"));

        var items = await conn.QueryAsync<DetailPembayaranDto>("SELECT * FROM detail_pembayaran WHERE pembayaran_id = @Id", new { Id = id });
        var settings = await conn.QueryAsync<Pengaturan>("SELECT * FROM pengaturan");

        return Ok(ApiResponse<object>.Ok(new
        {
            kwitansi,
            items,
            klinik = settings.ToDictionary(s => s.Kunci, s => s.Nilai)
        }, "Data kwitansi pembayaran berhasil dimuat"));
    }
}
