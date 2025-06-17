using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BUILD.ING.Data;
using BUILD.ING.Dto;
using BUILD.ING.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NpgsqlTypes;

namespace BUILD.ING.Controllers
{
    [Authorize]                                 // 🔐 Require valid Bearer token
    [ApiController]
    [Route("api/[controller]")]
    public class BuildingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BuildingsController> _logger;

        public BuildingsController(AppDbContext context, ILogger<BuildingsController> logger)
        {
            _context  = context;
            _logger   = logger;
        }

        // ⮕  Extract “org” claim once, reuse everywhere
        private int GetOrgId() =>
            int.TryParse(User.FindFirst("org")?.Value, out var id)
                ? id
                : throw new UnauthorizedAccessException("Organization claim missing.");

        // POST: api/Buildings
        [HttpPost]
        public async Task<IActionResult> CreateBuilding([FromBody] BuildingCreateDto dto)
        {
            var orgId = GetOrgId();                       // ☑️  Use claim, ignore dto.OrganizationId
            _logger.LogInformation("CreateBuilding (org {Org})", orgId);

            NpgsqlPoint? coordinates = dto.Coordinates?.Value;

            var building = new Building
            {
                Name        = dto.Name,
                Address     = dto.Address,
                ConstructionYear = dto.ConstructionYear,
                TotalArea   = dto.TotalArea,
                Floors      = dto.Floors,
                Description = dto.Description,
                OrganizationId = orgId,                  // ✅  always set from claim
                Coordinates = coordinates,
                CreatedAt   = DateTime.UtcNow,
                UpdatedAt   = DateTime.UtcNow
            };

            _context.Buildings.Add(building);
            await _context.SaveChangesAsync().ConfigureAwait(false);

            _logger.LogInformation("Building {Id} created in org {Org}", building.BuildingId, orgId);
            return Ok(new { id = building.BuildingId });
        }

        // GET: api/Buildings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Building>>> GetBuildings()
        {
            var orgId = GetOrgId();
            _logger.LogInformation("GetBuildings (org {Org})", orgId);

            var buildings = await _context.Buildings
                                          .Where(b => b.OrganizationId == orgId) // 🔐 filter
                                          .ToListAsync()
                                          .ConfigureAwait(false);

            return buildings;
        }

        // GET: api/Buildings/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Building>> GetBuilding(int id)
        {
            var orgId = GetOrgId();
            _logger.LogInformation("GetBuilding {Id} (org {Org})", id, orgId);

            var building = await _context.Buildings
                                         .Include(b => b.Documents)
                                         .Include(b => b.BuildingDocumentRelations)
                                         .FirstOrDefaultAsync(b => b.BuildingId == id && b.OrganizationId == orgId)
                                         .ConfigureAwait(false);

            return building == null ? NotFound() : Ok(building);
        }

        // PUT: api/Buildings/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBuilding(int id, [FromBody] Building updated)
        {
            var orgId = GetOrgId();
            if (id != updated.BuildingId) return BadRequest("Mismatched Building ID");

            var existing = await _context.Buildings
                                         .FirstOrDefaultAsync(b => b.BuildingId == id && b.OrganizationId == orgId)
                                         .ConfigureAwait(false);

            if (existing == null) return NotFound();

            _context.Entry(existing).CurrentValues.SetValues(updated);

            existing.UpdatedAt   = DateTime.UtcNow;
            existing.OrganizationId = orgId;              // ensure it never changes org

            await _context.SaveChangesAsync().ConfigureAwait(false);
            return NoContent();
        }

        // DELETE: api/Buildings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBuilding(int id)
        {
            var orgId = GetOrgId();
            var building = await _context.Buildings
                                         .Include(b => b.BuildingDocumentRelations)
                                         .FirstOrDefaultAsync(b => b.BuildingId == id && b.OrganizationId == orgId)
                                         .ConfigureAwait(false);

            if (building == null) return NotFound();

            _context.BuildingDocumentRelations.RemoveRange(building.BuildingDocumentRelations);
            _context.Buildings.Remove(building);
            await _context.SaveChangesAsync().ConfigureAwait(false);
            return NoContent();
        }

        // ------------------------------------------------------------------
        //  Debug helpers (unchanged, but still protected by [Authorize])
        // ------------------------------------------------------------------

        [HttpGet("debug-db")]
        public IActionResult GetDbInfo()
        {
            var conn = _context.Database.GetDbConnection();
            return Ok(new { conn.Database, conn.DataSource, conn.ConnectionString });
        }

        [HttpGet("debug-full")]
        public IActionResult GetDebugFull()
        {
            var conn = _context.Database.GetDbConnection();
            return Ok(new
            {
                Provider = _context.Database.ProviderName,
                Connection = conn.ConnectionString,
                Source = conn.DataSource,
                Db = conn.Database
            });
        }
    }
}
