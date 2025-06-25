using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using static BUILD.ING.Controllers.DocumentsController;

namespace BUILD.ING.Swagger
{
    /// <summary>
    /// Adds an example for the DocumentUpdateRequest schema so that Swagger UI shows
    /// a request payload with typical fields. This helps demonstrate the expected structure.
    /// </summary>
    public class DocumentMetadataPatchRequestExampleSchemaFilter : ISchemaFilter
    {
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            ArgumentNullException.ThrowIfNull(schema);
            ArgumentNullException.ThrowIfNull(context);
            if (context.Type == typeof(DocumentMetadataPatchRequest))
            {
                schema.Example = new OpenApiObject
                {
                    ["categoryName"] = new OpenApiNull(),
                    ["buildingId"] = new OpenApiNull(),
                };
            }
        }
    }
}
