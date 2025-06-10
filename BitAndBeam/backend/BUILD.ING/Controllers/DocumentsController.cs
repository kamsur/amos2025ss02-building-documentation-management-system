using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BUILD.ING.Data;
using BUILD.ING.Models;
using BUILD.ING.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace BUILD.ING.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly TikaService _tikaService;
        private readonly ILogger<DocumentsController> _logger;

        public DocumentsController(AppDbContext context, IWebHostEnvironment env, TikaService tikaService, ILogger<DocumentsController> logger)
        {
            Console.WriteLine("🚀 DocumentsController loaded");
            _context = context;
            _env = env;
            _tikaService = tikaService;
            _logger = logger;
        }

        private string GetCurrentUserGroupId()
        {
            return "group2"; // Hardcoded for now
        }

        [HttpPost]
        public async Task<IActionResult> UploadDocument(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is required");

            var uploadsPath = Path.Combine("/app/documents");
            Directory.CreateDirectory(uploadsPath);

            var fullPath = Path.Combine(uploadsPath, file.FileName);

            // Save the file to disk
            using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream).ConfigureAwait(false);

            // Extract metadata with Tika
            string metadata = "{}";
            try
            {
                // Convert file to byte array for Tika processing
                byte[] fileBytes;
                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms).ConfigureAwait(false);
                    fileBytes = ms.ToArray();
                }

                // Call Tika service to extract metadata
                metadata = await _tikaService.ExtractMetadataAsync(fileBytes, file.FileName).ConfigureAwait(false);
                _logger.LogInformation("Successfully extracted metadata for file {FileName}", file.FileName);
            }
            catch (Exception ex)
            {
                // Log error but continue with upload process
                _logger.LogError(ex, "Failed to extract metadata for file {FileName}", file.FileName);
                // Empty metadata will be stored
            }

            var document = new Document
            {
                Title = Path.GetFileNameWithoutExtension(file.FileName),
                FileName = file.FileName,
                FilePath = file.FileName, // Just store file name
                FileType = Path.GetExtension(file.FileName)?.TrimStart('.').ToLower() ?? "unknown",
                FileSize = (int) file.Length,
                UploadDate = DateTime.UtcNow,
                LastModified = DateTime.UtcNow,
                Version = "1.0",
                Status = "draft",
                IsPublic = false,
                Description = "No description provided",
                Metadata = metadata, // Store the extracted metadata
                UploadedAt = DateTime.UtcNow,
                UploadedBy = null,
                GroupId = GetCurrentUserGroupId()
            };

            _context.Documents.Add(document);
            await _context.SaveChangesAsync().ConfigureAwait(false);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var fileUrl = $"{baseUrl}/documents/{document.FileName}";

            return Ok(new { document.DocumentId, FileUrl = fileUrl, HasMetadata = metadata != "{}" });
        }

        [HttpGet]
        public IActionResult GetAllDocuments()
        {
            var groupId = GetCurrentUserGroupId();
            var documents = _context.Documents.Where(d => d.GroupId == groupId).ToList();
            return Ok(documents);
        }

        [HttpGet("{id}")]
        public IActionResult GetDocumentById(int id)
        {
            var groupId = GetCurrentUserGroupId();
            var document = _context.Documents.FirstOrDefault(d => d.DocumentId == id && d.GroupId == groupId);
            if (document == null)
                return NotFound();

            return Ok(document);
        }

        [HttpPut("{id}")]
        public IActionResult UpdateDocumentTitle(int id, [FromBody] DocumentUpdateRequest request)
        {
            var document = _context.Documents.FirstOrDefault(d => d.DocumentId == id && d.GroupId == GetCurrentUserGroupId());
            if (document == null)
                return NotFound();

            document.Title = request.Title;
            _context.SaveChanges();

            return Ok(document);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteDocument(int id)
        {
            var document = _context.Documents.FirstOrDefault(d => d.DocumentId == id && d.GroupId == GetCurrentUserGroupId());
            if (document == null)
                return NotFound();

            var filePath = Path.Combine("/app/documents", document.FileName);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                Console.WriteLine($"✅ File deleted: {filePath}");
            }
            else
            {
                Console.WriteLine($"⚠️ File not found at: {filePath}");
            }

            _context.Documents.Remove(document);
            _context.SaveChanges();

            return NoContent();
        }

        [HttpGet("{id}/download")]
        public IActionResult DownloadDocument(int id)
        {
            var groupId = GetCurrentUserGroupId();
            var document = _context.Documents.FirstOrDefault(d => d.DocumentId == id && d.GroupId == groupId);
            if (document == null)
                return NotFound();

            var filePath = Path.Combine("/app/documents", document.FileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", document.FileName);
        }

        [HttpGet("{id}/preview")]
        public IActionResult PreviewDocument(int id)
        {
            var groupId = GetCurrentUserGroupId();
            var document = _context.Documents.FirstOrDefault(d => d.DocumentId == id && d.GroupId == groupId);
            if (document == null)
                return NotFound();

            var filePath = Path.Combine("/app/documents", document.FileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            // Determine content type based on file extension
            string contentType = document.FileType switch
            {
                "pdf" => "application/pdf",
                "png" => "image/png",
                "jpg" => "image/jpeg",
                "jpeg" => "image/jpeg",
                _ => "application/octet-stream" // fallback
            };

            return File(fileBytes, contentType);
        }

        [HttpPost("upload-and-analyze")]
        public async Task<IActionResult> UploadAndAnalyzeDocument(IFormFile file, [FromServices] IHttpClientFactory httpClientFactory)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is required");

            // Save file temporarily
            byte[] fileBytes;
            using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms).ConfigureAwait(false);
                fileBytes = ms.ToArray();
            }

            // Step 1: Extract text using Tika
            var extractedText = await _tikaService.ExtractTextAsync(fileBytes, file.FileName).ConfigureAwait(false);
            var shortText = extractedText.Length > 3000 ? extractedText.Substring(0, 3000) : extractedText;

            // Step 2: Prompt Ollama
            var prompt = $$"""
            From the following document text, extract the full address if available.

            ⚠️ Respond ONLY with a strict JSON object with the following keys:
            - "street"
            - "house_number"
            - "zip_code"
            - "city"

            All values must be strings or null. DO NOT return markdown or explanation.

            Example:
            {
            "street": "Riedener Str.",
            "house_number": "1a",
            "zip_code": "90518",
            "city": "Altdorf"
            }

            Text:
            {{shortText}}
            """;

            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5);

            var payload = new { prompt };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("http://ollama:8000/api/Ollama/ask", content).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
                return StatusCode(503, "Ollama service is unreachable");


            var ollamaResultJson = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            var ollamaResult = JsonSerializer.Deserialize<OllamaController.OllamaResponse>(
                ollamaResultJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );


            Dictionary<string, string>? parsedJson;
            try
            {
                parsedJson = JsonSerializer.Deserialize<Dictionary<string, string>>(ollamaResult?.Response ?? "{}", new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch
            {
                parsedJson = null;
            }

            string? street = parsedJson?.GetValueOrDefault("street");
            string? houseNumber = parsedJson?.GetValueOrDefault("house_number");
            string? zipCode = parsedJson?.GetValueOrDefault("zip_code");
            string? city = parsedJson?.GetValueOrDefault("city");

            // Step 3: Try to match building
            Building? matchedBuilding = null;

            if (!string.IsNullOrWhiteSpace(street) && !string.IsNullOrWhiteSpace(zipCode))
            {
                var buildings = _context.Buildings.ToList();
                foreach (var building in buildings)
                {
                    var buildingAddress = building.Address?.ToLowerInvariant() ?? "";

                    bool matchesStreet = buildingAddress.Contains(street.ToLowerInvariant());
                    bool matchesHouse = string.IsNullOrWhiteSpace(houseNumber) || buildingAddress.Contains(houseNumber.ToLowerInvariant());
                    bool matchesZip = buildingAddress.Contains(zipCode);

                    if (matchesStreet && matchesHouse && matchesZip)
                    {
                        matchedBuilding = building;
                        break;
                    }
                }
            }

            return Ok(new
            {
                textExtracted = extractedText.Length > 0,
                ollamaResponse = parsedJson,
                building = matchedBuilding != null
                    ? new { matchedBuilding.BuildingId, matchedBuilding.Address }
                    : null
            });
        }

    }
}
