using Npgsql;

namespace AdmissionSystem.Api.Common;

public static class ConfigurationExtensions
{
    public static string GetPostgresConnectionString(this IConfiguration configuration)
    {
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
                          ?? configuration["DATABASE_URL"];

        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            return ParseDatabaseUrl(databaseUrl);
        }

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        return "Host=localhost;Port=5432;Database=school_admission;Username=postgres;Password=postgres";
    }

    public static int GetHoldDurationSeconds(this IConfiguration configuration)
    {
        var envVal = Environment.GetEnvironmentVariable("HOLD_DURATION_SECONDS");
        if (!string.IsNullOrWhiteSpace(envVal) && int.TryParse(envVal, out var envSec) && envSec > 0)
        {
            return envSec;
        }

        var configVal = configuration["HOLD_DURATION_SECONDS"];
        if (!string.IsNullOrWhiteSpace(configVal) && int.TryParse(configVal, out var configSec) && configSec > 0)
        {
            return configSec;
        }

        return 600; // default 600 seconds
    }

    private static string ParseDatabaseUrl(string databaseUrl)
    {
        if (databaseUrl.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        {
            return databaseUrl;
        }

        try
        {
            var uri = new Uri(databaseUrl);
            var userInfo = uri.UserInfo.Split(':');
            var username = userInfo.Length > 0 ? userInfo[0] : "postgres";
            var password = userInfo.Length > 1 ? userInfo[1] : string.Empty;
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = host,
                Port = port,
                Database = database,
                Username = username,
                Password = password,
                SslMode = databaseUrl.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase) 
                    ? SslMode.Require 
                    : SslMode.Prefer
            };

            return builder.ConnectionString;
        }
        catch
        {
            return databaseUrl;
        }
    }
}
