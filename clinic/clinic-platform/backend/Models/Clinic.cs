namespace ClinicPlatform.Api.Models;

public class Clinic
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Country { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Personel login için e-posta domain doğrulaması. Ör: "klinik-a.com.tr"
    /// Bu domain'e sahip e-postalar otomatik olarak bu kliniğe yönlendirilir.
    /// </summary>
    public string? EmailDomain { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>null = ömür boyu, dolmuşsa hesap kilitlenir</summary>
    public DateTime? TrialEndsAtUtc { get; set; }

    /// <summary>trial | starter | klinik | pro</summary>
    public string? Plan { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
