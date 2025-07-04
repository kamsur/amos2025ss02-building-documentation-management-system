using System.Diagnostics;
using System.Text.Json;
using System.Threading.Tasks;
using BUILD.ING.Services;
using Microsoft.AspNetCore.Mvc;

namespace BitAndBeam.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OllamaController : ControllerBase
    {
        private readonly OllamaService _ollamaService;

        public OllamaController(OllamaService ollamaService)
        {
            _ollamaService = ollamaService;
        }

        public class OllamaRequest
        {
            public string Prompt { get; set; }
            public object Context { get; set; } // optional
        }

        public class OllamaResponse
        {
            public string Response { get; set; }
            public long ResponseTimeMs { get; set; }
        }

        [HttpPost("ask")]
        public async Task<IActionResult> AskOllama([FromBody] OllamaRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Prompt))
                return BadRequest(new { error = "Prompt is required." });

            var stopwatch = Stopwatch.StartNew();

            try
            {
                var rawResponse = await _ollamaService.GenerateAsync(request.Prompt);
                stopwatch.Stop();

                var ollamaResponse = JsonSerializer.Deserialize<OllamaResponse>(rawResponse, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (ollamaResponse != null)
                    ollamaResponse.ResponseTimeMs = stopwatch.ElapsedMilliseconds;

                return Ok(ollamaResponse);
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new { error = "Ollama service unreachable" });
            }
        }

        [HttpGet("health")]
        public async Task<IActionResult> HealthCheck()
        {
            try
            {
                var healthy = await _ollamaService.CheckHealthAsync();
                if (healthy)
                    return Ok(new { status = "ok" });
                else
                    return StatusCode(503, new { status = "error", detail = "Ollama not healthy" });
            }
            catch
            {
                return StatusCode(503, new { status = "error", detail = "Ollama unreachable" });
            }
        }
    }
}


