namespace ClinicPlatform.Api.Models;

public class TaskItem
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   ClinicId  { get; set; }
    public Clinic? Clinic   { get; set; }

    public string  Title       { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string  Status      { get; set; } = TaskStatuses.Todo;
    public string  Priority    { get; set; } = TaskPriorities.Medium;

    public Guid?  AssignedToId { get; set; }
    public User?  AssignedTo   { get; set; }

    public Guid?  CreatedById  { get; set; }
    public User?  CreatedBy    { get; set; }

    public DateTime? DueAtUtc    { get; set; }
    public DateTime  CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class TaskStatuses
{
    public const string Todo       = "Todo";
    public const string InProgress = "InProgress";
    public const string Done       = "Done";
    public static readonly string[] All = [Todo, InProgress, Done];
}

public static class TaskPriorities
{
    public const string Low    = "Low";
    public const string Medium = "Medium";
    public const string High   = "High";
    public static readonly string[] All = [Low, Medium, High];
}
