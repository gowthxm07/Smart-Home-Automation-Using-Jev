import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { OllamaClient } from "@/lib/ollama";
import { LLMDecisionEngineConfig } from "./types";
import {
  DEFAULT_LLM_SYSTEM_PROMPT,
  HOMEMIND_LLM_PROMPT_VERSION,
  buildLLMHomeContext,
  buildLLMUserPrompt,
} from "./prompts";
import { validateAndNormalizeLLMResponse } from "./validator";
import { LLMConfigurationError } from "./errors";

export const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";

/**
 * Conventional LLM Decision Engine powered by local Ollama.
 *
 * Implements the unified DecisionEngine interface, providing a second
 * genuine decision provider that produces the exact same provider-neutral
 * DecisionResult / Action[] abstraction used by Jev.
 *
 * STRICT RESEARCH INTEGRITY:
 * - Purely local Ollama runtime (zero cloud LLMs, zero paid APIs).
 * - Zero dataset contamination: receives only intent and state context.
 * - Strict structured output validation (device existence, capabilities, types).
 * - State-aware redundancy normalization preserving audit metadata.
 * - Zero fallback to Jev or hardcoded rules on failure.
 */
export class LLMDecisionEngine implements DecisionEngine {
  readonly id: string = "llm-ollama";
  readonly name: string = "Conventional LLM (Local Ollama)";
  readonly provider = "LLM" as const;

  private readonly client: OllamaClient;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor(config: LLMDecisionEngineConfig = {}) {
    const configuredModel =
      config.model ||
      (typeof process !== "undefined" ? process.env.OLLAMA_MODEL : undefined) ||
      DEFAULT_OLLAMA_MODEL;

    if (!configuredModel || !configuredModel.trim()) {
      throw new LLMConfigurationError("Ollama model name cannot be empty.");
    }

    this.model = configuredModel.trim();
    this.client =
      config.client ||
      new OllamaClient({
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      });
    this.systemPrompt = config.systemPrompt || DEFAULT_LLM_SYSTEM_PROMPT;
  }

  /**
   * Returns the underlying OllamaClient instance.
   */
  getClient(): OllamaClient {
    return this.client;
  }

  /**
   * Returns the configured Ollama model identifier.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Verifies connectivity with local Ollama runtime and checks model availability.
   */
  async checkHealth(): Promise<{ healthy: boolean; modelCount: number; modelAvailable: boolean; error?: string }> {
    try {
      const tags = await this.client.listModels();
      const models = tags.models || [];
      const hasModel = models.some(
        (m) => m.name === this.model || m.name.startsWith(`${this.model}:`)
      );

      return {
        healthy: true,
        modelCount: models.length,
        modelAvailable: hasModel,
      };
    } catch (err: unknown) {
      return {
        healthy: false,
        modelCount: 0,
        modelAvailable: false,
        error: (err as Error)?.message || String(err),
      };
    }
  }

  /**
   * Evaluates a user natural language intent against current HomeState context.
   */
  async evaluate(intent: string, homeState: HomeState): Promise<DecisionResult> {
    const startTime = performance.now();

    if (!intent || !intent.trim()) {
      return {
        engineId: this.id,
        source: "LLM",
        intent: "",
        actions: [],
        reasoning: "Empty intent received; no decisions required.",
        decisionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        metadata: {
          provider: "ollama",
          model: this.model,
          promptVersion: HOMEMIND_LLM_PROMPT_VERSION,
          proposedActions: [],
          skippedRedundantActions: [],
          skippedRedundantReasons: [],
          appliedActions: [],
          rawDecisions: [],
        },
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Build minimal, decoupled home context
    const homeContext = buildLLMHomeContext(homeState);
    const userPrompt = buildLLMUserPrompt(intent, homeContext);

    // 2. Invoke local Ollama
    const response = await this.client.chat({
      model: this.model,
      format: "json",
      stream: false,
      options: {
        temperature: 0.0, // Zero temperature for reproducible evaluation
      },
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.message?.content || "";

    // 3. Validate response and normalize redundant actions
    const validationResult = validateAndNormalizeLLMResponse(rawContent, homeState);

    const decisionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    // 4. Return provider-neutral DecisionResult
    // NOTE: confidence is intentionally omitted (undefined) because conventional LLMs
    // do not produce calibrated confidence scores.
    return {
      engineId: this.id,
      source: "LLM",
      intent: intent.trim(),
      actions: validationResult.actions,
      reasoning: validationResult.reasoning || `LLM evaluated intent with ${validationResult.actions.length} action(s).`,
      decisionTimeMs,
      metadata: {
        provider: "ollama",
        model: this.model,
        promptVersion: HOMEMIND_LLM_PROMPT_VERSION,
        proposedActions: validationResult.proposedActions,
        skippedRedundantActions: validationResult.skippedRedundantActions,
        skippedRedundantReasons: validationResult.skippedRedundantReasons,
        rawDecisions: validationResult.rawDecisions,
        appliedActions: validationResult.appliedActions,
        ollamaMetrics: {
          totalDurationNs: response.total_duration,
          loadDurationNs: response.load_duration,
          promptEvalCount: response.prompt_eval_count,
          evalCount: response.eval_count,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
