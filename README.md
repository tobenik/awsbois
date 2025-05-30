# Perplexity Phone Number Extractor

A TypeScript function that queries the Perplexity API with a user query and extracts phone numbers from the response using an additional LLM call.

## Features

- 🔍 Queries Perplexity API for real-time search results
- 📞 Extracts phone numbers using OpenAI GPT-4o-mini
- 🛡️ Robust error handling and fallback regex extraction
- 📋 Standardized phone number formatting (+1-XXX-XXX-XXXX)
- 🔧 TypeScript support with full type definitions

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set up your API keys as environment variables:

```bash
export PERPLEXITY_API_KEY="your_perplexity_api_key_here"
export OPENAI_API_KEY="your_openai_api_key_here"
```

## Usage

### Basic Usage

```typescript
import { queryPerplexityForPhoneNumbers } from "./plx";

async function main() {
  const userQuery =
    "Find contact information for pizza restaurants in New York City";
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY!;
  const openaiApiKey = process.env.OPENAI_API_KEY!;

  try {
    const result = await queryPerplexityForPhoneNumbers(
      userQuery,
      perplexityApiKey,
      openaiApiKey
    );

    console.log("Extracted phone numbers:", result.phoneNumbers);
    console.log(
      "Source text preview:",
      result.source.substring(0, 200) + "..."
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

### Example with Different Queries

```typescript
// Restaurant search
const restaurantQuery =
  "Italian restaurants in San Francisco with phone numbers";

// Business search
const businessQuery = "plumbing services in Chicago contact information";

// Service provider search
const serviceQuery = "dentist offices in Miami phone numbers";
```

## API Reference

### `queryPerplexityForPhoneNumbers(userQuery, perplexityApiKey, openaiApiKey)`

Main function that queries Perplexity and extracts phone numbers.

**Parameters:**

- `userQuery` (string): The search query to send to Perplexity
- `perplexityApiKey` (string): Your Perplexity API key
- `openaiApiKey` (string): Your OpenAI API key

**Returns:**

- `Promise<ExtractedPhoneNumbers>`: Object containing:
  - `phoneNumbers` (string[]): Array of extracted phone numbers in +1-XXX-XXX-XXXX format
  - `source` (string): The original text from Perplexity response

**Example Response:**

```typescript
{
  phoneNumbers: [
    "+1-555-123-4567",
    "+1-555-987-6543",
    "+1-555-456-7890"
  ],
  source: "Here are some pizza restaurants in NYC: Joe's Pizza (555) 123-4567..."
}
```

## Configuration

### Perplexity API Settings

The function uses the following Perplexity API configuration:

- Model: `llama-3.1-sonar-small-128k-online`
- Max tokens: 1000
- Temperature: 0.2
- Search recency: Last month
- Citations: Enabled

### OpenAI API Settings

For phone number extraction:

- Model: `gpt-4o-mini`
- Max tokens: 500
- Temperature: 0.1
- Response format: JSON object

## Error Handling

The function includes comprehensive error handling:

1. **API Errors**: Proper HTTP status code checking and error messages
2. **Parsing Errors**: Fallback to regex extraction if LLM parsing fails
3. **Missing Content**: Validation of API responses
4. **Network Issues**: Fetch error handling

## Fallback Regex Extraction

If the LLM extraction fails, the function falls back to regex patterns that can detect:

- US phone numbers: (555) 123-4567, 555-123-4567, 555.123.4567
- International numbers: +1-555-123-4567
- Various formatting styles

## Requirements

- Node.js 18+
- TypeScript 5.3+
- Valid Perplexity API key
- Valid OpenAI API key

## API Keys

### Getting a Perplexity API Key

1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for an account
3. Navigate to API settings
4. Generate an API key

### Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up for an account
3. Navigate to API keys section
4. Create a new API key

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open an issue on the GitHub repository.
