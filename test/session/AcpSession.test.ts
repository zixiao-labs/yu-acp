import { describe, it, expect, vi } from "vitest";
import { AcpSession } from "../../src/session/AcpSession.js";
import type { Agent, PromptResponse } from "@agentclientprotocol/sdk";

function createMockAgent(
  overrides: Partial<Agent> = {},
): Agent {
  return {
    initialize: vi.fn().mockResolvedValue({ protocolVersion: 1 }),
    newSession: vi.fn().mockResolvedValue({ sessionId: "s1" }),
    prompt: vi.fn().mockResolvedValue({ stopReason: "end_turn" }),
    cancel: vi.fn().mockResolvedValue(undefined),
    authenticate: vi.fn().mockResolvedValue(undefined),
    setSessionMode: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as Agent;
}

describe("AcpSession", () => {
  it("sends a string prompt as ContentBlock array", async () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    await session.prompt("hello");

    expect(agent.prompt).toHaveBeenCalledWith({
      sessionId: "s1",
      prompt: [{ type: "text", text: "hello" }],
    });
  });

  it("sends ContentBlock array as-is", async () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    const blocks = [{ type: "text" as const, text: "hi" }];
    await session.prompt(blocks);

    expect(agent.prompt).toHaveBeenCalledWith({
      sessionId: "s1",
      prompt: blocks,
    });
  });

  it("emits prompt:complete on prompt response", async () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    const responses: PromptResponse[] = [];
    session.on("prompt:complete", (r) => responses.push(r));

    await session.prompt("hello");

    expect(responses).toHaveLength(1);
    expect(responses[0].stopReason).toBe("end_turn");
  });

  it("cancels a session", async () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    await session.cancel();
    expect(agent.cancel).toHaveBeenCalledWith({ sessionId: "s1" });
  });

  it("sets session mode", async () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    await session.setMode("architect");
    expect(agent.setSessionMode).toHaveBeenCalledWith({
      sessionId: "s1",
      modeId: "architect",
    });
  });

  it("emits session:update when routed", () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    const updates: unknown[] = [];
    session.on("session:update", (n) => updates.push(n));

    const notification = {
      sessionId: "s1",
      update: {
        sessionUpdate: "agent_message_chunk" as const,
        content: { type: "text" as const, text: "hi" },
      },
    };
    session._handleSessionUpdate(notification);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(notification);
  });

  it("emits permission:request when routed", () => {
    const agent = createMockAgent();
    const session = new AcpSession("s1", agent);

    let captured: unknown;
    session.on("permission:request", (req) => {
      captured = req;
    });

    const request = {
      sessionId: "s1",
      options: [],
      toolCall: {
        toolCallId: "tc1",
        title: "run cmd",
        status: "pending" as const,
        kind: "execute" as const,
      },
    };
    session._handlePermissionRequest(request, () => {});

    expect(captured).toEqual(request);
  });
});
