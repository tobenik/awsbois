import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";
import { z } from "zod";
import { callNumbers } from "./calling";
import { queryPerplexityForPhoneNumbers } from "./plx.js";

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

    // console.log("Extracted phone numbers:", result.phoneNumbers);

    return {
      content: [
        {
          type: "text",
          text: `{"phoneNumbers":${JSON.stringify(result.phoneNumbers)}}`,
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

// Add callNumber tool to make phone calls using the ElevenLabs API
server.tool(
  "callNumbers",
  { numbers: z.array(z.string()), task: z.string() },
  async ({ numbers, task }) => {
    try {
      const result = await callNumbers(numbers, task);
      const resultString = JSON.stringify(result, null, 2);

      return {
        content: [
          {
            type: "text",
            text: `Call completed to ${numbers.join(
              ", "
            )} for task: ${task}\n\n${resultString}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error making call:", error);
      return {
        content: [{ type: "text", text: `Error making call: ${error}` }],
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
