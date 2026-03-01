import type { AgentConfig } from "../types/index.js";

export interface ResolvedAgent {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class AgentResolver {
  resolve(config: AgentConfig): ResolvedAgent {
    const dist = config.distribution;
    let command: string;
    let args: string[];

    if ("npx" in dist) {
      command = process.platform === "win32" ? "npx.cmd" : "npx";
      args = ["-y", dist.npx.package];
    } else if ("uvx" in dist) {
      command = process.platform === "win32" ? "uvx.exe" : "uvx";
      args = [dist.uvx.package];
    } else {
      command = dist.binary.command;
      args = dist.binary.args ?? [];
    }

    return { command, args, env: config.env };
  }
}
