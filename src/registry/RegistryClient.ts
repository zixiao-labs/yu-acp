const REGISTRY_URL =
  "https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json";

export interface RegistryAgent {
  id: string;
  name: string;
  version: string;
  description?: string;
  distribution?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Registry {
  agents: RegistryAgent[];
  [key: string]: unknown;
}

export class RegistryClient {
  private cache: Registry | null = null;
  private cacheTime = 0;
  private ttl: number;
  private registryUrl: string;

  constructor(options?: { ttl?: number; registryUrl?: string }) {
    this.ttl = options?.ttl ?? 5 * 60 * 1000;
    this.registryUrl = options?.registryUrl ?? REGISTRY_URL;
  }

  async fetchRegistry(force = false): Promise<Registry> {
    if (!force && this.cache && Date.now() - this.cacheTime < this.ttl) {
      return this.cache;
    }

    const response = await fetch(this.registryUrl);
    if (!response.ok) {
      throw new Error(
        `Registry fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    this.cache = (await response.json()) as Registry;
    this.cacheTime = Date.now();
    return this.cache;
  }

  async listAgents(): Promise<RegistryAgent[]> {
    const registry = await this.fetchRegistry();
    return registry.agents;
  }

  async getAgent(id: string): Promise<RegistryAgent | undefined> {
    const registry = await this.fetchRegistry();
    return registry.agents.find((a) => a.id === id);
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }
}
