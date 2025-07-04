using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace BitAndBeam.Services
{
    public class OllamaService
    {
        private readonly HttpClient _httpClient;
        private readonly string _ollamaBaseUrl;
        private readonly string _model;

        public OllamaService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _ollamaBaseUrl = configuration["Ollama:BaseUrl"] ?? "http://ollama:11434"; // Default
            _model = configuration["Ollama:Model"] ?? "gemma3:1b"; // Default model
        }

        public async Task<string> GenerateAsync(string prompt)
        {
            var payload = new
            {
                model = _model,
                prompt = prompt,
                stream = false
            };

            var json = JsonSerializer.Serialize(payload);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_ollamaBaseUrl}/api/generate", httpContent).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        }

        public async Task<bool> CheckHealthAsync()
        {
            var response = await _httpClient.GetAsync($"{_ollamaBaseUrl}/api/tags").ConfigureAwait(false);
            return response.IsSuccessStatusCode;
        }
    }
}
