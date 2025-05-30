import { queryPerplexityForPhoneNumbers } from "./plx";

async function main() {
  const userQuery =
    "I'm in salesforce park. Find me restaurants that serve gluten-free food.";
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
