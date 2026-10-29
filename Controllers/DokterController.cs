using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DokterController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public DokterController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Dokter>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT d.*, u.nama_lengkap AS NamaUser
            FROM dokter d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.nama_dokter ASC";
        var items = await conn.QueryAsync<Dokter>(sql);
        return Ok(ApiResponse<IEnumerable<Dokter>>.Ok(items, "Data dokter berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Dokter>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT d.*, u.nama_lengkap AS NamaUser
            FROM dokter d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = @Id";
        var item = await conn.QueryFirstOrDefaultAsync<Dokter>(sql, new { Id = id });
        if (item == null) return NotFound(ApiResponse<Dokter>.Fail("Dokter tidak ditemukan"));
        return Ok(ApiResponse<Dokter>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Dokter>>> Create([FromBody] Dokter model)
    {
        if (string.IsNullOrWhiteSpace(model.NamaDokter))
            return BadRequest(ApiResponse<Dokter>.Fail("Nama Dokter wajib diisi"));

        using var conn = _db.CreateConnection();
        if (string.IsNullOrWhiteSpace(model.KodeDokter))
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dokter");
            model.KodeDokter = $"DOC-{(count + 1).ToString().PadLeft(3, '0')}";
        }

        const string sql = @"
            INSERT INTO dokter (user_id, kode_dokter, nama_dokter, no_str, no_sip, spesialisasi, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, telepon, email, tarif_konsultasi, status)
            VALUES (@UserId, @KodeDokter, @NamaDokter, @NoStr, @NoSip, @Spesialisasi, @JenisKelamin, @TempatLahir, @TanggalLahir, @Alamat, @Telepon, @Email, @TarifKonsultasi, @Status);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Dokter>.Ok(model, "Dokter berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Dokter>>> Update(int id, [FromBody] Dokter model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE dokter SET 
                user_id = @UserId,
                kode_dokter = @KodeDokter,
                nama_dokter = @NamaDokter,
                no_str = @NoStr,
                no_sip = @NoSip,
                spesialisasi = @Spesialisasi,
                jenis_kelamin = @JenisKelamin,
                tempat_lahir = @TempatLahir,
                tanggal_lahir = @TanggalLahir,
                alamat = @Alamat,
                telepon = @Telepon,
                email = @Email,
                tarif_konsultasi = @TarifKonsultasi,
                status = @Status
            WHERE id = @Id";

        model.Id = id;
        var affected = await conn.ExecuteAsync(sql, model);
        if (affected == 0) return NotFound(ApiResponse<Dokter>.Fail("Dokter tidak ditemukan"));

        return Ok(ApiResponse<Dokter>.Ok(model, "Data dokter berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM dokter WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Dokter tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Dokter berhasil dihapus"));
    }

    // Jadwal Dokter Endpoints
    [HttpGet("jadwal")]
    public async Task<ActionResult<ApiResponse<IEnumerable<JadwalDokter>>>> GetJadwal()
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            SELECT jd.*, d.nama_dokter AS NamaDokter, d.spesialisasi AS Spesialisasi, p.nama_poli AS NamaPoli
            FROM jadwal_dokter jd
            JOIN dokter d ON jd.dokter_id = d.id
            JOIN poli p ON jd.poli_id = p.id
            ORDER BY FIELD(jd.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), jd.jam_mulai ASC";
        var items = await conn.QueryAsync<JadwalDokter>(sql);
        return Ok(ApiResponse<IEnumerable<JadwalDokter>>.Ok(items, "Data jadwal dokter berhasil diambil"));
    }

    [HttpPost("jadwal")]
    public async Task<ActionResult<ApiResponse<JadwalDokter>>> CreateJadwal([FromBody] JadwalDokter model)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            INSERT INTO jadwal_dokter (dokter_id, poli_id, hari, jam_mulai, jam_selesai, kuota_pasien, status)
            VALUES (@DokterId, @PoliId, @Hari, @JamMulai, @JamSelesai, @KuotaPasien, @Status);
            SELECT LAST_INSERT_ID();";
        var id = await conn.ExecuteScalarAsync<int>(sql, model);
        model.Id = id;
        return Ok(ApiResponse<JadwalDokter>.Ok(model, "Jadwal dokter berhasil disimpan"));
    }

    [HttpDelete("jadwal/{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteJadwal(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM jadwal_dokter WHERE id = @Id", new { Id = id });
        if (affected == 0) return NotFound(ApiResponse<object>.Fail("Jadwal tidak ditemukan"));
        return Ok(ApiResponse<object>.Ok(null, "Jadwal berhasil dihapus"));
    }
}
