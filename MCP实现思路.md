# MCP Server 实现思路与面试话术

## 一、项目简介

基于 **Model Context Protocol (MCP)** 的服务器，从远程 CDN 拉取「前端面试派」的 HR 行为面试题，供 AI 客户端（如 Claude）调用。

**技术栈：** TypeScript + @modelcontextprotocol/sdk + Node.js

---

## 二、实现思路（四步）

```
创建 Server 实例 → 注册工具列表 → 实现工具逻辑 → 连接传输层启动
```

### 1. 创建 Server 实例

声明服务名称、版本、能力（tools）。

```typescript
const server = new Server(
  { name: "mcp-server-get-hr-questions", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
```

### 2. 注册工具清单

通过 `ListToolsRequestSchema` 处理器，告诉客户端"我有哪些工具可用"。

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_hr_behavioural_questions",
    description: "获取 HR 行为面试题和参考答案",
    inputSchema: { type: "object", properties: {} }
  }]
}));
```

### 3. 实现工具调用逻辑

通过 `CallToolRequestSchema` 处理器，根据工具名分发请求、执行业务逻辑。

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_hr_behavioural_questions") {
    const response = await fetch(HR_QUESTIONS_URL);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const text = await response.text();
    return { content: [{ type: "text", text: text.slice(0, 6000) }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});
```

### 4. 连接传输层启动

通过 stdio 与 AI 客户端进行进程间通信。

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 三、面试 Q&A

### Q：说说你这个 MCP 项目的实现思路？

> MCP 本质上是一个让 AI 模型调用外部能力的协议，类似于给 AI 装插件。实现分四步：
>
> 1. **创建 Server 实例** —— 用 SDK 初始化服务器，声明名称和支持的能力（tools）
> 2. **注册工具清单** —— 通过 `ListToolsRequestSchema`，告诉客户端我提供了哪些工具、入参 schema，AI 就知道什么时候该调用我
> 3. **实现工具逻辑** —— 通过 `CallToolRequestSchema`，根据工具名分发请求，执行 fetch 远程数据、状态检查、内容截断，以 `{ type: "text", text }` 格式返回
> 4. **连接传输层** —— 用 `StdioServerTransport` 通过标准输入输出与客户端通信
>
> 整体就是一个请求-响应模型：客户端问"你有什么工具"→ 返回清单；客户端说"调用某个工具"→ 执行逻辑返回结果。

### Q：为什么用 stdio 而不是 HTTP？

> stdio 是进程间通信，适合本地场景，比如 Claude Desktop 直接拉起子进程通信，零配置、无需端口。如果要部署为远程服务，可以换成 SSE 或 Streamable HTTP 传输层，代码改动只在传输层那一行。

### Q：MCP 和 Function Calling 有什么区别？

> Function Calling 是模型厂商自己的协议，绑定特定平台。MCP 是 Anthropic 提出的开放协议，目标是统一工具调用标准——一个 MCP Server 写一次，任何支持 MCP 的客户端都能用，类似于 USB 接口的思路。

---

## 四、可优化方向

| 方向 | 说明 |
|------|------|
| 参数化查询 | 加入 `keyword` 参数，支持按关键词筛选题目 |
| 缓存机制 | 避免每次调用都 fetch 远程，可加内存缓存 + TTL |
| 多工具扩展 | 拆分为按分类获取（自我介绍题、团队协作题等） |
| Zod 校验 | 项目已引入 zod 但未使用，可用来校验入参 |
