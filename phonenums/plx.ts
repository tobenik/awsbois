interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface PhoneNumberExtractionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ExtractedPhoneNumbers {
  phoneNumbers: string[];
  source: string;
}

/**
 * Queries Perplexity API with a user query and extracts phone numbers from the response
 * @param userQuery - The search query to send to Perplexity
 * @param perplexityApiKey - API key for Perplexity
 * @param openaiApiKey - API key for OpenAI (for phone number extraction)
 * @returns Promise containing extracted phone numbers and source text
 */
export async function queryPerplexityForPhoneNumbers(
  userQuery: string,
  perplexityApiKey: string,
  openaiApiKey: string
): Promise<ExtractedPhoneNumbers> {
  try {
    // Step 1: Query Perplexity API
    const perplexityResponse = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that searches for information and provides detailed responses with contact information when available.",
            },
            {
              role: "user",
              content: userQuery,
            },
          ],
          max_tokens: 1000,
          temperature: 0.2,
          top_p: 0.9,
          return_citations: true,
          search_domain_filter: ["perplexity.ai"],
          return_images: false,
          return_related_questions: false,
          search_recency_filter: "month",
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1,
        }),
      }
    );

    if (!perplexityResponse.ok) {
      throw new Error(
        `Perplexity API error: ${perplexityResponse.status} ${perplexityResponse.statusText}`
      );
    }

    const perplexityData: PerplexityResponse =
      (await perplexityResponse.json()) as PerplexityResponse;
    const perplexityContent = perplexityData.choices[0]?.message?.content || "";

    if (!perplexityContent) {
      throw new Error("No content received from Perplexity API");
    }

    // Step 2: Extract phone numbers using OpenAI
    const extractionResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert at extracting phone numbers from text. Extract all phone numbers from the provided text and return them in a clean, standardized format. 

Rules:
1. Extract all phone numbers regardless of format (e.g., (555) 123-4567, 555-123-4567, 555.123.4567, +1-555-123-4567, etc.)
2. Return phone numbers in a consistent format: +1-XXX-XXX-XXXX for US numbers
3. If country code is missing, assume US (+1)
4. Remove any extensions or additional text
5. Return only valid phone numbers (10 digits for US numbers)
6. Return the result as a JSON array of strings

Example output: ["+1-555-123-4567", "+1-555-987-6543"]

If no phone numbers are found, return an empty array: []`,
            },
            {
              role: "user",
              content: `Extract all phone numbers from this text:\n\n${perplexityContent}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!extractionResponse.ok) {
      throw new Error(
        `OpenAI API error: ${extractionResponse.status} ${extractionResponse.statusText}`
      );
    }

    const extractionData: PhoneNumberExtractionResponse =
      (await extractionResponse.json()) as PhoneNumberExtractionResponse;
    const extractionContent =
      extractionData.choices[0]?.message?.content || "{}";

    // Parse the JSON response
    let phoneNumbers: string[] = [];
    try {
      const parsed = JSON.parse(extractionContent);
      phoneNumbers = Array.isArray(parsed)
        ? parsed
        : parsed.phoneNumbers || parsed.phone_numbers || [];
    } catch (parseError) {
      console.warn(
        "Failed to parse phone number extraction response:",
        parseError
      );
      // Fallback: try to extract phone numbers using regex
      phoneNumbers = extractPhoneNumbersWithRegex(perplexityContent);
    }

    return {
      phoneNumbers,
      source: perplexityContent,
    };
  } catch (error) {
    console.error("Error in queryPerplexityForPhoneNumbers:", error);
    throw error;
  }
}

/**
 * Fallback function to extract phone numbers using regex patterns
 * @param text - Text to extract phone numbers from
 * @returns Array of phone numbers found
 */
function extractPhoneNumbersWithRegex(text: string): string[] {
  const phoneRegexPatterns = [
    // US phone number patterns
    /\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    // International patterns
    /\+[1-9]\d{1,14}/g,
    // Additional common formats
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ];

  const phoneNumbers: string[] = [];
  const foundNumbers = new Set<string>();

  for (const pattern of phoneRegexPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean and standardize the number
        const cleaned = match.replace(/[^\d+]/g, "");
        if (cleaned.length >= 10) {
          let standardized = cleaned;
          // Add +1 for US numbers if not present
          if (cleaned.length === 10) {
            standardized = `+1${cleaned}`;
          } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
            standardized = `+${cleaned}`;
          }

          // Format as +1-XXX-XXX-XXXX
          if (standardized.startsWith("+1") && standardized.length === 12) {
            const formatted = `+1-${standardized.slice(
              2,
              5
            )}-${standardized.slice(5, 8)}-${standardized.slice(8)}`;
            if (!foundNumbers.has(formatted)) {
              foundNumbers.add(formatted);
              phoneNumbers.push(formatted);
            }
          }
        }
      }
    }
  }

  return phoneNumbers;
}

/**
 * Example usage function
 */
export async function exampleUsage() {
  const userQuery =
    "Find contact information for pizza restaurants in New York City";
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY || "";
  const openaiApiKey = process.env.OPENAI_API_KEY || "";

  if (!perplexityApiKey || !openaiApiKey) {
    throw new Error(
      "API keys are required. Set PERPLEXITY_API_KEY and OPENAI_API_KEY environment variables."
    );
  }

  try {
    const result = await queryPerplexityForPhoneNumbers(
      userQuery,
      perplexityApiKey,
      openaiApiKey
    );
    console.log("Extracted phone numbers:", result.phoneNumbers);
    console.log("Source text length:", result.source.length);
    return result;
  } catch (error) {
    console.error("Example usage failed:", error);
    throw error;
  }
}
