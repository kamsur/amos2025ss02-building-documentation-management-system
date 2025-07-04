using System;
using System.Threading;
using System.Threading.Tasks;
using BUILD.ING.Services; // Make sure this namespace has your OllamaService
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

namespace BUILD.ING.HealthChecks
{
    public class OllamaHealthCheck : IHealthCheck
    {
        private readonly OllamaService _ollamaService;
        private readonly ILogger<OllamaHealthCheck> _logger;

        public OllamaHealthCheck(OllamaService ollamaService, ILogger<OllamaHealthCheck> logger)
        {
            _ollamaService = ollamaService;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Running Ollama health check");
                var healthy = await _ollamaService.CheckHealthAsync().ConfigureAwait(false);

                if (healthy)
                {
                    return HealthCheckResult.Healthy("Ollama is healthy");
                }
                else
                {
                    return HealthCheckResult.Unhealthy("Ollama is unhealthy");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Ollama health check");
                return HealthCheckResult.Unhealthy("Ollama health check failed", ex);
            }
        }
    }
}
