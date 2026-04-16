namespace ClinicPlatform.Api.Models;

public class Document
{
    public Guid   Id           { get; set; } = Guid.NewGuid();
    public Guid   ClinicId     { get; set; }
    public Clinic? Clinic      { get; set; }

    public Guid?  PatientId    { get; set; }
    public Patient? Patient    { get; set; }

    public Guid?  UploadedById { get; set; }
    public User?  UploadedBy   { get; set; }

    public string OriginalName { get; set; } = string.Empty;  // orijinal dosya adı
    public string StoredName   { get; set; } = string.Empty;  // uuid.ext
    public string Category     { get; set; } = "Diğer";
    public string? Description { get; set; }
    public string MimeType     { get; set; } = string.Empty;
    public long   FileSize     { get; set; }                   // byte

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class DocumentCategories
{
    public const string Patient   = "Hasta";
    public const string Invoice   = "Fatura";
    public const string Contract  = "Sözleşme";
    public const string Lab       = "Tetkik";
    public const string Other     = "Diğer";

    public static readonly string[] All = [Patient, Invoice, Contract, Lab, Other];
}
