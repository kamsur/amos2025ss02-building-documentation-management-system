using System;
using System.Collections.Generic; // Added for List<> and Dictionary<,> support
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using HtmlAgilityPack;
using System.Linq; // Added for LINQ support
using System.Text.RegularExpressions; // Added for Regex support

#nullable enable // Enable nullable reference types

class PdfProcessingScript
{
    private static readonly HttpClient _httpClient = new HttpClient();

    static async Task Main(string[] args)
    {
        // Hardcoded file path and Tika URL
        string pdfFilePath = "C:\\Users\\Kazi\\Downloads\\energieausweis_4.pdf";
        string tikaUrl = "http://localhost:9998/tika";

        if (!File.Exists(pdfFilePath))
        {
            Console.WriteLine("PDF file not found at the specified location.");
            return;
        }

        // Read file bytes
        byte[] fileBytes = await File.ReadAllBytesAsync(pdfFilePath);

        // Send file to Tika for extraction
        string textForOllama = string.Empty;
        try
        {
            using (var content = new ByteArrayContent(fileBytes))
            {
                content.Headers.Add("Content-Type", "application/pdf");
                var response = await _httpClient.PutAsync(tikaUrl, content);
                response.EnsureSuccessStatusCode();

                textForOllama = await response.Content.ReadAsStringAsync();
            }

            Console.WriteLine("✅ Tika extraction successful.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Tika extraction failed: {ex.Message}");
            return;
        }

        // Save Tika extraction output
        string tikaOutputPath = "C:\\Users\\Kazi\\Downloads\\tika_output.txt";
        await File.WriteAllTextAsync(tikaOutputPath, textForOllama);

        // Extract visible text
        string visibleText = ExtractVisibleText(textForOllama);
        string visibleTextPath = "C:\\Users\\Kazi\\Downloads\\visible_text.txt";
        await File.WriteAllTextAsync(visibleTextPath, visibleText);

        // Generate short text
        string shortText = visibleText.Length > 4000 ? visibleText.Substring(0, 4000) : visibleText;
        string shortTextPath = "C:\\Users\\Kazi\\Downloads\\short_text.txt";
        await File.WriteAllTextAsync(shortTextPath, shortText);

        // Build prompt
        string categoriesSchemaJson = JsonSerializer.Serialize(ReadCategories());
        string prompt = BuildPrompt(shortText, categoriesSchemaJson);
        string promptPath = "C:\\Users\\Kazi\\Downloads\\prompt.txt";
        await File.WriteAllTextAsync(promptPath, prompt);

        Console.WriteLine("✅ Outputs saved successfully.");
    }

    private static string BuildPrompt(string extractedText, string categoriesSchemaJson)
        {
            // return $$"""
            // You are an intelligent document analyzer.

            // Given the **extracted text** and a **categories schema** (including field definitions) from a German document, your task is to analyze and extract the following information in a strict JSON format:

            // Your answer MUST include the following top-level fields: "address", "category", and "key_information".

            // **Example format:**

            // {
            //     "address": {
            //         "street":"<string|null>",
            //         "house_number":"<string|null>",
            //         "zip_code":"<string|null>",
            //         "city":"<string|null>"
            //     },
            //     "category":"Energieausweis",
            //     "key_information": {
            //         "Art des Ausweises": "<string|null>",
            //         "Ausstellungsdatum": "<string|null>",
            //         "Gültigkeit (Ablaufdatum)": "<string|null>",
            //         "Registriernummer des Ausweises": "<string|null>",
            //         "Gebäudetyp": "<string|null>",
            //         "Adresse": "<string|null>",
            //         "Baujahr Gebäude": "<string|null>",
            //         "Gebäudenutzfläche": "<string|null>",
            //         "Wesentliche Energieträger für Heizung": "<string|null>",
            //         "Treibhausgasemissionen": "<string|null>",
            //         "Endenergiebedarf": "<string|null>",
            //         "Primärenergiebedarf Ist-Wert": "<string|null>"
            //     }
            // }

            // **TASK A** → Extract an **address** if present.
            // Look for labels like:
            // "Adresse", "Anschrift", "Standort", "Objektadresse", "Gebäudeadresse", "Hausanschrift", "Liegenschaft", "Baustellenadresse", "Postanschrift", "Immobilienadresse",
            // or field names such as "Straße", "Haus-Nr.", "PLZ", "Ort", and the same terms in free text.

            // **TASK B** → Choose the SINGLE best-matching **category** from "categories_schema" (use null if none fits)

            // **TASK C** → After choosing a category (TASK B), extract the **key information** fields defined for that category in "categories_schema" and return them under "key_information".
            // For every field in the selected category's 'fields' array:
            // • Use the field's **name** as the JSON key.
            // • Try to extract the corresponding value from the document; if not found, set it to null.
            // • Only include the fields declared for that category — no extra keys.

            // **Rules**

            // • Every value must be a JSON string or null — no units, no comments.
            // • Output MUST be valid JSON that parses with 'JSON.parse()'.
            // • If any field cannot be detected, output it with a null value.
            // • Do **not** wrap the answer in markdown or code fences.

            // **categories_schema**:

            // {{categoriesSchemaJson}}

            // **Extracted Text**:

            // {{extractedText}}
            // """;
            return $$"""
            You are an intelligent document analyzer for documents in German language, related to buildings.

            Given the "Extracted Text" and a "categories_schema" (including field definitions) from a German document, your task is to carefully analyze "Extracted Text" and extract the following information in a strict JSON format:

            1. **Address**: Extract the address if present. Look for labels like:
               - "Adresse", "Anschrift", "Standort", "Objektadresse", "Gebäudeadresse", "Hausanschrift", "Liegenschaft", "Postanschrift".
               - Field names such as "Straße", "Haus-Nr.", "PLZ", "Ort".

            2. **Category**: Choose the SINGLE best-matching category from the provided "categories_schema", that describes the document. If no category fits, return `null`.

            3. **Key Information**: From the provided "Extracted Text", extract only the fields defined in the 'fields' array of the selected category, in the provided "categories_schema". Use the field's **name** as the JSON key. Find the value of the field in "Extracted Text". If a value cannot be found, set it to `null`.

            **Rules**:
            - Analyze the document step-by-step, first the address, then the category, and finally the key information.
            - Every value must be a JSON string or `null`.
            - Output MUST be valid JSON that parses with 'JSON.parse()'.
            - Do not include extra keys or comments.
            - Do not create information that is not present in "Extracted Text" and do not modify the "categories_schema" provided below.

            **Example Format**:
            {
                "address": {
                    "street": "<string|null>",
                    "house_number": "<string|null>",
                    "zip_code": "<string|null>",
                    "city": "<string|null>"
                },
                "category": "<string|null>",
                "key_information": {
                    "Art des Ausweises": "<string|null>",
                    "Ausstellungsdatum": "<string|null>",
                    "Gültigkeit (Ablaufdatum)": "<string|null>",
                    "Registriernummer des Ausweises": "<string|null>",
                    "Gebäudetyp": "<string|null>",
                    "Adresse": "<string|null>",
                    "Baujahr Gebäude": "<string|null>",
                    "Gebäudenutzfläche": "<string|null>",
                    "Wesentliche Energieträger für Heizung": "<string|null>",
                    "Treibhausgasemissionen": "<string|null>",
                    "Endenergiebedarf": "<string|null>",
                    "Primärenergiebedarf Ist-Wert": "<string|null>"
                }
            }

            **categories_schema**:
            {{categoriesSchemaJson}}

            **Extracted Text**:
            {{extractedText}}
            """;
        }

        private static string ExtractVisibleText(string tikaHtml)
        {
            var doc = new HtmlAgilityPack.HtmlDocument();
            doc.LoadHtml(tikaHtml);

            // Remove unwanted elements
            var unwantedTags = new[] { "script", "style", "head", "meta", "link" };
            foreach (var tag in unwantedTags)
            {
                var nodes = doc.DocumentNode.SelectNodes($"//{tag}");
                if (nodes != null)
                {
                    foreach (var node in nodes)
                        node.Remove();
                }
            }

            // Extract visible text from <body>
            var bodyNode = doc.DocumentNode.SelectSingleNode("//body");
            if (bodyNode == null)
                return tikaHtml.Trim(); // fallback

            var textNodes = bodyNode.Descendants()
                .Where(n => n.NodeType == HtmlNodeType.Text && !string.IsNullOrWhiteSpace(n.InnerText))
                .Select(n => HtmlEntity.DeEntitize(n.InnerText.Trim()));

            // Join all text nodes with a space
            var rawText = string.Join(" ", textNodes);

            // Replace all \n with a space
            rawText = rawText.Replace("\n", " ");

            // Collapse multiple spaces/tabs into a single space
            var cleanedText = Regex.Replace(rawText, @"[ \t]+", " ");

            return cleanedText.Trim();
        }

    private static List<DocumentCategory> ReadCategories()
    {
        var json = File.ReadAllText("C:\\BABU\\FAU\\FAU_coding\\AMOS\\amos2025ss02-building-documentation-management-system\\BitAndBeam\\backend\\resources\\document_categories.json");
        using var doc = JsonDocument.Parse(json);
        var categoriesElem = doc.RootElement.GetProperty("categories");
        var categories = JsonSerializer.Deserialize<List<DocumentCategory>>(categoriesElem.GetRawText()) ?? new();
        return categories;
    }

    public class DocumentCategory
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public List<Dictionary<string, string>>? Fields { get; set; }
    }
}
