import { describe, it, expect, vi } from "vitest";
import { AcpClientHandler } from "../../src/client/AcpClientHandler.js";
import type { TerminalManager } from "../../src/terminal/TerminalManager.js";

describe("AcpClientHandler", () => {
  it("routes sessionUpdate to callback", async () => {
    const cb = vi.fn();
    const handler = new AcpClientHandler({ onSessionUpdate: cb });

    const notification = {
      sessionId: "s1",
      update: {
        sessionUpdate: "agent_message_chunk" as const,
        content: { type: "text" as const, text: "hi" },
      },
    };

    await handler.sessionUpdate(notification);
    expect(cb).toHaveBeenCalledWith(notification);
  });

  it("returns cancelled when no permission handler is set", async () => {
    const handler = new AcpClientHandler();
    const result = await handler.requestPermission({
      sessionId: "s1",
      options: [],
      toolCall: {
        toolCallId: "tc1",
        title: "test",
        status: "pending",
        kind: "execute",
      },
    });

    expect(result.outcome).toEqual({ outcome: "cancelled" });
  });

  it("delegates to custom permission handler", async () => {
    const handler = new AcpClientHandler({
      permissionHandler: async () => ({
        outcome: { outcome: "selected", optionId: "allow" },
      }),
    });

    const result = await handler.requestPermission({
      sessionId: "s1",
      options: [],
      toolCall: {
        toolCallId: "tc1",
        title: "test",
        status: "pending",
        kind: "execute",
      },
    });

    expect(result.outcome).toEqual({
      outcome: "selected",
      optionId: "allow",
    });
  });

  it("throws when terminal methods called without terminal manager", () => {
    const handler = new AcpClientHandler();
    expect(() =>
      handler.createTerminal({
        command: "echo",
        sessionId: "s1",
      }),
    ).toThrow("Terminal support not enabled");
  });

  it("delegates terminal methods to terminal manager", async () => {
    const mockManager = {
      createTerminal: vi.fn().mockReturnValue({ terminalId: "t1" }),
      terminalOutput: vi.fn().mockReturnValue({ output: "hi", truncated: false }),
      releaseTerminal: vi.fn(),
      waitForTerminalExit: vi.fn().mockResolvedValue({ exitCode: 0 }),
      killTerminal: vi.fn(),
    } as unknown as TerminalManager;

    const handler = new AcpClientHandler({
      terminalManager: mockManager,
    });

    const result = await handler.createTerminal({
      command: "echo",
      sessionId: "s1",
    });
    expect(result.terminalId).toBe("t1");
    expect(mockManager.createTerminal).toHaveBeenCalled();
  });

  it("allows setting handlers after construction", async () => {
    const handler = new AcpClientHandler();

    const permFn = vi.fn().mockResolvedValue({
      outcome: { outcome: "cancelled" },
    });
    handler.permissionHandler = permFn;

    await handler.requestPermission({
      sessionId: "s1",
      options: [],
      toolCall: {
        toolCallId: "tc1",
        title: "test",
        status: "pending",
        kind: "execute",
      },
    });

    expect(permFn).toHaveBeenCalled();
  });
});
