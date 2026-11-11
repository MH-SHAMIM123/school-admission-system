using Microsoft.EntityFrameworkCore;
using AdmissionSystem.Api.Models;

namespace AdmissionSystem.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<SchoolClass> SchoolClasses => Set<SchoolClass>();
    public DbSet<SeatHold> SeatHolds => Set<SeatHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasMaxLength(64);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
            entity.Property(c => c.TotalSeats).IsRequired();
            entity.Property(c => c.CreatedAtUtc).IsRequired();

            entity.HasMany(c => c.Holds)
                  .WithOne(h => h.SchoolClass)
                  .HasForeignKey(h => h.ClassId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SeatHold>(entity =>
        {
            entity.HasKey(h => h.HoldId);
            entity.Property(h => h.HoldId).HasMaxLength(64);
            entity.Property(h => h.ClassId).IsRequired().HasMaxLength(64);
            entity.Property(h => h.StudentId).IsRequired().HasMaxLength(17);
            entity.Property(h => h.Status).IsRequired().HasMaxLength(20);
            entity.Property(h => h.CreatedAtUtc).IsRequired();
            entity.Property(h => h.ExpiresAtUtc).IsRequired();

            entity.HasIndex(h => new { h.ClassId, h.Status, h.ExpiresAtUtc })
                  .HasDatabaseName("IX_SeatHolds_ClassId_Status_ExpiresAtUtc");

            entity.HasIndex(h => new { h.StudentId, h.ClassId })
                  .HasDatabaseName("IX_SeatHolds_StudentId_ClassId");

            entity.HasIndex(h => h.StudentId)
                  .HasDatabaseName("IX_SeatHolds_StudentId");
        });
    }
}
