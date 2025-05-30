import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { queryPerplexityForPhoneNumbers } from "./plx";

// Create an MCP server
const server = new McpServer({
  name: "call-mcp",
  version: "1.0.0",
});

// Add findPhoneNumbers tool
server.tool("findPhoneNumbers", { prompt: z.string() }, async ({ prompt }) => {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY!;
  const openaiApiKey = process.env.OPENAI_API_KEY!;

  try {
    const result = await queryPerplexityForPhoneNumbers(
      prompt,
      perplexityApiKey,
      openaiApiKey
    );

    console.log("Extracted phone numbers:", result.phoneNumbers);
    console.log(
      "Source text preview:",
      result.source.substring(0, 200) + "..."
    );

    return {
      content: [
        {
          type: "text",
          text: `Phone numbers found for ${prompt}: ${result.phoneNumbers.join(
            ", "
          )}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error:", error);

    return {
      content: [{ type: "text", text: `Error: ${error}` }],
    };
  }
});

// Add callNumber tool
server.tool(
  "callNumber",
  { number: z.string(), task: z.string() },
  async ({ number, task }) => {
    return {
      content: [{ type: "text", text: `Calling ${number}... ${task}` }],
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
