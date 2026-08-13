using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<Apartment> Apartments => Set<Apartment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<DuesPeriod> DuesPeriods => Set<DuesPeriod>();
    public DbSet<DuesRecord> DuesRecords => Set<DuesRecord>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Issue> Issues => Set<Issue>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Bank> Banks => Set<Bank>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<PlanPayment> PlanPayments => Set<PlanPayment>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ExtraCollection> ExtraCollections => Set<ExtraCollection>();
    public DbSet<ExtraCollectionRecord> ExtraCollectionRecords => Set<ExtraCollectionRecord>();
    public DbSet<Decision> Decisions => Set<Decision>();
    public DbSet<Survey> Surveys => Set<Survey>();
    public DbSet<SurveyOption> SurveyOptions => Set<SurveyOption>();
    public DbSet<SurveyVote> SurveyVotes => Set<SurveyVote>();
    public DbSet<Visitor> Visitors => Set<Visitor>();
    public DbSet<ParkingPermit> ParkingPermits => Set<ParkingPermit>();
    public DbSet<AdminVote> AdminVotes => Set<AdminVote>();
    public DbSet<AdminVoteChoice> AdminVoteChoices => Set<AdminVoteChoice>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Apartment>()
            .HasOne(a => a.Owner)
            .WithMany(u => u.OwnedApartments)
            .HasForeignKey(a => a.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Apartment>()
            .HasOne(a => a.Resident)
            .WithMany(u => u.ResidentApartments)
            .HasForeignKey(a => a.ResidentId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Issue>()
            .HasOne(i => i.CreatedBy)
            .WithMany(u => u.ReportedIssues)
            .HasForeignKey(i => i.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Issue>()
            .HasOne(i => i.AssignedTo)
            .WithMany()
            .HasForeignKey(i => i.AssignedToId)
            .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<User>()
            .HasIndex(u => new { u.SiteId, u.Email })
            .IsUnique();

        mb.Entity<DuesRecord>()
            .HasIndex(d => new { d.DuesPeriodId, d.ApartmentId })
            .IsUnique();

        mb.Entity<Block>()
            .HasOne(b => b.Site)
            .WithMany(s => s.Blocks)
            .HasForeignKey(b => b.SiteId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Apartment>()
            .HasOne(a => a.Block)
            .WithMany(b => b.Apartments)
            .HasForeignKey(a => a.BlockId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Apartment>()
            .Property(a => a.SquareMeters)
            .HasColumnType("numeric(8,2)");

        mb.Entity<Apartment>()
            .Property(a => a.LandShare)
            .HasColumnType("numeric(10,2)");

        mb.Entity<Apartment>()
            .Property(a => a.MonthlyDues)
            .HasColumnType("numeric(12,2)");

        mb.Entity<Block>()
            .Property(b => b.DuesCoefficient)
            .HasColumnType("numeric(10,2)");

        mb.Entity<Site>()
            .Property(s => s.DuesBaseAmount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<Payment>()
            .Property(p => p.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<DuesPeriod>()
            .Property(d => d.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<DuesRecord>()
            .Property(d => d.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<Expense>()
            .Property(e => e.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<PlanPayment>()
            .Property(p => p.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<PlanPayment>()
            .HasIndex(p => new { p.SiteId, p.Year, p.Month })
            .IsUnique();

        mb.Entity<AdminVote>()
            .HasOne(v => v.Nominee)
            .WithMany()
            .HasForeignKey(v => v.NomineeId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<AdminVote>()
            .HasOne(v => v.StartedBy)
            .WithMany()
            .HasForeignKey(v => v.StartedById)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<AdminVoteChoice>()
            .HasIndex(c => new { c.AdminVoteId, c.UserId })
            .IsUnique();

        mb.Entity<Message>()
            .HasOne(m => m.FromUser)
            .WithMany()
            .HasForeignKey(m => m.FromUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Message>()
            .HasOne(m => m.ToUser)
            .WithMany()
            .HasForeignKey(m => m.ToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Message>()
            .HasIndex(m => new { m.SiteId, m.FromUserId, m.ToUserId });

        mb.Entity<ExtraCollection>()
            .Property(e => e.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<ExtraCollectionRecord>()
            .Property(e => e.Amount)
            .HasColumnType("numeric(12,2)");

        mb.Entity<ExtraCollectionRecord>()
            .HasOne(r => r.ExtraCollection)
            .WithMany(c => c.Records)
            .HasForeignKey(r => r.ExtraCollectionId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<ExtraCollectionRecord>()
            .HasOne(r => r.Apartment)
            .WithMany()
            .HasForeignKey(r => r.ApartmentId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<ExtraCollectionRecord>()
            .HasIndex(r => new { r.ExtraCollectionId, r.ApartmentId })
            .IsUnique();

        mb.Entity<SurveyOption>()
            .HasOne(o => o.Survey).WithMany(s => s.Options)
            .HasForeignKey(o => o.SurveyId).OnDelete(DeleteBehavior.Cascade);

        mb.Entity<SurveyVote>()
            .HasOne(v => v.Survey).WithMany(s => s.Votes)
            .HasForeignKey(v => v.SurveyId).OnDelete(DeleteBehavior.Cascade);

        mb.Entity<SurveyVote>()
            .HasIndex(v => new { v.SurveyId, v.UserId }).IsUnique();

        mb.Entity<Visitor>()
            .HasOne(v => v.Apartment).WithMany()
            .HasForeignKey(v => v.ApartmentId).OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Visitor>()
            .HasIndex(v => new { v.SiteId, v.EntryTime });

        mb.Entity<ParkingPermit>()
            .HasOne(p => p.Apartment).WithMany()
            .HasForeignKey(p => p.ApartmentId).OnDelete(DeleteBehavior.SetNull);

        mb.Entity<ParkingPermit>()
            .HasIndex(p => new { p.SiteId, p.PlateNormalized });
    }
}
