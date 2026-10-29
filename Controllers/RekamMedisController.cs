using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RekamMedisController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public RekamMedisController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<RekamMedis>>>> GetAll([FromQuery] string? search)
    {
        using var conn = _db.CreateConnection();
        string sql = @"
            SELECT 
                rm.*,
                k.no_kunjungan AS NoKunjungan,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                d.nama_dokter AS NamaDokter
            FROM rekam_medis rm
            JOIN kunjungan k ON rm.kunjungan_id = k.id
            JOIN pasien p ON rm.pasien_id = p.id
            LEFT JOIN dokter d ON rm.dokter_id = d.id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (p.nama_pasien LIKE @Search OR p.no_rm LIKE @Search OR k.no_kunjungan LIKE @Search OR rm.diagnosis LIKE @Search)";
        }

        sql += " ORDER BY rm.id DESC";

        var items = await conn.QueryAsync<RekamMedis>(sql, new { Search = $"%{search}%" });
        return Ok(ApiResponse<IEnumerable<RekamMedis>>.Ok(items, "Data rekam medis berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RekamMedis>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT 
                rm.*,
                k.no_kunjungan AS NoKunjungan,
                p.nama_pasien AS NamaPasien,
                p.no_rm AS NoRm,
                d.nama_dokter AS NamaDokter
            FROM rekam_medis rm
            JOIN kunjungan k ON rm.kunjungan_id = k.id
            JOIN pasien p ON rm.pasien_id = p.id
            LEFT JOIN dokter d ON rm.dokter_id = d.id
            WHERE rm.id = @Id";

        var rm = await conn.QueryFirstOrDefaultAsync<RekamMedis>(sql, new { Id = id });
        if (rm == null) return NotFound(ApiResponse<RekamMedis>.Fail("Rekam medis tidak ditemukan"));

        // Load tindakan
        const string sqlTindakan = @"
            SELECT dt.tindakan_id AS TindakanId, t.nama_tindakan AS NamaTindakan, dt.jumlah, dt.harga_satuan, dt.subtotal, dt.catatan
            FROM detail_tindakan dt
            JOIN tindakan t ON dt.tindakan_id = t.id
            WHERE dt.rekam_medis_id = @RmId";
        rm.ListTindakan = (await conn.QueryAsync<DetailTindakanDto>(sqlTindakan, new { RmId = id })).AsList();

        // Load diagnosa IDs
        const string sqlDiagnosa = "SELECT diagnosa_id FROM rekam_medis_diagnosa WHERE rekam_medis_id = @RmId";
        rm.DiagnosaIds = (await conn.QueryAsync<int>(sqlDiagnosa, new { RmId = id })).AsList();

        return Ok(ApiResponse<RekamMedis>.Ok(rm));
    }

    [HttpGet("by-kunjungan/{kunjunganId}")]
    public async Task<ActionResult<ApiResponse<RekamMedis>>> GetByKunjungan(int kunjunganId)
    {
        using var conn = _db.CreateConnection();
        var rmId = await conn.ExecuteScalarAsync<int?>("SELECT id FROM rekam_medis WHERE kunjungan_id = @KunjunganId ORDER BY id DESC LIMIT 1", new { KunjunganId = kunjunganId });
        if (!rmId.HasValue) return Ok(ApiResponse<RekamMedis?>.Ok(null, "Belum ada rekam medis untuk kunjungan ini"));

        return await GetById(rmId.Value);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<RekamMedis>>> Create([FromBody] RekamMedis model)
    {
        if (model.KunjunganId <= 0 || model.PasienId <= 0)
            return BadRequest(ApiResponse<RekamMedis>.Fail("Kunjungan dan Pasien wajib valid"));

        using var conn = _db.CreateConnection();

        const string sqlRm = @"
            INSERT INTO rekam_medis (
                kunjungan_id, pasien_id, dokter_id, tanggal_pemeriksaan,
                keluhan_utama, riwayat_penyakit, riwayat_alergi,
                tekanan_darah, suhu, berat_badan, tinggi_badan, denyut_nadi, frekuensi_nafas,
                pemeriksaan_fisik, hasil_pemeriksaan, diagnosis, tindakan, catatan_dokter, status
            ) VALUES (
                @KunjunganId, @PasienId, @DokterId, NOW(),
                @KeluhanUtama, @RiwayatPenyakit, @RiwayatAlergi,
                @TekananDarah, @Suhu, @BeratBadan, @TinggiBadan, @DenyutNadi, @FrekuensiNafas,
                @PemeriksaanFisik, @HasilPemeriksaan, @Diagnosis, @Tindakan, @CatatanDokter, @Status
            );
            SELECT LAST_INSERT_ID();";

        var rmId = await conn.ExecuteScalarAsync<int>(sqlRm, model);
        model.Id = rmId;

        // Insert Diagnosa
        if (model.DiagnosaIds != null && model.DiagnosaIds.Count > 0)
        {
            foreach (var diagId in model.DiagnosaIds)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO rekam_medis_diagnosa (rekam_medis_id, diagnosa_id, tipe) VALUES (@RmId, @DiagId, 'utama')",
                    new { RmId = rmId, DiagId = diagId });
            }
        }

        // Insert Detail Tindakan
        if (model.ListTindakan != null && model.ListTindakan.Count > 0)
        {
            foreach (var tdk in model.ListTindakan)
            {
                if (tdk.Subtotal <= 0) tdk.Subtotal = tdk.Jumlah * tdk.HargaSatuan;
                await conn.ExecuteAsync(@"
                    INSERT INTO detail_tindakan (rekam_medis_id, tindakan_id, jumlah, harga_satuan, subtotal, catatan)
                    VALUES (@RmId, @TindakanId, @Jumlah, @HargaSatuan, @Subtotal, @Catatan)",
                    new { RmId = rmId, tdk.TindakanId, tdk.Jumlah, tdk.HargaSatuan, tdk.Subtotal, tdk.Catatan });
            }
        }

        // Update status kunjungan ke 'diperiksa' atau 'selesai'
        await conn.ExecuteAsync("UPDATE kunjungan SET status = 'diperiksa' WHERE id = @KunjunganId", new { model.KunjunganId });

        return Ok(ApiResponse<RekamMedis>.Ok(model, "Rekam medis berhasil disimpan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<RekamMedis>>> Update(int id, [FromBody] RekamMedis model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE rekam_medis SET
                dokter_id = @DokterId,
                keluhan_utama = @KeluhanUtama,
                riwayat_penyakit = @RiwayatPenyakit,
                riwayat_alergi = @RiwayatAlergi,
                tekanan_darah = @TekananDarah,
                suhu = @Suhu,
                berat_badan = @BeratBadan,
                tinggi_badan = @TinggiBadan,
                denyut_nadi = @DenyutNadi,
                frekuensi_nafas = @FrekuensiNafas,
                pemeriksaan_fisik = @PemeriksaanFisik,
                hasil_pemeriksaan = @HasilPemeriksaan,
                diagnosis = @Diagnosis,
                tindakan = @Tindakan,
                catatan_dokter = @CatatanDokter,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<RekamMedis>.Fail("Rekam medis tidak ditemukan"));

        // Refresh tindakan & diagnosa if provided
        if (model.ListTindakan != null && model.ListTindakan.Count > 0)
        {
            await conn.ExecuteAsync("DELETE FROM detail_tindakan WHERE rekam_medis_id = @Id", new { Id = id });
            foreach (var tdk in model.ListTindakan)
            {
                if (tdk.Subtotal <= 0) tdk.Subtotal = tdk.Jumlah * tdk.HargaSatuan;
                await conn.ExecuteAsync(@"
                    INSERT INTO detail_tindakan (rekam_medis_id, tindakan_id, jumlah, harga_satuan, subtotal, catatan)
                    VALUES (@Id, @TindakanId, @Jumlah, @HargaSatuan, @Subtotal, @Catatan)",
                    new { Id = id, tdk.TindakanId, tdk.Jumlah, tdk.HargaSatuan, tdk.Subtotal, tdk.Catatan });
            }
        }

        return Ok(ApiResponse<RekamMedis>.Ok(model, "Rekam medis berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM rekam_medis WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Rekam medis tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Rekam medis berhasil dihapus"));
    }
}
