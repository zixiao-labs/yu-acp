import type {
  ClientCapabilities,
  RequestPermissionRequest,
  RequestPermissionResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
} from "@agentclientprotocol/sdk";

export interface NpxDistribution {
  npx: { package: string };
}

export interface UvxDistribution {
  uvx: { package: string };
}

export interface BinaryDistribution {
  binary: { command: string; args?: string[] };
}

export type AgentDistribution =
  | NpxDistribution
  | UvxDistribution
  | BinaryDistribution;

export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  distribution: AgentDistribution;
  env?: Record<string, string>;
}

export interface AcpClientOptions {
  agent: AgentConfig;
  capabilities?: ClientCapabilities;
  autoRestart?: boolean;
  maxRestarts?: number;
  restartDelay?: number;
}

export type PermissionHandler = (
  request: RequestPermissionRequest,
) => Promise<RequestPermissionResponse>;

export type FileReadHandler = (
  request: ReadTextFileRequest,
) => Promise<ReadTextFileResponse>;

export type FileWriteHandler = (
  request: WriteTextFileRequest,
) => Promise<WriteTextFileResponse>;
