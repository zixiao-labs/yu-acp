import { describe, it, expect } from "vitest";
import { AgentResolver } from "../../src/process/AgentResolver.js";
import type { AgentConfig } from "../../src/types/index.js";

describe("AgentResolver", () => {
  const resolver = new AgentResolver();

  it("resolves npx distribution", () => {
    const config: AgentConfig = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      distribution: { npx: { package: "@test/agent@1.0.0" } },
    };

    const result = resolver.resolve(config);
    expect(result.command).toBe(
      process.platform === "win32" ? "npx.cmd" : "npx",
    );
    expect(result.args).toEqual(["-y", "@test/agent@1.0.0"]);
  });

  it("resolves uvx distribution", () => {
    const config: AgentConfig = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      distribution: { uvx: { package: "test-agent" } },
    };

    const result = resolver.resolve(config);
    expect(result.command).toBe(
      process.platform === "win32" ? "uvx.exe" : "uvx",
    );
    expect(result.args).toEqual(["test-agent"]);
  });

  it("resolves binary distribution", () => {
    const config: AgentConfig = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      distribution: { binary: { command: "/usr/local/bin/agent", args: ["--mode", "acp"] } },
    };

    const result = resolver.resolve(config);
    expect(result.command).toBe("/usr/local/bin/agent");
    expect(result.args).toEqual(["--mode", "acp"]);
  });

  it("resolves binary distribution with no args", () => {
    const config: AgentConfig = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      distribution: { binary: { command: "/usr/local/bin/agent" } },
    };

    const result = resolver.resolve(config);
    expect(result.args).toEqual([]);
  });

  it("passes through env from config", () => {
    const config: AgentConfig = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      distribution: { binary: { command: "agent" } },
      env: { API_KEY: "secret" },
    };

    const result = resolver.resolve(config);
    expect(result.env).toEqual({ API_KEY: "secret" });
  });
});
