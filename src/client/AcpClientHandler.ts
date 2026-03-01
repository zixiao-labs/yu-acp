import type {
  Client,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
  TerminalOutputRequest,
  TerminalOutputResponse,
  ReleaseTerminalRequest,
  ReleaseTerminalResponse,
  WaitForTerminalExitRequest,
  WaitForTerminalExitResponse,
  KillTerminalCommandRequest,
  KillTerminalCommandResponse,
} from "@agentclientprotocol/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { TerminalManager } from "../terminal/TerminalManager.js";
import type {
  PermissionHandler,
  FileReadHandler,
  FileWriteHandler,
} from "../types/index.js";

export interface AcpClientHandlerOptions {
  terminalManager?: TerminalManager;
  onSessionUpdate?: (notification: SessionNotification) => void;
  permissionHandler?: PermissionHandler;
  fileReadHandler?: FileReadHandler;
  fileWriteHandler?: FileWriteHandler;
}

export class AcpClientHandler implements Client {
  private terminalManager?: TerminalManager;
  private _onSessionUpdate?: (notification: SessionNotification) => void;
  private _permissionHandler?: PermissionHandler;
  private _fileReadHandler?: FileReadHandler;
  private _fileWriteHandler?: FileWriteHandler;

  constructor(options: AcpClientHandlerOptions = {}) {
    this.terminalManager = options.terminalManager;
    this._onSessionUpdate = options.onSessionUpdate;
    this._permissionHandler = options.permissionHandler;
    this._fileReadHandler = options.fileReadHandler;
    this._fileWriteHandler = options.fileWriteHandler;
  }

  set onSessionUpdate(
    handler: ((notification: SessionNotification) => void) | undefined,
  ) {
    this._onSessionUpdate = handler;
  }

  set permissionHandler(handler: PermissionHandler | undefined) {
    this._permissionHandler = handler;
  }

  set fileReadHandler(handler: FileReadHandler | undefined) {
    this._fileReadHandler = handler;
  }

  set fileWriteHandler(handler: FileWriteHandler | undefined) {
    this._fileWriteHandler = handler;
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    this._onSessionUpdate?.(params);
  }

  async requestPermission(
    params: RequestPermissionRequest,
  ): Promise<RequestPermissionResponse> {
    if (this._permissionHandler) {
      return this._permissionHandler(params);
    }
    return { outcome: { outcome: "cancelled" } };
  }

  async readTextFile(
    params: ReadTextFileRequest,
  ): Promise<ReadTextFileResponse> {
    if (this._fileReadHandler) {
      return this._fileReadHandler(params);
    }
    const content = await readFile(params.path, "utf-8");
    return { content };
  }

  async writeTextFile(
    params: WriteTextFileRequest,
  ): Promise<WriteTextFileResponse> {
    if (this._fileWriteHandler) {
      return this._fileWriteHandler(params);
    }
    await mkdir(dirname(params.path), { recursive: true });
    await writeFile(params.path, params.content, "utf-8");
    return {};
  }

  createTerminal(
    params: CreateTerminalRequest,
  ): Promise<CreateTerminalResponse> {
    if (!this.terminalManager) {
      throw new Error("Terminal support not enabled");
    }
    return Promise.resolve(this.terminalManager.createTerminal(params));
  }

  terminalOutput(
    params: TerminalOutputRequest,
  ): Promise<TerminalOutputResponse> {
    if (!this.terminalManager) {
      throw new Error("Terminal support not enabled");
    }
    return Promise.resolve(this.terminalManager.terminalOutput(params));
  }

  releaseTerminal(
    params: ReleaseTerminalRequest,
  ): Promise<ReleaseTerminalResponse | void> {
    if (!this.terminalManager) {
      throw new Error("Terminal support not enabled");
    }
    return Promise.resolve(this.terminalManager.releaseTerminal(params));
  }

  async waitForTerminalExit(
    params: WaitForTerminalExitRequest,
  ): Promise<WaitForTerminalExitResponse> {
    if (!this.terminalManager) {
      throw new Error("Terminal support not enabled");
    }
    return this.terminalManager.waitForTerminalExit(params);
  }

  killTerminal(
    params: KillTerminalCommandRequest,
  ): Promise<KillTerminalCommandResponse | void> {
    if (!this.terminalManager) {
      throw new Error("Terminal support not enabled");
    }
    return Promise.resolve(this.terminalManager.killTerminal(params));
  }
}
