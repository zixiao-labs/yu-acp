import { spawn, type ChildProcess } from "node:child_process";
import type {
  CreateTerminalRequest,
  CreateTerminalResponse,
  TerminalOutputRequest,
  TerminalOutputResponse,
  WaitForTerminalExitRequest,
  WaitForTerminalExitResponse,
  KillTerminalCommandRequest,
  KillTerminalCommandResponse,
  ReleaseTerminalRequest,
  ReleaseTerminalResponse,
} from "@agentclientprotocol/sdk";

interface TerminalInstance {
  process: ChildProcess;
  output: string;
  outputByteLength: number;
  outputByteLimit: number;
  truncated: boolean;
  exitPromise: Promise<{ exitCode?: number; signal?: string }>;
}

let nextTerminalId = 0;

export class TerminalManager {
  private terminals = new Map<string, TerminalInstance>();

  createTerminal(params: CreateTerminalRequest): CreateTerminalResponse {
    const id = `terminal-${++nextTerminalId}`;
    const { command, args, cwd, env, outputByteLimit } = params;
    const limit = outputByteLimit ?? 1024 * 1024;

    // Convert ACP EnvVariable[] to process env Record
    let spawnEnv: NodeJS.ProcessEnv | undefined;
    if (env) {
      spawnEnv = { ...process.env };
      for (const v of env) {
        spawnEnv[v.name] = v.value;
      }
    }

    const proc = spawn(command, args ?? [], {
      cwd: cwd ?? undefined,
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const instance: TerminalInstance = {
      process: proc,
      output: "",
      outputByteLength: 0,
      outputByteLimit: limit,
      truncated: false,
      exitPromise: new Promise<{ exitCode?: number; signal?: string }>(
        (resolve) => {
          proc.on("exit", (code: number | null, signal: string | null) => {
            resolve({
              exitCode: code ?? undefined,
              signal: signal ?? undefined,
            });
          });
          proc.on("error", () => {
            resolve({ exitCode: 1 });
          });
        },
      ),
    };

    const appendOutput = (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      instance.outputByteLength += chunk.byteLength;
      if (instance.outputByteLength > limit) {
        instance.truncated = true;
      }
      instance.output += text;
    };

    proc.stdout?.on("data", appendOutput);
    proc.stderr?.on("data", appendOutput);

    this.terminals.set(id, instance);
    return { terminalId: id };
  }

  terminalOutput(params: TerminalOutputRequest): TerminalOutputResponse {
    const instance = this.getTerminal(params.terminalId);
    const exitResult = this.getExitStatusSync(instance);
    return {
      output: instance.output,
      truncated: instance.truncated,
      ...(exitResult ? { exitStatus: exitResult } : {}),
    };
  }

  async waitForTerminalExit(
    params: WaitForTerminalExitRequest,
  ): Promise<WaitForTerminalExitResponse> {
    const instance = this.getTerminal(params.terminalId);
    return instance.exitPromise;
  }

  killTerminal(
    params: KillTerminalCommandRequest,
  ): KillTerminalCommandResponse | void {
    const instance = this.getTerminal(params.terminalId);
    instance.process.kill("SIGTERM");
  }

  releaseTerminal(
    params: ReleaseTerminalRequest,
  ): ReleaseTerminalResponse | void {
    const instance = this.terminals.get(params.terminalId);
    if (instance) {
      if (instance.process.exitCode === null) {
        instance.process.kill("SIGKILL");
      }
      this.terminals.delete(params.terminalId);
    }
  }

  releaseAll(): void {
    for (const [id] of this.terminals) {
      this.releaseTerminal({ terminalId: id, sessionId: "" });
    }
  }

  private getTerminal(terminalId: string): TerminalInstance {
    const instance = this.terminals.get(terminalId);
    if (!instance) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    return instance;
  }

  private getExitStatusSync(
    instance: TerminalInstance,
  ): { exitCode?: number; signal?: string } | null {
    const proc = instance.process;
    if (proc.exitCode !== null) {
      return { exitCode: proc.exitCode };
    }
    if (proc.signalCode !== null) {
      return { signal: proc.signalCode };
    }
    return null;
  }
}
