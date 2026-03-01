import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistryClient } from "../../src/registry/RegistryClient.js";

const mockRegistry = {
  agents: [
    { id: "claude-acp", name: "Claude", version: "0.19.0" },
    { id: "gemini-cli", name: "Gemini CLI", version: "1.0.0" },
  ],
};

describe("RegistryClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and caches the registry", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient({ ttl: 60000 });
    const result1 = await client.fetchRegistry();
    const result2 = await client.fetchRegistry();

    expect(result1.agents).toHaveLength(2);
    expect(result2.agents).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("force-fetches bypasses cache", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient({ ttl: 60000 });
    await client.fetchRegistry();
    await client.fetchRegistry(true);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("listAgents returns agents array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient();
    const agents = await client.listAgents();

    expect(agents).toHaveLength(2);
    expect(agents[0].id).toBe("claude-acp");
  });

  it("getAgent finds by id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient();
    const agent = await client.getAgent("gemini-cli");

    expect(agent).toBeDefined();
    expect(agent!.name).toBe("Gemini CLI");
  });

  it("getAgent returns undefined for unknown id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient();
    const agent = await client.getAgent("nonexistent");

    expect(agent).toBeUndefined();
  });

  it("throws on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    const client = new RegistryClient();
    await expect(client.fetchRegistry()).rejects.toThrow(
      "Registry fetch failed: 404 Not Found",
    );
  });

  it("clearCache resets the cache", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient({ ttl: 60000 });
    await client.fetchRegistry();
    client.clearCache();
    await client.fetchRegistry();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("respects custom registry URL", async () => {
    const customUrl = "https://example.com/registry.json";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRegistry), { status: 200 }),
    );

    const client = new RegistryClient({ registryUrl: customUrl });
    await client.fetchRegistry();

    expect(fetchSpy).toHaveBeenCalledWith(customUrl);
  });
});
