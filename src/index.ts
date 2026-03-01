// Main client
export { AcpClient } from "./client/AcpClient.js";
export { AcpClientHandler } from "./client/AcpClientHandler.js";
export type { AcpClientHandlerOptions } from "./client/AcpClientHandler.js";

// Session
export { AcpSession } from "./session/AcpSession.js";

// Process
export { AgentProcess } from "./process/AgentProcess.js";
export { AgentResolver } from "./process/AgentResolver.js";
export type { ResolvedAgent } from "./process/AgentResolver.js";
export type { AgentProcessEvents } from "./process/AgentProcess.js";

// Terminal
export { TerminalManager } from "./terminal/TerminalManager.js";

// Registry
export { RegistryClient } from "./registry/RegistryClient.js";
export type { Registry, RegistryAgent } from "./registry/RegistryClient.js";

// Types
export type {
  AgentConfig,
  AcpClientOptions,
  AgentDistribution,
  NpxDistribution,
  UvxDistribution,
  BinaryDistribution,
  PermissionHandler,
  FileReadHandler,
  FileWriteHandler,
} from "./types/index.js";

export type { AcpSessionEvents, AcpClientEvents } from "./types/events.js";

// Re-export key SDK types and values
export {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  RequestError,
  TerminalHandle,
} from "@agentclientprotocol/sdk";

export type {
  Agent,
  Client,
  Stream,
  ContentBlock,
  TextContent,
  ImageContent,
  AudioContent,
  ResourceLink,
  EmbeddedResource,
  SessionNotification,
  SessionUpdate,
  PromptRequest,
  PromptResponse,
  NewSessionRequest,
  NewSessionResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  InitializeRequest,
  InitializeResponse,
  AuthenticateRequest,
  AuthenticateResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
  RequestPermissionOutcome,
  PermissionOption,
  PermissionOptionKind,
  ClientCapabilities,
  AgentCapabilities,
  StopReason,
  ToolCall,
  ToolCallUpdate,
  ToolCallStatus,
  ToolKind,
  CreateTerminalRequest,
  CreateTerminalResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
  Implementation,
  SessionMode,
  SessionModeState,
  Plan,
  PlanEntry,
} from "@agentclientprotocol/sdk";
