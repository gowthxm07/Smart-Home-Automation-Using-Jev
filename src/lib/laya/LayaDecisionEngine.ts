import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { EvaluationScenario } from "@/lib/evaluation/types";
import { LayaClient } from "./client";
import { LayaClientConfig, LayaDecisionMetadata } from "./types";
import {
  buildLayaQuestions,
  buildLayaStateRepresentation,
  translateLayaDecisionsToActions,
} from "./policy";

/**
 * LayaDecisionEngine integrates Convai Innovations' Laya System-1 non-autoregressive decision model
 * into the HomeMind multi-provider architecture.
 *
 * Conforms to the provider-independent DecisionEngine interface.
 */
export class LayaDecisionEngine implements DecisionEngine {
  readonly id = "laya-system-one";
  readonly name = "Laya (System-1 Decision Model)";
  readonly provider = "LAYA" as const;

  private readonly client: LayaClient;

  constructor(config: LayaClientConfig = {}, client?: LayaClient) {
    this.client = client || new LayaClient(config);
  }

  getClient(): LayaClient {
    return this.client;
  }

  async checkHealth(): Promise<{
    healthy: boolean;
    status: string;
    detail: string;
    loaded?: string[];
  }> {
    return this.client.checkHealth();
  }

  /**
   * Evaluates whether Laya supports the given evaluation scenario.
   * Laya supports all primary home automation scenarios (34/36),
   * leaving out-of-domain security lockdown and ambiguous night requests unsupported.
   */
  supportsScenario(scenario: EvaluationScenario): boolean {
    if (scenario.id === "security-lockdown-01" || scenario.id === "ambiguous-night-ready-01") {
      return false;
    }
    const cat = scenario.metadata?.category;
    if (cat === "SECURITY" && scenario.intent.toLowerCase().includes("lockdown")) {
      return false;
    }
    return true;
  }

  getUnsupportedReason(scenario: EvaluationScenario): string {
    return `Scenario "${scenario.id}" (intent: "${scenario.intent}") is outside Laya's active smart home decision domain.`;
  }

  /**
   * Evaluates natural-language intent and home state using Laya System-1 inference.
   */
  async evaluate(intent: string, homeState: HomeState): Promise<DecisionResult> {
    if (!intent || typeof intent !== "string") {
      throw new Error("LayaDecisionEngine requires a non-empty string intent.");
    }
    if (!homeState || !homeState.devices) {
      throw new Error("LayaDecisionEngine requires a valid HomeState.");
    }

    const startTime = performance.now();

    // 1. Build structured state representation and questions
    const stateRepr = buildLayaStateRepresentation(homeState, intent);
    const questions = buildLayaQuestions(intent, homeState);

    // 2. Call Laya via HTTP
    const response = await this.client.evaluateSystemOne({
      state: stateRepr,
      questions,
      model: this.client.getModel(),
    });

    const decisionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    // 3. Map System-1 answers to concrete actions
    const policyResult = translateLayaDecisionsToActions(intent, homeState, response);

    const routingInfo = (response.routing as Record<string, unknown>) || {};
    const checkpoint = (routingInfo.model as string) || this.client.getModel();
    const repository = (routingInfo.repo as string) || "convaiinnovations/laya";

    const metadata: LayaDecisionMetadata = {
      provider: "laya",
      model: checkpoint,
      checkpoint,
      repository,
      runtime: "laya-serve (FastAPI ASGI / Python PyTorch)",
      architecture: "ModernBERT-large non-autoregressive decision model (421M params)",
      latencyMs: decisionTimeMs,
      rawAnswers: response.answers,
      appliedActions: policyResult.appliedActions,
      skippedRedundantActions: policyResult.skippedRedundantActions,
      occupancyContextPreserved: policyResult.petContextRecognized,
    };

    return {
      engineId: this.id,
      source: "LAYA",
      intent,
      actions: policyResult.actions,
      confidence: policyResult.confidence,
      reasoning: policyResult.reasoning,
      decisionTimeMs,
      timestamp: new Date().toISOString(),
      metadata: metadata as unknown as Record<string, unknown>,
    };
  }
}
