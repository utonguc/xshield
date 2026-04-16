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
public class DoctorScheduleController : ControllerBase
{
    private readonly AppDbContext _db;
    public DoctorScheduleController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetCtxAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        return user is null ? null : (user.Id, user.ClinicId);
    }

    // GET api/doctorschedule/{doctorId}
    [HttpGet("{doctorId:guid}")]
    public async Task<IActionResult> GetSchedule(Guid doctorId)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var schedules = await _db.DoctorSchedules
            .Where(x => x.DoctorId == doctorId && x.ClinicId == ctx.Value.clinicId)
            .OrderBy(x => x.DayOfWeek)
            .ToListAsync();

        return Ok(schedules.Select(s => new DoctorScheduleItem
        {
            Id          = s.Id,
            DayOfWeek   = s.DayOfWeek,
            StartTime   = s.StartTime.ToString(@"hh\:mm"),
            EndTime     = s.EndTime.ToString(@"hh\:mm"),
            SlotMinutes = s.SlotMinutes,
            IsActive    = s.IsActive,
        }));
    }

    // PUT api/doctorschedule/{doctorId}  — full replace
    [HttpPut("{doctorId:guid}")]
    public async Task<IActionResult> SaveSchedule(Guid doctorId, [FromBody] SaveDoctorScheduleRequest req)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var doctor = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.ClinicId == ctx.Value.clinicId);
        if (doctor is null) return NotFound();

        var existing = await _db.DoctorSchedules
            .Where(x => x.DoctorId == doctorId && x.ClinicId == ctx.Value.clinicId)
            .ToListAsync();
        _db.DoctorSchedules.RemoveRange(existing);

        foreach (var s in req.Schedules)
        {
            if (!TimeSpan.TryParse(s.StartTime, out var start)) continue;
            if (!TimeSpan.TryParse(s.EndTime,   out var end))   continue;
            _db.DoctorSchedules.Add(new DoctorSchedule
            {
                DoctorId    = doctorId,
                ClinicId    = ctx.Value.clinicId,
                DayOfWeek   = s.DayOfWeek,
                StartTime   = start,
                EndTime     = end,
                SlotMinutes = s.SlotMinutes > 0 ? s.SlotMinutes : 30,
                IsActive    = s.IsActive,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Program kaydedildi." });
    }

    // GET api/doctorschedule/{doctorId}/leaves
    [HttpGet("{doctorId:guid}/leaves")]
    public async Task<IActionResult> GetLeaves(Guid doctorId)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var leaves = await _db.DoctorLeaves
            .Include(x => x.Doctor)
            .Where(x => x.DoctorId == doctorId && x.ClinicId == ctx.Value.clinicId && x.EndAtUtc >= DateTime.UtcNow.AddDays(-7))
            .OrderBy(x => x.StartAtUtc)
            .ToListAsync();

        return Ok(leaves.Select(l => new DoctorLeaveResponse
        {
            Id         = l.Id,
            StartAtUtc = l.StartAtUtc,
            EndAtUtc   = l.EndAtUtc,
            Reason     = l.Reason,
            DoctorName = l.Doctor?.FullName ?? "",
        }));
    }

    // POST api/doctorschedule/{doctorId}/leaves
    [HttpPost("{doctorId:guid}/leaves")]
    public async Task<IActionResult> AddLeave(Guid doctorId, [FromBody] DoctorLeaveRequest req)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var doctor = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.ClinicId == ctx.Value.clinicId);
        if (doctor is null) return NotFound();

        _db.DoctorLeaves.Add(new DoctorLeave
        {
            DoctorId   = doctorId,
            ClinicId   = ctx.Value.clinicId,
            StartAtUtc = req.StartAtUtc,
            EndAtUtc   = req.EndAtUtc,
            Reason     = req.Reason?.Trim(),
        });
        await _db.SaveChangesAsync();
        return Ok(new { message = "İzin eklendi." });
    }

    // DELETE api/doctorschedule/leaves/{leaveId}
    [HttpDelete("leaves/{leaveId:guid}")]
    public async Task<IActionResult> DeleteLeave(Guid leaveId)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var leave = await _db.DoctorLeaves.FirstOrDefaultAsync(x => x.Id == leaveId && x.ClinicId == ctx.Value.clinicId);
        if (leave is null) return NotFound();
        _db.DoctorLeaves.Remove(leave);
        await _db.SaveChangesAsync();
        return Ok(new { message = "İzin silindi." });
    }

    // GET api/doctorschedule/{doctorId}/slots?date=2026-04-10&tzOffsetMinutes=180
    // tzOffsetMinutes: minutes the client is AHEAD of UTC (e.g. Turkey UTC+3 → 180)
    [HttpGet("{doctorId:guid}/slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSlots(Guid doctorId, [FromQuery] string date, [FromQuery] int tzOffsetMinutes = 0)
    {
        if (!DateTime.TryParse(date, out var localDay))
            return BadRequest(new { message = "Geçersiz tarih formatı (YYYY-MM-DD)." });

        // Day-of-week from the LOCAL date (before any UTC shift)
        var dayOfWeek = (int)localDay.DayOfWeek;

        // UTC start of the local day: local midnight - offset = UTC equivalent
        var day    = DateTime.SpecifyKind(localDay.Date, DateTimeKind.Utc).AddMinutes(-tzOffsetMinutes);
        var dayEnd = day.AddDays(1);

        var schedule = await _db.DoctorSchedules
            .FirstOrDefaultAsync(x => x.DoctorId == doctorId && x.DayOfWeek == dayOfWeek && x.IsActive);

        if (schedule is null)
            return Ok(new List<TimeSlotResponse>());

        var bookedAppts = await _db.Appointments
            .Where(x => x.DoctorId == doctorId
                     && x.StartAtUtc >= day && x.StartAtUtc < dayEnd
                     && x.Status != "Cancelled")
            .Select(x => new { x.StartAtUtc, x.EndAtUtc })
            .ToListAsync();

        var pendingReqs = await _db.AppointmentRequests
            .Where(x => x.DoctorId == doctorId
                     && x.RequestedStartUtc >= day && x.RequestedStartUtc < dayEnd
                     && x.Status == AppointmentRequestStatuses.Pending)
            .Select(x => new { StartAtUtc = x.RequestedStartUtc, EndAtUtc = x.RequestedEndUtc })
            .ToListAsync();

        var leaves = await _db.DoctorLeaves
            .Where(x => x.DoctorId == doctorId && x.StartAtUtc < dayEnd && x.EndAtUtc > day)
            .ToListAsync();

        var slots = new List<TimeSlotResponse>();
        var slotStart = day.Add(schedule.StartTime);
        var slotEnd   = day.Add(schedule.EndTime);

        while (slotStart.Add(TimeSpan.FromMinutes(schedule.SlotMinutes)) <= slotEnd)
        {
            var thisEnd = slotStart.Add(TimeSpan.FromMinutes(schedule.SlotMinutes));

            bool onLeave  = leaves.Any(l => l.StartAtUtc < thisEnd && l.EndAtUtc > slotStart);
            bool booked   = bookedAppts.Any(a => a.StartAtUtc < thisEnd && a.EndAtUtc > slotStart);
            bool pending  = pendingReqs.Any(a => a.StartAtUtc < thisEnd && a.EndAtUtc > slotStart);
            bool isPast   = slotStart <= DateTime.UtcNow.AddMinutes(30);

            slots.Add(new TimeSlotResponse
            {
                StartUtc  = slotStart,
                EndUtc    = thisEnd,
                Available = !onLeave && !booked && !pending && !isPast,
            });
            slotStart = thisEnd;
        }

        return Ok(slots);
    }
}
