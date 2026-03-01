import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import type { Client, SessionNotification } from "@agentclientprotocol/sdk";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_AGENT_PATH = join(__dirname, "../fixtures/mock-agent.ts");

function spawnMockAgent() {
  const proc = spawn("npx", ["tsx", MOCK_AGENT_PATH], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const input = Writable.toWeb(proc.stdin!) as WritableStream<Uint8Array>;
  const output = Readable.toWeb(proc.stdout!) as ReadableStream<Uint8Array>;

  return { proc, input, output };
}

describe("AcpClient integration", () => {
  it("connects to mock agent, creates session, and prompts", async () => {
    const { proc, input, output } = spawnMockAgent();

    try {
      const stream = ndJsonStream(input, output);

      const updates: SessionNotification[] = [];
      const clientHandler: Client = {
        async sessionUpdate(params: SessionNotification) {
          updates.push(params);
        },
        async requestPermission() {
          return { outcome: { outcome: "cancelled" as const } };
        },
      };

      const connection = new ClientSideConnection(
        () => clientHandler,
        stream,
      );

      const initResponse = await connection.initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientInfo: { name: "test-client", version: "0.1.0" },
      });

      expect(initResponse.agentInfo?.name).toBe("mock-agent");

      const sessionResponse = await connection.newSession({
        cwd: "/tmp",
        mcpServers: [],
      });

      expect(sessionResponse.sessionId).toMatch(/^session-/);

      const promptResponse = await connection.prompt({
        sessionId: sessionResponse.sessionId,
        prompt: [{ type: "text", text: "hello" }],
      });

      expect(promptResponse.stopReason).toBe("end_turn");
      expect(updates.length).toBeGreaterThan(0);
    } finally {
      proc.kill();
    }
  });
});
