import { spawn, type ChildProcess } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { EventEmitter } from "node:events";
import { AgentResolver } from "./AgentResolver.js";
import type { ResolvedAgent } from "./AgentResolver.js";
import type { AgentConfig } from "../types/index.js";

export interface AgentProcessEvents {
  spawn: [];
  exit: [code: number | null, signal: string | null];
  error: [error: Error];
}

export class AgentProcess extends EventEmitter<AgentProcessEvents> {
  private process: ChildProcess | null = null;
  private resolved: ResolvedAgent;

  readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    const resolver = new AgentResolver();
    this.resolved = resolver.resolve(config);
  }

  spawn(): {
    input: WritableStream<Uint8Array>;
    output: ReadableStream<Uint8Array>;
  } {
    if (this.process) {
      throw new Error("Process already running");
    }

    const env = { ...process.env, ...this.resolved.env };

    this.process = spawn(this.resolved.command, this.resolved.args, {
      stdio: ["pipe", "pipe", "inherit"],
      env,
    });

    this.process.on("error", (err) => this.emit("error", err));
    this.process.on("exit", (code, signal) => {
      this.process = null;
      this.emit("exit", code, signal);
    });

    if (!this.process.stdin || !this.process.stdout) {
      throw new Error("Failed to create stdin/stdout pipes");
    }

    const input = Writable.toWeb(
      this.process.stdin,
    ) as WritableStream<Uint8Array>;
    const output = Readable.toWeb(
      this.process.stdout,
    ) as ReadableStream<Uint8Array>;

    this.emit("spawn");
    return { input, output };
  }

  kill(signal: NodeJS.Signals = "SIGTERM"): void {
    this.process?.kill(signal);
  }

  get running(): boolean {
    return this.process !== null && this.process.exitCode === null;
  }

  get pid(): number | undefined {
    return this.process?.pid;
  }
}
