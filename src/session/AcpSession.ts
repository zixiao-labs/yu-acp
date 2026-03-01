import { EventEmitter } from "node:events";
import type {
  Agent,
  ContentBlock,
  PromptResponse,
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionOutcome,
  TextContent,
} from "@agentclientprotocol/sdk";
import type { AcpSessionEvents } from "../types/events.js";

export class AcpSession extends EventEmitter<AcpSessionEvents> {
  readonly sessionId: string;
  private agent: Agent;

  constructor(sessionId: string, agent: Agent) {
    super();
    this.sessionId = sessionId;
    this.agent = agent;
  }

  async prompt(content: string | ContentBlock[]): Promise<PromptResponse> {
    const promptBlocks: ContentBlock[] =
      typeof content === "string"
        ? [{ type: "text", text: content } as TextContent & { type: "text" }]
        : content;

    const response = await this.agent.prompt({
      sessionId: this.sessionId,
      prompt: promptBlocks,
    });

    this.emit("prompt:complete", response);
    return response;
  }

  async cancel(): Promise<void> {
    await this.agent.cancel({ sessionId: this.sessionId });
  }

  async setMode(modeId: string): Promise<void> {
    await this.agent.setSessionMode?.({
      sessionId: this.sessionId,
      modeId,
    });
  }

  /** @internal Called by AcpClient to route session updates */
  _handleSessionUpdate(notification: SessionNotification): void {
    this.emit("session:update", notification);
  }

  /** @internal Called by AcpClient to route permission requests */
  _handlePermissionRequest(
    request: RequestPermissionRequest,
    respond: (outcome: RequestPermissionOutcome) => void,
  ): void {
    this.emit("permission:request", request, respond);
  }
}
