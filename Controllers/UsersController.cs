using Dapper;
using Microsoft.AspNetCore.Mvc;
using SimKlinik.Data;
using SimKlinik.Models;

namespace SimKlinik.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public UsersController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetAll()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT id, username, nama_lengkap, email, role, status, created_at, updated_at FROM users ORDER BY id DESC";
        var users = await conn.QueryAsync<User>(sql);
        return Ok(ApiResponse<IEnumerable<User>>.Ok(users, "Data pengguna berhasil diambil"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<User>>> GetById(int id)
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT id, username, nama_lengkap, email, role, status, created_at, updated_at FROM users WHERE id = @Id";
        var user = await conn.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
        if (user == null)
            return NotFound(ApiResponse<User>.Fail("Pengguna tidak ditemukan"));

        return Ok(ApiResponse<User>.Ok(user));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<User>>> Create([FromBody] User model)
    {
        if (string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.NamaLengkap))
            return BadRequest(ApiResponse<User>.Fail("Username dan Nama Lengkap wajib diisi"));

        using var conn = _db.CreateConnection();
        var exists = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE username = @Username", new { model.Username });
        if (exists > 0)
            return BadRequest(ApiResponse<User>.Fail("Username sudah digunakan"));

        var passwordHash = !string.IsNullOrWhiteSpace(model.Password)
            ? BCrypt.Net.BCrypt.HashPassword(model.Password)
            : BCrypt.Net.BCrypt.HashPassword("password");

        const string sql = @"
            INSERT INTO users (username, password, nama_lengkap, email, role, status)
            VALUES (@Username, @Password, @NamaLengkap, @Email, @Role, @Status);
            SELECT LAST_INSERT_ID();";

        var id = await conn.ExecuteScalarAsync<int>(sql, new
        {
            model.Username,
            Password = passwordHash,
            model.NamaLengkap,
            model.Email,
            model.Role,
            Status = string.IsNullOrWhiteSpace(model.Status) ? "aktif" : model.Status
        });

        model.Id = id;
        model.Password = null;
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<User>.Ok(model, "Pengguna berhasil ditambahkan"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<User>>> Update(int id, [FromBody] User model)
    {
        using var conn = _db.CreateConnection();
        var user = await conn.QueryFirstOrDefaultAsync<User>("SELECT * FROM users WHERE id = @Id", new { Id = id });
        if (user == null)
            return NotFound(ApiResponse<User>.Fail("Pengguna tidak ditemukan"));

        string sql;
        if (!string.IsNullOrWhiteSpace(model.Password))
        {
            var hash = BCrypt.Net.BCrypt.HashPassword(model.Password);
            sql = @"
                UPDATE users SET 
                    nama_lengkap = @NamaLengkap,
                    email = @Email,
                    role = @Role,
                    status = @Status,
                    password = @Password
                WHERE id = @Id";
            await conn.ExecuteAsync(sql, new { model.NamaLengkap, model.Email, model.Role, model.Status, Password = hash, Id = id });
        }
        else
        {
            sql = @"
                UPDATE users SET 
                    nama_lengkap = @NamaLengkap,
                    email = @Email,
                    role = @Role,
                    status = @Status
                WHERE id = @Id";
            await conn.ExecuteAsync(sql, new { model.NamaLengkap, model.Email, model.Role, model.Status, Id = id });
        }

        model.Id = id;
        model.Password = null;
        return Ok(ApiResponse<User>.Ok(model, "Data pengguna berhasil diperbarui"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        using var conn = _db.CreateConnection();
        var affected = await conn.ExecuteAsync("DELETE FROM users WHERE id = @Id", new { Id = id });
        if (affected == 0)
            return NotFound(ApiResponse<object>.Fail("Pengguna tidak ditemukan"));

        return Ok(ApiResponse<object>.Ok(null, "Pengguna berhasil dihapus"));
    }
}
