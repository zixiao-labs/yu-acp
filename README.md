# 余(Yu)

[![npm](https://img.shields.io/npm/v/yu-acp)](https://www.npmjs.com/package/yu-acp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 的 TypeScript 客户端库，为 Electron IDE 设计。负责 agent 进程的生命周期管理、JSON-RPC 通信、会话管理以及终端/文件操作代理。

## 安装

```bash
npm install yu-acp
```

要求 Node.js >= 20。本包为 ESM only。

## 快速开始

```typescript
import { AcpClient } from "yu-acp";

const client = new AcpClient({
  agent: {
    id: "my-agent",
    name: "My Agent",
    version: "1.0.0",
    distribution: { npx: { package: "my-acp-agent" } },
  },
});

// 启动 agent 进程并建立连接
await client.start();

// 创建会话
const session = await client.createSession({
  cwd: process.cwd(),
  mcpServers: [],
});

// 监听 agent 的流式更新
session.on("session:update", (notification) => {
  const update = notification.update;
  if (update.sessionUpdate === "agent_message_chunk") {
    process.stdout.write(update.content.text ?? "");
  }
});

// 发送 prompt
const response = await session.prompt("Hello!");
console.log("Stop reason:", response.stopReason);

// 停止 agent
await client.stop();
```

## Agent 分发方式

`AgentConfig.distribution` 支持三种方式启动 agent：

```typescript
// npx — 通过 npm 包运行
{ npx: { package: "@some-org/acp-agent" } }

// uvx — 通过 Python uv 包运行
{ uvx: { package: "some-python-agent" } }

// binary — 直接运行可执行文件
{ binary: { command: "/path/to/agent", args: ["--flag"] } }
```

可通过 `env` 字段为 agent 进程注入环境变量：

```typescript
const client = new AcpClient({
  agent: {
    id: "my-agent",
    name: "My Agent",
    version: "1.0.0",
    distribution: { npx: { package: "my-acp-agent" } },
    env: { API_KEY: "sk-..." },
  },
});
```

## 客户端能力（Capabilities）

通过 `capabilities` 选项声明客户端支持的功能，agent 可据此决定是否使用终端、文件读写等操作：

```typescript
const client = new AcpClient({
  agent: { /* ... */ },
  capabilities: {
    terminal: true,
  },
});
```

## 自定义 Handler

客户端默认使用 Node.js `fs` 处理文件操作。可自定义以适配 IDE 虚拟文件系统或权限对话框：

```typescript
// 自定义权限处理
client.setPermissionHandler(async (request) => {
  const allowed = await showPermissionDialog(request);
  return { outcome: { outcome: allowed ? "approved" : "denied" } };
});

// 自定义文件读写
client.setFileReadHandler(async (request) => {
  const content = await myEditor.readFile(request.path);
  return { content };
});

client.setFileWriteHandler(async (request) => {
  await myEditor.writeFile(request.path, request.content);
  return {};
});
```

## 自动重启

agent 进程意外退出时可自动重启：

```typescript
const client = new AcpClient({
  agent: { /* ... */ },
  autoRestart: true,
  maxRestarts: 3,     // 默认 3
  restartDelay: 1000, // 默认 1000ms
});
```

## 事件

### AcpClient 事件

```typescript
client.on("process:spawn", () => {});
client.on("process:exit", (code, signal) => {});
client.on("process:error", (error) => {});
client.on("process:restart", (attempt) => {});
client.on("connection:ready", () => {});
client.on("connection:closed", () => {});
client.on("error", (error) => {});
```

### AcpSession 事件

```typescript
session.on("session:update", (notification) => {});
session.on("prompt:complete", (response) => {});
session.on("error", (error) => {});
```

## Registry

查询 ACP 公共 agent 注册表：

```typescript
import { RegistryClient } from "yu-acp";

const registry = new RegistryClient();

// 列出所有已注册的 agent
const agents = await registry.listAgents();

// 按 ID 查找
const agent = await registry.getAgent("some-agent-id");
```

## API 参考

### `AcpClient`

| 方法 | 说明 |
|------|------|
| `start()` | 启动 agent 进程并完成协议握手 |
| `stop()` | 终止 agent 进程，释放所有终端 |
| `createSession(params)` | 创建新会话 |
| `loadSession(params)` | 加载已有会话 |
| `authenticate(params)` | 认证 |
| `setPermissionHandler(handler)` | 设置权限请求处理器 |
| `setFileReadHandler(handler)` | 设置文件读取处理器 |
| `setFileWriteHandler(handler)` | 设置文件写入处理器 |
| `connected` | 是否已连接 |

### `AcpSession`

| 方法 | 说明 |
|------|------|
| `prompt(content)` | 发送 prompt，接受 `string` 或 `ContentBlock[]` |
| `cancel()` | 取消当前请求 |
| `setMode(modeId)` | 切换会话模式 |
| `sessionId` | 会话 ID |

### `RegistryClient`

| 方法 | 说明 |
|------|------|
| `listAgents()` | 列出所有 agent |
| `getAgent(id)` | 按 ID 获取 agent |
| `fetchRegistry(force?)` | 获取完整注册表（带 TTL 缓存） |
| `clearCache()` | 清除缓存 |

## License

[MIT](LICENSE)

### More

寓居市井的厨师，余，终日在灶台前忙碌。

切配烧洗，样样全能。

用于提升余的潜能。

一份空白的菜单，凭此可找余单独开小灶。看着它，有些人就已经馋得流口水了。

Yu, a chef living in the city, toils daily at the stove.

Chopping, preparing, cooking, washing—he's a jack-of-all-trades.

To further develop Yu's potential.

A blank menu—with which one can request a private meal from Yu. Just looking at it makes some people's mouths water.
