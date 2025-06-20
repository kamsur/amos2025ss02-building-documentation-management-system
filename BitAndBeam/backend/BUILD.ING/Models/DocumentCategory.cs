using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BUILD.ING.Models
{
    public class DocumentCategory
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("fields")]
        public List<Dictionary<string, string>> Fields { get; set; } = new();

        [JsonIgnore]
        public List<int> Documents { get; set; } = new();
    }
}
