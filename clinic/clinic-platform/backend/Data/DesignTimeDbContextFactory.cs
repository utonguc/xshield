using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ClinicPlatform.Api.Data;

/// <summary>
/// Allows `dotnet ef migrations add` to work outside of the running app context.
/// Usage (from backend directory):
///   dotnet ef migrations add InitialCreate --output-dir Data/Migrations
///   dotnet ef migrations add AddSomeFeature  --output-dir Data/Migrations
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Load appsettings for design-time. Falls back to env var for CI/CD.
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connStr = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connStr, b => b.MigrationsHistoryTable("__EFMigrationsHistory"));

        return new AppDbContext(optionsBuilder.Options);
    }
}
