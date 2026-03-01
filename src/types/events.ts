import type {
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionOutcome,
  PromptResponse,
} from "@agentclientprotocol/sdk";

export interface AcpSessionEvents {
  "session:update": [notification: SessionNotification];
  "permission:request": [
    request: RequestPermissionRequest,
    respond: (outcome: RequestPermissionOutcome) => void,
  ];
  "prompt:complete": [response: PromptResponse];
  error: [error: Error];
}

export interface AcpClientEvents {
  "process:spawn": [];
  "process:exit": [code: number | null, signal: string | null];
  "process:error": [error: Error];
  "process:restart": [attempt: number];
  "connection:ready": [];
  "connection:closed": [];
  error: [error: Error];
}
