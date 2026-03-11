#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const HR_QUESTIONS_URL =
  "https://cdn.jsdelivr.net/gh/mianshipai/mianshipai-web/docs/hr-exam/behavioural-test.md";

const server = new Server(
  {
    name: "mcp-server-get-hr-questions",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_hr_behavioural_questions",
        description: "获取 HR 行为面试题和参考答案（来自前端面试派）",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_hr_behavioural_questions") {
    const response = await fetch(HR_QUESTIONS_URL);
    console.error("Fetching:", HR_QUESTIONS_URL)


    console.error("Status:", response.status)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
const text = await response.text()

return {
  content: [
    {
      type: "text",
      text: text.slice(0, 6000)
    }
  ]
}
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-get-hr-questions running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
