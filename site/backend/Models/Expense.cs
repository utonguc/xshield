namespace SitePlatform.Api.Models;

public class Expense
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Title { get; set; } = "";
    public decimal Amount { get; set; }
    public ExpenseCategory Category { get; set; } = ExpenseCategory.Other;
    public string? Description { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public string? ReceiptNo { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum ExpenseCategory
{
    Cleaning = 0,
    Maintenance = 1,
    Electricity = 2,
    Water = 3,
    Gas = 4,
    Security = 5,
    Elevator = 6,
    Staff = 7,
    Insurance = 8,
    Other = 9
}
