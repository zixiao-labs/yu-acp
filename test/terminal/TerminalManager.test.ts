import { describe, it, expect, afterEach } from "vitest";
import { TerminalManager } from "../../src/terminal/TerminalManager.js";

describe("TerminalManager", () => {
  let manager: TerminalManager;

  afterEach(() => {
    manager?.releaseAll();
  });

  it("creates a terminal and returns an id", () => {
    manager = new TerminalManager();
    const result = manager.createTerminal({
      command: "echo",
      args: ["hello"],
      sessionId: "s1",
    });

    expect(result.terminalId).toMatch(/^terminal-/);
  });

  it("captures output from a terminal", async () => {
    manager = new TerminalManager();
    const { terminalId } = manager.createTerminal({
      command: "echo",
      args: ["hello world"],
      sessionId: "s1",
    });

    await manager.waitForTerminalExit({ terminalId, sessionId: "s1" });
    const output = manager.terminalOutput({ terminalId, sessionId: "s1" });

    expect(output.output).toContain("hello world");
    expect(output.truncated).toBe(false);
  });

  it("waits for terminal exit", async () => {
    manager = new TerminalManager();
    const { terminalId } = manager.createTerminal({
      command: "echo",
      args: ["done"],
      sessionId: "s1",
    });

    const result = await manager.waitForTerminalExit({
      terminalId,
      sessionId: "s1",
    });
    expect(result.exitCode).toBe(0);
  });

  it("kills a running terminal", async () => {
    manager = new TerminalManager();
    const { terminalId } = manager.createTerminal({
      command: "sleep",
      args: ["60"],
      sessionId: "s1",
    });

    manager.killTerminal({ terminalId, sessionId: "s1" });
    const result = await manager.waitForTerminalExit({
      terminalId,
      sessionId: "s1",
    });

    expect(result.signal).toBeDefined();
  });

  it("releases a terminal", () => {
    manager = new TerminalManager();
    const { terminalId } = manager.createTerminal({
      command: "sleep",
      args: ["60"],
      sessionId: "s1",
    });

    manager.releaseTerminal({ terminalId, sessionId: "s1" });

    expect(() =>
      manager.terminalOutput({ terminalId, sessionId: "s1" }),
    ).toThrow("Terminal not found");
  });

  it("throws for unknown terminal id", () => {
    manager = new TerminalManager();
    expect(() =>
      manager.terminalOutput({ terminalId: "nope", sessionId: "s1" }),
    ).toThrow("Terminal not found: nope");
  });

  it("handles env variables", async () => {
    manager = new TerminalManager();
    const { terminalId } = manager.createTerminal({
      command: "sh",
      args: ["-c", "echo $TEST_VAR"],
      env: [{ name: "TEST_VAR", value: "hello_env" }],
      sessionId: "s1",
    });

    await manager.waitForTerminalExit({ terminalId, sessionId: "s1" });
    const output = manager.terminalOutput({ terminalId, sessionId: "s1" });
    expect(output.output).toContain("hello_env");
  });
});
