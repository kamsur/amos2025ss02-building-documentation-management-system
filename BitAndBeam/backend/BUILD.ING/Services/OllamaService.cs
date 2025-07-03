using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace BUILD.ING.Services
{
    public class OllamaService
    {
        private readonly HttpClient _client;
        private readonly ILogger<OllamaService> _logger;
        private readonly string _modelName;

        public OllamaService(HttpClient client, ILogger<OllamaService> logger)
        {
            _client = client;
            _logger = logger;
            // Get model from environment or fallback to default
            _modelName = Environment.GetEnvironmentVariable("OLLAMA_MODEL") ?? "gemma3:1b";
        }

        /// <summary>
        /// Sends a prompt to the Ollama LLM API and returns the generated response.
        /// </summary>
        public async Task<string> GenerateAsync(string prompt)
        {
            try
            {
                var payload = new
                {
                    model = _modelName,
                    prompt = prompt,
                    stream = false
                };

                var httpContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _client.PostAsync("http://ollama:11434/api/generate", httpContent);

                if (response.IsSuccessStatusCode)
                {
                    var respString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(respString);
                    if (doc.RootElement.TryGetProperty("response", out var respProp))
                        return respProp.GetString() ?? "";
                    return "No response from Ollama.";
                }
                else
                {
                    _logger.LogError("Ollama generation failed: {Status} {Reason}", response.StatusCode, response.ReasonPhrase);
                    return "Could not generate response from Ollama.";
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Ollama server is unreachable.");
                return "Ollama service is currently unavailable.";
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Ollama request timed out.");
                return "Ollama request timed out. Please try again.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during Ollama generation.");
                return "An unexpected error occurred during Ollama request.";
            }
        }

        /// <summary>
        /// Checks the health of the Ollama service (returns true if healthy).
        /// </summary>
        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var response = await _client.GetAsync("http://ollama:11434/");
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to reach Ollama health endpoint.");
                return false;
            }
        }
    }
}
