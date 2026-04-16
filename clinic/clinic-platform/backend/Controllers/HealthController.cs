using Microsoft.AspNetCore.Mvc;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "ok",
            service = "clinic-platform-api",
            utcTime = DateTime.UtcNow
        });
    }
}
