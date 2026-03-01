#!/usr/bin/env node
/**
 * Minimal mock ACP agent for integration testing.
 * Speaks JSON-RPC 2.0 over stdin/stdout following ACP protocol.
 */
import { Readable, Writable } from "node:stream";
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import type {
  Agent,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  AuthenticateRequest,
  AuthenticateResponse,
} from "@agentclientprotocol/sdk";

const input = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
const output = Writable.toWeb(process.stdout) as WritableStream<Uint8Array>;
const stream = ndJsonStream(output, input);

let sessionCounter = 0;

const conn = new AgentSideConnection((conn): Agent => {
  return {
    async initialize(
      _params: InitializeRequest,
    ): Promise<InitializeResponse> {
      return {
        protocolVersion: PROTOCOL_VERSION,
        agentInfo: { name: "mock-agent", version: "0.1.0" },
      };
    },

    async authenticate(
      _params: AuthenticateRequest,
    ): Promise<AuthenticateResponse> {
      return {};
    },

    async newSession(
      _params: NewSessionRequest,
    ): Promise<NewSessionResponse> {
      const sessionId = `session-${++sessionCounter}`;
      return { sessionId };
    },

    async prompt(params: PromptRequest): Promise<PromptResponse> {
      // Echo back a response as session update
      await conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "Mock response",
          },
        },
      });

      return { stopReason: "end_turn" };
    },

    async cancel(_params: CancelNotification): Promise<void> {
      // No-op for mock
    },
  };
}, stream);

// Keep process alive until connection closes
conn.closed.then(() => {
  process.exit(0);
});
