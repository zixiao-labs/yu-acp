import { describe, it, expect, afterEach } from "vitest";
import { AgentProcess } from "../../src/process/AgentProcess.js";
import type { AgentConfig } from "../../src/types/index.js";

const echoConfig: AgentConfig = {
  id: "echo",
  name: "Echo",
  version: "1.0.0",
  distribution: { binary: { command: "echo", args: ["hello"] } },
};

describe("AgentProcess", () => {
  let proc: AgentProcess | null = null;

  afterEach(() => {
    proc?.kill();
    proc = null;
  });

  it("spawns a process and returns Web Streams", () => {
    proc = new AgentProcess(echoConfig);
    const { input, output } = proc.spawn();

    expect(input).toBeInstanceOf(WritableStream);
    expect(output).toBeInstanceOf(ReadableStream);
  });

  it("throws if already running", () => {
    const config: AgentConfig = {
      id: "cat",
      name: "Cat",
      version: "1.0.0",
      distribution: { binary: { command: "cat" } },
    };
    proc = new AgentProcess(config);
    proc.spawn();

    expect(() => proc!.spawn()).toThrow("Process already running");
  });

  it("emits spawn event", async () => {
    proc = new AgentProcess(echoConfig);
    const spawned = new Promise<void>((resolve) =>
      proc!.on("spawn", resolve),
    );
    proc.spawn();
    await spawned;
  });

  it("emits exit event when process terminates", async () => {
    proc = new AgentProcess(echoConfig);
    const exited = new Promise<[number | null, string | null]>((resolve) =>
      proc!.on("exit", (code, signal) => resolve([code, signal])),
    );
    proc.spawn();

    const [code] = await exited;
    expect(code).toBe(0);
  });

  it("reports running state", async () => {
    const config: AgentConfig = {
      id: "cat",
      name: "Cat",
      version: "1.0.0",
      distribution: { binary: { command: "cat" } },
    };
    proc = new AgentProcess(config);
    proc.spawn();

    expect(proc.running).toBe(true);
    proc.kill();

    await new Promise<void>((resolve) => proc!.on("exit", () => resolve()));
    expect(proc.running).toBe(false);
  });
});
