#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const HR_QUESTIONS_URL =
  "https://cdn.jsdelivr.net/gh/mianshipai/mianshipai-web/docs/hr-exam/behavioural-test.md";

/**
 * 创建并返回一个配置好的 MCP Server 实例
 * stateless 模式下每个请求需要独立的 server 实例
 */
function createServer(): Server {
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

  // 注册工具列表
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

  // 实现工具调用逻辑
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_hr_behavioural_questions") {
      const response = await fetch(HR_QUESTIONS_URL);
      console.log("Fetching:", HR_QUESTIONS_URL);
      console.log("Status:", response.status);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }

      const text = await response.text();

      return {
        content: [
          {
            type: "text",
            text: text.slice(0, 6000),
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}

// 创建 Express 应用（SDK 内置，已配置 JSON body-parser 等）
const app = createMcpExpressApp({ host: "0.0.0.0" });

// POST /mcp — 处理所有 MCP JSON-RPC 请求（stateless 模式）
app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: 不生成 session ID
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    // 请求结束后清理
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// GET /mcp — stateless 模式不支持 SSE 流
app.get("/mcp", async (_req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

// DELETE /mcp — stateless 模式无 session 可终止
app.delete("/mcp", async (_req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

// 启动服务器
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on http://0.0.0.0:${PORT}/mcp`);
});

// 优雅关闭
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit(0);
});
