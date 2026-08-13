using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/blocks")]
[Authorize]
public class BlockController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var blocks = await db.Blocks
            .Where(b => b.SiteId == SiteId)
            .OrderBy(b => b.Name)
            .Select(b => new BlockDto(
                b.Id, b.Name, b.FloorCount, b.DuesCoefficient,
                b.Apartments.Count,
                b.CreatedAt
            ))
            .ToListAsync();
        return Ok(blocks);
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateBlockRequest req)
    {
        var block = new Block { SiteId = SiteId, Name = req.Name, FloorCount = req.FloorCount, DuesCoefficient = req.DuesCoefficient };
        db.Blocks.Add(block);
        await db.SaveChangesAsync();
        return Ok(new BlockDto(block.Id, block.Name, block.FloorCount, block.DuesCoefficient, 0, block.CreatedAt));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateBlockRequest req)
    {
        var block = await db.Blocks.FirstOrDefaultAsync(b => b.Id == id && b.SiteId == SiteId);
        if (block is null) return NotFound();
        block.Name = req.Name;
        block.FloorCount = req.FloorCount;
        block.DuesCoefficient = req.DuesCoefficient;
        await db.SaveChangesAsync();
        var count = await db.Apartments.CountAsync(a => a.BlockId == id);
        return Ok(new BlockDto(block.Id, block.Name, block.FloorCount, block.DuesCoefficient, count, block.CreatedAt));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var block = await db.Blocks.FirstOrDefaultAsync(b => b.Id == id && b.SiteId == SiteId);
        if (block is null) return NotFound();
        db.Blocks.Remove(block);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
