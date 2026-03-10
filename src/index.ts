#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const HR_QUESTIONS_URL =
  "https://raw.githubusercontent.com/user-attachments/files/19617690/hr-behavioural-questions.md";

const server = new McpServer({
  name: "mcp-server-get-hr-questions",
  version: "1.0.0",
});

server.tool(
  "get_hr_behavioural_questions",
  "获取 HR 行为面试题和参考答案（来自前端面试派）",
  async () => {
    const response = await fetch(HR_QUESTIONS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return {
      content: [{ type: "text" as const, text }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-get-hr-questions running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
