using Microsoft.AspNetCore.Mvc;

namespace BitAndBeam.Controllers
{
[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok("healthy");
}

}
