import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "call-mcp",
  version: "1.0.0",
});

// Add findPhoneNumbers tool
server.tool("findPhoneNumbers", { prompt: z.string() }, async ({ prompt }) => ({
  content: [{ type: "text", text: `No phone numbers found for ${prompt}` }],
}));

// Add callNumber tool
server.tool(
  "callNumber",
  { number: z.string(), task: z.string() },
  async ({ number, task }) => ({
    content: [{ type: "text", text: `Calling ${number}... ${task}` }],
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
