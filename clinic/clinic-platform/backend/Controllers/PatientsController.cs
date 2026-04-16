using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsController(AppDbContext db) => _db = db;

    private async Task<Guid?> GetClinicIdAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.Where(x => x.Id == userId).Select(x => (Guid?)x.ClinicId).FirstOrDefaultAsync();
    }

    // GET api/patients?search=&leadStatus=&page=1&pageSize=50
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? leadStatus,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        pageSize = Math.Clamp(pageSize, 1, 200);
        page     = Math.Max(1, page);

        var q = _db.Patients.Where(x => x.ClinicId == clinicId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower().Trim();
            q = q.Where(x =>
                x.FirstName.ToLower().Contains(s) ||
                x.LastName.ToLower().Contains(s)  ||
                (x.Phone != null && x.Phone.Contains(s)) ||
                (x.Email != null && x.Email.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(leadStatus))
            q = q.Where(x => x.LeadStatus == leadStatus);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new PatientResponse
            {
                Id = x.Id, FirstName = x.FirstName, LastName = x.LastName,
                Phone = x.Phone, Email = x.Email, BirthDate = x.BirthDate,
                Gender = x.Gender, Country = x.Country, City = x.City,
                InterestedProcedure = x.InterestedProcedure, LeadSource = x.LeadSource,
                AssignedConsultant = x.AssignedConsultant, LeadStatus = x.LeadStatus,
                Notes = x.Notes, CreatedAtUtc = x.CreatedAtUtc, UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync();

        Response.Headers["X-Total-Count"] = total.ToString();
        return Ok(items);
    }

    // GET api/patients/lead-counts  — kanban sutun sayıları
    [HttpGet("lead-counts")]
    public async Task<IActionResult> GetLeadCounts()
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var counts = await _db.Patients
            .Where(x => x.ClinicId == clinicId.Value)
            .GroupBy(x => x.LeadStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var result = LeadStatuses.All.Select(s => new
        {
            status = s,
            count  = counts.FirstOrDefault(x => x.Status == s)?.Count ?? 0
        });

        return Ok(result);
    }

    // GET api/patients/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var p = await _db.Patients.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (p is null) return NotFound(new { message = "Hasta bulunamadı." });

        return Ok(Map(p));
    }

    // POST api/patients
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest req)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.FirstName)) return BadRequest(new { message = "Ad zorunlu." });
        if (string.IsNullOrWhiteSpace(req.LastName))  return BadRequest(new { message = "Soyad zorunlu." });

        var p = new Patient
        {
            ClinicId            = clinicId.Value,
            FirstName           = req.FirstName.Trim(),
            LastName            = req.LastName.Trim(),
            Phone               = req.Phone?.Trim(),
            Email               = req.Email?.Trim().ToLower(),
            BirthDate           = req.BirthDate.HasValue
                                    ? DateTime.SpecifyKind(req.BirthDate.Value.Date, DateTimeKind.Utc)
                                    : null,
            Gender              = req.Gender,
            Country             = req.Country?.Trim(),
            City                = req.City?.Trim(),
            InterestedProcedure = req.InterestedProcedure?.Trim(),
            LeadSource          = req.LeadSource?.Trim(),
            AssignedConsultant  = req.AssignedConsultant?.Trim(),
            LeadStatus          = string.IsNullOrWhiteSpace(req.LeadStatus) ? LeadStatuses.New : req.LeadStatus,
            Notes               = req.Notes
        };

        _db.Patients.Add(p);
        await _db.SaveChangesAsync();
        return Ok(p.Id);
    }

    // PUT api/patients/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePatientRequest req)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var p = await _db.Patients.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (p is null) return NotFound(new { message = "Hasta bulunamadı." });

        if (string.IsNullOrWhiteSpace(req.FirstName)) return BadRequest(new { message = "Ad zorunlu." });
        if (string.IsNullOrWhiteSpace(req.LastName))  return BadRequest(new { message = "Soyad zorunlu." });

        p.FirstName           = req.FirstName.Trim();
        p.LastName            = req.LastName.Trim();
        p.Phone               = req.Phone?.Trim();
        p.Email               = req.Email?.Trim().ToLower();
        p.BirthDate           = req.BirthDate.HasValue
                                    ? DateTime.SpecifyKind(req.BirthDate.Value.Date, DateTimeKind.Utc)
                                    : null;
        p.Gender              = req.Gender;
        p.Country             = req.Country?.Trim();
        p.City                = req.City?.Trim();
        p.InterestedProcedure = req.InterestedProcedure?.Trim();
        p.LeadSource          = req.LeadSource?.Trim();
        p.AssignedConsultant  = req.AssignedConsultant?.Trim();
        if (!string.IsNullOrWhiteSpace(req.LeadStatus)) p.LeadStatus = req.LeadStatus;
        p.Notes               = req.Notes;
        p.UpdatedAtUtc        = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(p.Id);
    }

    // PATCH api/patients/{id}/lead-status
    [HttpPatch("{id:guid}/lead-status")]
    public async Task<IActionResult> UpdateLeadStatus(Guid id, [FromBody] UpdateLeadStatusRequest req)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        if (!LeadStatuses.All.Contains(req.LeadStatus))
            return BadRequest(new { message = $"Geçersiz lead status. Geçerli: {string.Join(", ", LeadStatuses.All)}" });

        var p = await _db.Patients.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (p is null) return NotFound(new { message = "Hasta bulunamadı." });

        p.LeadStatus   = req.LeadStatus;
        p.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { id = p.Id, leadStatus = p.LeadStatus });
    }

    // DELETE api/patients/{id}
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var p = await _db.Patients.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (p is null) return NotFound(new { message = "Hasta bulunamadı." });

        _db.Patients.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/patients/import  — CSV bulk import
    // Expected CSV columns (header row required):
    //   Ad, Soyad, Telefon, Email, Cinsiyet, DoğumTarihi, Şehir, Ülke, İlgiProsedür, LeadKaynak, LeadDurum, Notlar
    [HttpPost("import")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();
        if (file is null || file.Length == 0) return BadRequest(new { message = "Dosya boş." });
        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Yalnızca .csv dosyası kabul edilir." });

        using var reader = new System.IO.StreamReader(file.OpenReadStream());
        var headerLine = await reader.ReadLineAsync();
        if (headerLine is null) return BadRequest(new { message = "Dosya boş." });

        // Parse header → column index map (flexible, case-insensitive)
        var cols = headerLine.Split(',').Select(c => c.Trim().Trim('"').ToLowerInvariant()).ToArray();
        int Idx(params string[] aliases) {
            foreach (var a in aliases) {
                var i = Array.IndexOf(cols, a.ToLowerInvariant());
                if (i >= 0) return i;
            }
            return -1;
        }
        int iFirst  = Idx("ad", "firstname", "isim", "name");
        int iLast   = Idx("soyad", "lastname", "soyadı");
        int iPhone  = Idx("telefon", "phone", "tel");
        int iEmail  = Idx("email", "e-posta", "eposta");
        int iGender = Idx("cinsiyet", "gender");
        int iBirth  = Idx("doğumtarihi", "dogumtarihi", "birthdate", "doğum tarihi");
        int iCity   = Idx("şehir", "sehir", "city");
        int iCountry= Idx("ülke", "ulke", "country");
        int iProc   = Idx("ilgiprosedür", "ilgiprosedur", "procedure", "işlem");
        int iSource = Idx("leadkaynak", "lead_kaynak", "leadsource", "kaynak");
        int iStatus = Idx("leaddurum", "lead_durum", "leadstatus", "durum");
        int iNotes  = Idx("notlar", "notes", "not");

        if (iFirst < 0 || iLast < 0)
            return BadRequest(new { message = "CSV başlık satırında 'Ad' ve 'Soyad' kolonları zorunludur." });

        var imported = 0;
        var skipped  = 0;
        var errors   = new List<string>();
        var row = 0;

        while (!reader.EndOfStream)
        {
            row++;
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;

            var fields = ParseCsvLine(line);
            string Cell(int i) => i >= 0 && i < fields.Length ? fields[i].Trim().Trim('"') : "";

            var firstName = Cell(iFirst);
            var lastName  = Cell(iLast);
            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
            {
                errors.Add($"Satır {row}: Ad veya soyad boş, atlandı.");
                skipped++;
                continue;
            }

            DateTime? birthDate = null;
            var birthStr = Cell(iBirth);
            if (!string.IsNullOrEmpty(birthStr) && DateTime.TryParse(birthStr, out var bd))
                birthDate = DateTime.SpecifyKind(bd.Date, DateTimeKind.Utc);

            var leadStatus = Cell(iStatus);
            if (!LeadStatuses.All.Contains(leadStatus)) leadStatus = LeadStatuses.New;

            _db.Patients.Add(new Patient
            {
                ClinicId            = clinicId.Value,
                FirstName           = firstName,
                LastName            = lastName,
                Phone               = Cell(iPhone)  is { Length: > 0 } p ? p : null,
                Email               = Cell(iEmail)  is { Length: > 0 } e ? e.ToLower() : null,
                Gender              = Cell(iGender) is { Length: > 0 } g ? g : null,
                BirthDate           = birthDate,
                City                = Cell(iCity)   is { Length: > 0 } c ? c : null,
                Country             = Cell(iCountry)is { Length: > 0 } u ? u : null,
                InterestedProcedure = Cell(iProc)   is { Length: > 0 } pr? pr: null,
                LeadSource          = Cell(iSource) is { Length: > 0 } s ? s : null,
                Notes               = Cell(iNotes)  is { Length: > 0 } n ? n : null,
                LeadStatus          = leadStatus,
            });
            imported++;

            // Batch save every 50 rows to avoid giant transactions
            if (imported % 50 == 0) await _db.SaveChangesAsync();
        }

        if (imported > 0) await _db.SaveChangesAsync();

        return Ok(new { imported, skipped, errors, total = row });
    }

    private static string[] ParseCsvLine(string line)
    {
        // Simple CSV parser handling quoted fields
        var result = new List<string>();
        var current = new System.Text.StringBuilder();
        bool inQuotes = false;
        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"') { inQuotes = !inQuotes; }
            else if (c == ',' && !inQuotes) { result.Add(current.ToString()); current.Clear(); }
            else { current.Append(c); }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    // GET api/patients/import/template  — download CSV template
    [HttpGet("import/template")]
    public IActionResult DownloadTemplate()
    {
        var csv = "Ad,Soyad,Telefon,Email,Cinsiyet,DoğumTarihi,Şehir,Ülke,İlgiProsedür,LeadKaynak,LeadDurum,Notlar\n" +
                  "Ahmet,Yılmaz,+905551234567,ahmet@example.com,Erkek,1985-03-15,İstanbul,Türkiye,Rinoplasti,Web Sitesi,Yeni,\n" +
                  "Fatma,Kaya,+905559876543,fatma@example.com,Kadın,1990-07-22,Ankara,Türkiye,Botoks,Sosyal Medya,Görüşüldü,İlk görüşme tamam";
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "hasta_import_sablonu.csv");
    }

    private static PatientResponse Map(Patient p) => new()
    {
        Id = p.Id, FirstName = p.FirstName, LastName = p.LastName,
        Phone = p.Phone, Email = p.Email, BirthDate = p.BirthDate,
        Gender = p.Gender, Country = p.Country, City = p.City,
        InterestedProcedure = p.InterestedProcedure, LeadSource = p.LeadSource,
        AssignedConsultant = p.AssignedConsultant, LeadStatus = p.LeadStatus,
        Notes = p.Notes, CreatedAtUtc = p.CreatedAtUtc, UpdatedAtUtc = p.UpdatedAtUtc
    };
}
