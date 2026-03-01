import { EventEmitter } from "node:events";
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import type {
  ClientCapabilities,
  NewSessionRequest,
  LoadSessionRequest,
  AuthenticateRequest,
} from "@agentclientprotocol/sdk";
import { AgentProcess } from "../process/AgentProcess.js";
import { AcpClientHandler } from "./AcpClientHandler.js";
import { AcpSession } from "../session/AcpSession.js";
import { TerminalManager } from "../terminal/TerminalManager.js";
import type {
  AcpClientOptions,
  PermissionHandler,
  FileReadHandler,
  FileWriteHandler,
} from "../types/index.js";
import type { AcpClientEvents } from "../types/events.js";

export class AcpClient extends EventEmitter<AcpClientEvents> {
  private options: AcpClientOptions;
  private agentProcess: AgentProcess;
  private connection: ClientSideConnection | null = null;
  private handler: AcpClientHandler;
  private terminalManager: TerminalManager;
  private sessions = new Map<string, AcpSession>();
  private restartCount = 0;
  private stopping = false;

  constructor(options: AcpClientOptions) {
    super();
    this.options = options;
    this.agentProcess = new AgentProcess(options.agent);
    this.terminalManager = new TerminalManager();
    this.handler = new AcpClientHandler({
      terminalManager: options.capabilities?.terminal
        ? this.terminalManager
        : undefined,
      onSessionUpdate: (notification) => this.routeSessionUpdate(notification),
    });

    this.agentProcess.on("spawn", () => this.emit("process:spawn"));
    this.agentProcess.on("error", (err) => this.emit("process:error", err));
    this.agentProcess.on("exit", (code, signal) => {
      this.emit("process:exit", code, signal);
      this.connection = null;
      if (!this.stopping && this.options.autoRestart) {
        this.attemptRestart();
      }
    });
  }

  async start(): Promise<void> {
    this.stopping = false;
    this.restartCount = 0;
    await this.spawnAndConnect();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.terminalManager.releaseAll();
    this.agentProcess.kill();
    this.connection = null;
  }

  async createSession(params: NewSessionRequest): Promise<AcpSession> {
    const conn = this.getConnection();
    const response = await conn.newSession(params);
    const session = new AcpSession(response.sessionId, conn);
    this.sessions.set(response.sessionId, session);
    return session;
  }

  async loadSession(params: LoadSessionRequest): Promise<AcpSession> {
    const conn = this.getConnection();
    const response = await conn.loadSession(params);
    const session = new AcpSession(response.sessionId, conn);
    this.sessions.set(response.sessionId, session);
    return session;
  }

  async authenticate(params: AuthenticateRequest): Promise<void> {
    const conn = this.getConnection();
    await conn.authenticate(params);
  }

  setPermissionHandler(handler: PermissionHandler): void {
    this.handler.permissionHandler = handler;
  }

  setFileReadHandler(handler: FileReadHandler): void {
    this.handler.fileReadHandler = handler;
  }

  setFileWriteHandler(handler: FileWriteHandler): void {
    this.handler.fileWriteHandler = handler;
  }

  get connected(): boolean {
    return this.connection !== null;
  }

  private async spawnAndConnect(): Promise<void> {
    const { input, output } = this.agentProcess.spawn();
    const stream = ndJsonStream(input, output);

    this.connection = new ClientSideConnection(
      () => this.handler,
      stream,
    );

    const capabilities: ClientCapabilities =
      this.options.capabilities ?? {};

    await this.connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: capabilities,
      clientInfo: { name: "yu-acp", version: "1.0.0" },
    });

    this.emit("connection:ready");

    this.connection.closed.then(() => {
      this.emit("connection:closed");
    });
  }

  private async attemptRestart(): Promise<void> {
    const maxRestarts = this.options.maxRestarts ?? 3;
    const delay = this.options.restartDelay ?? 1000;

    if (this.restartCount >= maxRestarts) {
      this.emit(
        "error",
        new Error(`Max restarts (${maxRestarts}) exceeded`),
      );
      return;
    }

    this.restartCount++;
    this.emit("process:restart", this.restartCount);

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this.stopping) return;

    try {
      await this.spawnAndConnect();
    } catch (err) {
      this.emit(
        "error",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  private routeSessionUpdate(
    notification: import("@agentclientprotocol/sdk").SessionNotification,
  ): void {
    const session = this.sessions.get(notification.sessionId);
    session?._handleSessionUpdate(notification);
  }

  private getConnection(): ClientSideConnection {
    if (!this.connection) {
      throw new Error("Not connected. Call start() first.");
    }
    return this.connection;
  }
}
