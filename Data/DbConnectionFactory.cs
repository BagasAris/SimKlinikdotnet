using System.Data;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace SimKlinik.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=localhost;Port=3306;Database=klinik_db;User ID=root;Password=;";
    }

    public IDbConnection CreateConnection()
    {
        return new MySqlConnection(_connectionString);
    }
}
