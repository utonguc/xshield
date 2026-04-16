using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Services;

/// <summary>
/// Generates an HTML report body for a given report type and clinic.
/// </summary>
public static class ReportBuilder
{
    public static async Task<(string subject, string html)> BuildAsync(
        AppDbContext db, Guid clinicId, string reportType, string reportName)
    {
        var clinic   = await db.Clinics.FirstOrDefaultAsync(x => x.Id == clinicId);
        var clinicName = clinic?.Name ?? "Klinik";
        var now      = DateTime.UtcNow;
        var thisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var subject = $"[{clinicName}] {reportName} — {now:dd MMM yyyy}";
        string body;

        switch (reportType)
        {
            case ReportTypes.Summary:
            {
                var patients     = await db.Patients.CountAsync(x => x.ClinicId == clinicId);
                var doctors      = await db.Doctors.CountAsync(x => x.ClinicId == clinicId && x.IsActive);
                var appts        = await db.Appointments.CountAsync(x => x.ClinicId == clinicId);
                var thisMonthAp  = await db.Appointments.CountAsync(x => x.ClinicId == clinicId && x.StartAtUtc >= thisMonth);
                body = BuildSimpleTable(clinicName, reportName, new[]
                {
                    ("Toplam Hasta",    patients.ToString()),
                    ("Aktif Doktor",    doctors.ToString()),
                    ("Toplam Randevu",  appts.ToString()),
                    ("Bu Ay Randevu",   thisMonthAp.ToString()),
                });
                break;
            }

            case ReportTypes.AppointmentStats:
            {
                var rows = await db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now.AddDays(-30))
                    .GroupBy(x => x.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() })
                    .ToListAsync();
                body = BuildSimpleTable(clinicName, reportName,
                    rows.Select(r => (r.Status, r.Count.ToString())).ToArray());
                break;
            }

            case ReportTypes.LeadFunnel:
            {
                var rows = await db.Patients
                    .Where(x => x.ClinicId == clinicId)
                    .GroupBy(x => x.LeadStatus)
                    .Select(g => new { Status = g.Key, Count = g.Count() })
                    .ToListAsync();
                body = BuildSimpleTable(clinicName, reportName,
                    rows.Select(r => (r.Status, r.Count.ToString())).ToArray());
                break;
            }

            case ReportTypes.DoctorPerformance:
            {
                var rows = await db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now.AddDays(-30))
                    .GroupBy(x => x.Doctor!.FullName)
                    .Select(g => new { Doctor = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .ToListAsync();
                body = BuildSimpleTable(clinicName, reportName,
                    rows.Select(r => (r.Doctor ?? "—", r.Count.ToString())).ToArray());
                break;
            }

            default: // MonthlyOverview
            {
                var trend = await db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now.AddMonths(-3))
                    .GroupBy(x => new { x.StartAtUtc.Year, x.StartAtUtc.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month)
                    .ToListAsync();
                body = BuildSimpleTable(clinicName, reportName,
                    trend.Select(r => ($"{r.Year}/{r.Month:D2}", r.Count.ToString())).ToArray());
                break;
            }
        }

        return (subject, body);
    }

    private static string BuildSimpleTable(string clinicName, string reportName,
        IEnumerable<(string Label, string Value)> rows)
    {
        var rowsHtml = string.Join("", rows.Select((r, i) => $"""
            <tr style="background:{(i % 2 == 0 ? "#f8fafc" : "#fff")}">
              <td style="padding:10px 16px;font-size:14px;color:#344054">{r.Label}</td>
              <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#0f172a;text-align:right">{r.Value}</td>
            </tr>
            """));

        return $"""
            <!DOCTYPE html>
            <html lang="tr">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">
              <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
                <div style="background:#0f172a;padding:28px 32px">
                  <div style="color:#fff;font-size:22px;font-weight:800">EstetixOS</div>
                  <div style="color:#64748b;font-size:13px;margin-top:4px">{clinicName}</div>
                </div>
                <div style="padding:28px 32px">
                  <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px">{reportName}</div>
                  <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #eaecf0">
                    {rowsHtml}
                  </table>
                  <div style="margin-top:24px;font-size:12px;color:#94a3b8">
                    Bu rapor {DateTime.UtcNow:dd.MM.yyyy HH:mm} UTC tarihinde otomatik olarak oluşturulmuştur.
                  </div>
                </div>
              </div>
            </body>
            </html>
            """;
    }
}
