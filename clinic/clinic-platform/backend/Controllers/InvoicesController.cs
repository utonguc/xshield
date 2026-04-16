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
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;

    public InvoicesController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static InvoiceResponse ToResponse(Invoice inv) => new()
    {
        Id           = inv.Id,
        InvoiceNo    = inv.InvoiceNo,
        PatientId    = inv.PatientId,
        PatientName  = inv.Patient is null ? "" : $"{inv.Patient.FirstName} {inv.Patient.LastName}".Trim(),
        DoctorId     = inv.DoctorId,
        DoctorName   = inv.Doctor?.FullName,
        IssuedAtUtc  = inv.IssuedAtUtc,
        DueAtUtc     = inv.DueAtUtc,
        Status       = inv.Status,
        Currency     = inv.Currency,
        Subtotal     = inv.Subtotal,
        TaxRate      = inv.TaxRate,
        TaxAmount    = inv.TaxAmount,
        Total        = inv.Total,
        Notes        = inv.Notes,
        CreatedAtUtc = inv.CreatedAtUtc,
        Items        = inv.Items.Select(i => new InvoiceItemResponse
        {
            Id          = i.Id,
            Description = i.Description,
            Quantity    = i.Quantity,
            UnitPrice   = i.UnitPrice,
            LineTotal   = i.LineTotal,
        }).ToList(),
    };

    // GET api/invoices?status=Paid&page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] Guid?   patientId,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.Invoices
            .Where(x => x.ClinicId == clinicId)
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (patientId.HasValue)                 q = q.Where(x => x.PatientId == patientId);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.IssuedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<InvoiceResponse>
        {
            Items    = items.Select(ToResponse).ToList(),
            Total    = total,
            Page     = page,
            PageSize = pageSize,
        });
    }

    // GET api/invoices/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var inv = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Id == id)
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Items)
            .FirstOrDefaultAsync();

        return inv is null ? NotFound() : Ok(ToResponse(inv));
    }

    // POST api/invoices
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        // Fatura no üret: KLN-YYYY-XXXXX
        var count = await _db.Invoices.CountAsync(x => x.ClinicId == clinicId);
        var invoiceNo = $"INV-{DateTime.UtcNow.Year}-{(count + 1):D4}";

        var items = req.Items.Select(i => new InvoiceItem
        {
            Description = i.Description,
            Quantity    = i.Quantity,
            UnitPrice   = i.UnitPrice,
            LineTotal   = i.Quantity * i.UnitPrice,
        }).ToList();

        var subtotal  = items.Sum(i => i.LineTotal);
        var taxAmount = Math.Round(subtotal * req.TaxRate / 100, 2);

        var invoice = new Invoice
        {
            ClinicId    = clinicId,
            PatientId   = req.PatientId,
            DoctorId    = req.DoctorId,
            InvoiceNo   = invoiceNo,
            IssuedAtUtc = req.IssuedAtUtc,
            DueAtUtc    = req.DueAtUtc,
            Currency    = req.Currency,
            TaxRate     = req.TaxRate,
            Subtotal    = subtotal,
            TaxAmount   = taxAmount,
            Total       = subtotal + taxAmount,
            Notes       = req.Notes,
            Items       = items,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        // Reload with navigation props
        var created = await _db.Invoices
            .Where(x => x.Id == invoice.Id)
            .Include(x => x.Patient).Include(x => x.Doctor).Include(x => x.Items)
            .FirstAsync();

        return CreatedAtAction(nameof(Get), new { id = created.Id }, ToResponse(created));
    }

    // PUT api/invoices/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInvoiceRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var invoice = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Id == id)
            .Include(x => x.Items)
            .FirstOrDefaultAsync();

        if (invoice is null) return NotFound();
        if (invoice.Status == InvoiceStatuses.Paid)
            return BadRequest(new { message = "Ödenmiş fatura düzenlenemez." });

        // Items yenile
        _db.InvoiceItems.RemoveRange(invoice.Items);
        var items = req.Items.Select(i => new InvoiceItem
        {
            InvoiceId   = invoice.Id,
            Description = i.Description,
            Quantity    = i.Quantity,
            UnitPrice   = i.UnitPrice,
            LineTotal   = i.Quantity * i.UnitPrice,
        }).ToList();

        var subtotal  = items.Sum(i => i.LineTotal);
        var taxAmount = Math.Round(subtotal * req.TaxRate / 100, 2);

        invoice.PatientId    = req.PatientId;
        invoice.DoctorId     = req.DoctorId;
        invoice.IssuedAtUtc  = req.IssuedAtUtc;
        invoice.DueAtUtc     = req.DueAtUtc;
        invoice.Currency     = req.Currency;
        invoice.TaxRate      = req.TaxRate;
        invoice.Subtotal     = subtotal;
        invoice.TaxAmount    = taxAmount;
        invoice.Total        = subtotal + taxAmount;
        invoice.Notes        = req.Notes;
        invoice.UpdatedAtUtc = DateTime.UtcNow;
        invoice.Items        = items;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Fatura güncellendi." });
    }

    // PATCH api/invoices/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInvoiceStatusRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (!InvoiceStatuses.All.Contains(req.Status))
            return BadRequest(new { message = "Geçersiz durum." });

        var invoice = await _db.Invoices
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);

        if (invoice is null) return NotFound();

        invoice.Status       = req.Status;
        invoice.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Durum güncellendi." });
    }

    // DELETE api/invoices/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var invoice = await _db.Invoices
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);

        if (invoice is null) return NotFound();
        if (invoice.Status == InvoiceStatuses.Paid)
            return BadRequest(new { message = "Ödenmiş fatura silinemez." });

        _db.Invoices.Remove(invoice);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Fatura silindi." });
    }

    // GET api/invoices/summary  — finance sayfası özet kartlar
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var now        = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var invoices = await _db.Invoices
            .Where(x => x.ClinicId == clinicId)
            .Select(x => new { x.Status, x.Total, x.IssuedAtUtc })
            .ToListAsync();

        var totalRevenue   = invoices.Where(x => x.Status == InvoiceStatuses.Paid).Sum(x => x.Total);
        var outstanding    = invoices.Where(x => x.Status is InvoiceStatuses.Sent or InvoiceStatuses.Overdue).Sum(x => x.Total);
        var thisMonthTotal = invoices.Where(x => x.IssuedAtUtc >= monthStart).Sum(x => x.Total);
        var overdueCount   = invoices.Count(x => x.Status == InvoiceStatuses.Overdue);

        return Ok(new { totalRevenue, outstanding, thisMonthTotal, overdueCount });
    }
}
