# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`yu-acp` — TypeScript client library wrapping `@agentclientprotocol/sdk` (v0.14.1) for Electron IDEs. ESM-only (`"type": "module"`), Node 20+.

## Commands

```bash
npm run build          # tsc -p tsconfig.build.json → dist/
npm run typecheck      # tsc --noEmit (includes tests)
npm test               # vitest run
npm run test:watch     # vitest (watch mode)
npx vitest run test/client/AcpClient.test.ts  # single test file
```

## Architecture

**AcpClient** is the main entry point. It orchestrates the full lifecycle:

```
AcpClient
├── AgentProcess    — spawns agent child process (stdin/stdout pipes)
│   └── AgentResolver — resolves AgentConfig distribution (npx/uvx/binary) to command+args
├── AcpClientHandler — implements SDK's Client interface (handles agent→client requests)
│   └── TerminalManager — manages spawned terminal child processes
├── ClientSideConnection (from SDK) — JSON-RPC 2.0 over ndJsonStream
└── AcpSession(s)  — per-session prompt/cancel/setMode, receives routed SessionNotifications
```

**Data flow**: `AcpClient.start()` → `AgentProcess.spawn()` → pipes converted to web streams → `ndJsonStream(input, output)` (note: writable first, readable second) → `ClientSideConnection` initialized with protocol version handshake.

**RegistryClient** is independent — fetches the public ACP agent registry with TTL caching.

## SDK Gotchas

These are easy to get wrong when working with `@agentclientprotocol/sdk`:

- `SessionUpdate` discriminator field is `sessionUpdate` (not `kind`): `{ sessionUpdate: "agent_message_chunk", content: {...} }`
- `PromptRequest` uses `.prompt` (array of ContentBlock), not `.content`
- `ContentBlock` is a union: `(TextContent & { type: "text" }) | (ImageContent & { type: "image" }) | ...`
- `NewSessionRequest` requires `cwd: string` and `mcpServers: Array<McpServer>`
- `AuthenticateRequest` has `methodId: string` only
- `CreateTerminalRequest.env` is `Array<EnvVariable>` (each `{ name, value }`), not a Record
- `ndJsonStream(output, input)` — WritableStream first, ReadableStream second
- `Agent.authenticate` is required in the interface (not optional)

## Testing Patterns

- Mock agent fixture at `test/fixtures/mock-agent.ts` — a minimal ACP agent on stdin/stdout, run via `npx tsx`
- When mocking `fetch`, use `mockImplementation(() => new Response(...))` not `mockResolvedValue(new Response(...))` — Response body can only be read once per instance
- Test timeout is 15s (configured in vitest.config.ts)

## Code Conventions

- All imports use `.js` extensions (ESM resolution)
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Typed `EventEmitter<Events>` pattern used throughout (AcpClient, AcpSession, AgentProcess)
- `_`-prefixed methods (`_handleSessionUpdate`) are internal cross-class calls
