import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import { LayaDecisionEngine } from "@/lib/laya/LayaDecisionEngine";
import { LLMDecisionEngine } from "@/lib/llm/LLMDecisionEngine";
import { getEffectiveTypeSafeApiKey } from "@/lib/typesafe/credentials";
import { ProviderAvailabilityInfo } from "@/lib/evaluation/comparison/types";
import {
  ProviderEnablementMap,
  ProviderId,
  ProviderRegistration,
  ProviderRuntimeStatus,
} from "./types";

/**
 * Universal Provider Registry & Orchestrator.
 *
 * Implements provider-neutral management:
 * - Dynamic registration of DecisionEngine providers (Jev, Laya, LLM, etc.)
 * - Strict separation of user enablement (UI configuration) vs verified backend availability
 * - Safe execution filtering: only providers that are BOTH enabled AND available can execute
 * - Provider-independent Strategy Pattern: ZERO hardcoded "if provider === 'jev'" branches
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderRegistration>();

  /**
   * Registers a provider with the registry.
   */
  register(registration: ProviderRegistration): void {
    this.providers.set(registration.providerId.toUpperCase(), registration);
  }

  /**
   * Unregisters a provider by ID.
   */
  unregister(providerId: string): boolean {
    return this.providers.delete(providerId.toUpperCase());
  }

  /**
   * Gets a registered provider by ID.
   */
  get(providerId: string): ProviderRegistration | undefined {
    return this.providers.get(providerId.toUpperCase());
  }

  /**
   * Returns all registered providers.
   */
  getAll(): ProviderRegistration[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns providers that are marked enabled in the configuration map.
   * NOTE: Enabled does NOT mean available. Use getExecutable() for running executions.
   */
  getEnabled(enablement: ProviderEnablementMap): ProviderRegistration[] {
    return this.getAll().filter((p) => enablement[p.providerId] ?? true);
  }

  /**
   * Evaluates availability across all registered providers.
   */
  async checkAllAvailability(): Promise<Record<string, ProviderAvailabilityInfo>> {
    const results: Record<string, ProviderAvailabilityInfo> = {};
    for (const provider of this.getAll()) {
      results[provider.providerId] = await provider.checkAvailability();
    }
    return results;
  }

  /**
   * Resolves the full runtime status of all providers, explaining enablement and availability.
   */
  async getStatuses(enablement: ProviderEnablementMap): Promise<ProviderRuntimeStatus[]> {
    const statuses: ProviderRuntimeStatus[] = [];

    for (const provider of this.getAll()) {
      const isEnabled = enablement[provider.providerId] ?? true;
      const availability = await provider.checkAvailability();
      const canExecute = isEnabled && availability.status === "AVAILABLE";

      let statusExplanation: string;
      if (isEnabled && availability.status === "AVAILABLE") {
        statusExplanation = "Ready for execution.";
      } else if (isEnabled && availability.status === "UNAVAILABLE_CONFIGURATION") {
        statusExplanation = `${provider.displayName} is enabled but unavailable because required configuration/credentials are missing.`;
      } else if (isEnabled && availability.status === "UNAVAILABLE_SERVICE") {
        statusExplanation = `${provider.displayName} is enabled but unavailable because the service daemon is unreachable.`;
      } else if (!isEnabled && availability.status === "AVAILABLE") {
        statusExplanation = "Available but disabled by user configuration.";
      } else {
        statusExplanation = `Disabled (also unavailable: ${availability.status}).`;
      }

      statuses.push({
        providerId: provider.providerId,
        engineId: provider.engineId,
        displayName: provider.displayName,
        enabled: isEnabled,
        availability,
        canExecute,
        statusExplanation,
        metadata: provider.modelMetadata,
      });
    }

    return statuses;
  }

  /**
   * Returns providers that are strictly BOTH enabled AND available.
   * This is the only safe set for comparative or standalone execution.
   */
  async getExecutable(enablement: ProviderEnablementMap): Promise<ProviderRegistration[]> {
    const enabledProviders = this.getEnabled(enablement);
    const executable: ProviderRegistration[] = [];

    for (const provider of enabledProviders) {
      const availability = await provider.checkAvailability();
      if (availability.status === "AVAILABLE") {
        executable.push(provider);
      }
    }

    return executable;
  }
}

/**
 * Creates and initializes the default HomeMind ProviderRegistry with JEV, LAYA, and LLM engines.
 */
export function createDefaultProviderRegistry(params?: {
  jevEngine?: JevDecisionEngine;
  layaEngine?: LayaDecisionEngine;
  llmEngine?: LLMDecisionEngine;
}): ProviderRegistry {
  const registry = new ProviderRegistry();

  const jevEngine = params?.jevEngine || new JevDecisionEngine();
  const layaEngine = params?.layaEngine || new LayaDecisionEngine();
  const llmEngine = params?.llmEngine || new LLMDecisionEngine();

  // 1. Register TypeSafe Jev
  registry.register({
    providerId: "JEV",
    engineId: jevEngine.id,
    displayName: "TypeSafe Jev (Decision-Oriented AI)",
    engine: jevEngine,
    modelMetadata: {
      model: "jev-latest",
      runtime: "TypeSafe Cloud API (System-1 Decision Engine)",
      architecture: "Decision-Oriented Non-Autoregressive AI",
      endpoint: process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai",
      isLocal: false,
      description: "Proprietary System-1 decision API by TypeSafe AI with calibrated confidence.",
    },
    isScenarioSupported: (s) => jevEngine.supportsScenario(s),
    getUnsupportedReason: (s) =>
      `Scenario category "${s.metadata?.category || "UNKNOWN"}" is outside Jev's active intent workflow families.`,
    checkAvailability: async () => {
      const activeKey = getEffectiveTypeSafeApiKey();
      if (!activeKey) {
        return {
          providerId: "JEV",
          engineId: jevEngine.id,
          status: "UNAVAILABLE_CONFIGURATION",
          detail: "TypeSafe API key is not configured (portal registration is at capacity).",
        };
      }
      try {
        const health = await jevEngine.checkHealth();
        if (health.healthy) {
          return {
            providerId: "JEV",
            engineId: jevEngine.id,
            status: "AVAILABLE",
            detail: "TypeSafe Jev API credentials configured and endpoint reachable.",
          };
        }
        return {
          providerId: "JEV",
          engineId: jevEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `TypeSafe Jev API unreachable: ${health.error || "service unavailable"}`,
        };
      } catch (err: unknown) {
        return {
          providerId: "JEV",
          engineId: jevEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `TypeSafe Jev API error: ${(err as Error)?.message || "connection error"}`,
        };
      }
    },
  });

  // 2. Register Laya
  registry.register({
    providerId: "LAYA",
    engineId: layaEngine.id,
    displayName: "Laya (System-1 Decision Model)",
    engine: layaEngine,
    modelMetadata: {
      model: layaEngine.getClient().getModel(),
      runtime: "laya-serve (FastAPI / PyTorch)",
      architecture: "ModernBERT-large Non-Autoregressive Decision Model (421M params)",
      endpoint: layaEngine.getClient().getBaseUrl(),
      isLocal: true,
      description: "Open-source, self-hosted System-1 decision model by Convai Innovations.",
    },
    isScenarioSupported: (s) => layaEngine.supportsScenario(s),
    getUnsupportedReason: (s) => layaEngine.getUnsupportedReason(s),
    checkAvailability: async () => {
      try {
        const health = await layaEngine.checkHealth();
        if (health.healthy) {
          return {
            providerId: "LAYA",
            engineId: layaEngine.id,
            status: "AVAILABLE",
            detail: health.detail,
          };
        }
        return {
          providerId: "LAYA",
          engineId: layaEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `Laya server unreachable at ${layaEngine.getClient().getBaseUrl()}. Start local daemon via: laya-serve`,
        };
      } catch (err: unknown) {
        return {
          providerId: "LAYA",
          engineId: layaEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `Laya connection failed: ${(err as Error)?.message}`,
        };
      }
    },
  });

  // 3. Register Conventional LLM (Local Ollama)
  registry.register({
    providerId: "LLM",
    engineId: llmEngine.id,
    displayName: "Conventional LLM (Local Ollama)",
    engine: llmEngine,
    modelMetadata: {
      model: llmEngine.getModel(),
      runtime: "Ollama Local Daemon",
      architecture: "Generative Autoregressive Large Language Model",
      endpoint: llmEngine.getClient().getBaseUrl(),
      isLocal: true,
      description: "Local conventional LLM baseline generating structured JSON actions via chat completion.",
    },
    isScenarioSupported: () => true,
    checkAvailability: async () => {
      try {
        const health = await llmEngine.checkHealth();
        if (health.healthy) {
          return {
            providerId: "LLM",
            engineId: llmEngine.id,
            status: "AVAILABLE",
            detail: `Local Ollama is healthy and model '${llmEngine.getModel()}' is available.`,
          };
        }
        return {
          providerId: "LLM",
          engineId: llmEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `Local Ollama unreachable: ${health.error || "service unavailable"}`,
        };
      } catch (err: unknown) {
        return {
          providerId: "LLM",
          engineId: llmEngine.id,
          status: "UNAVAILABLE_SERVICE",
          detail: `Ollama error: ${(err as Error)?.message}`,
        };
      }
    },
  });

  return registry;
}
