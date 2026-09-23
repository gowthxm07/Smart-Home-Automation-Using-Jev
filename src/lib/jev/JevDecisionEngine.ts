import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { TypeSafeClient } from "@/lib/typesafe/client";
import { SystemOneRequest, SystemOneResponse } from "@/lib/typesafe/types";
import { TypeSafeConfigurationError } from "@/lib/typesafe/errors";

export interface JevDecisionEngineConfig {
  client?: TypeSafeClient;
  modelName?: string;
}

/**
 * JevDecisionEngine adapts the official TypeSafe Jev API into the HomeMind DecisionEngine interface.
 * Milestone 2.1: Establishes the integration foundation, client verification, and typed result preservation.
 *
 * NOTE: Smart-home scenario decision policies (such as GOING_TO_SLEEP) will be implemented in subsequent milestones.
 * No hardcoded action rules or fake AI outputs are generated here.
 */
export class JevDecisionEngine implements DecisionEngine {
  readonly id: string = "jev-system-one";
  readonly name: string = "TypeSafe Jev (Decision-Oriented AI)";
  readonly provider = "JEV" as const;

  private readonly client: TypeSafeClient;
  private readonly defaultModel: string;

  constructor(config: JevDecisionEngineConfig = {}) {
    this.client = config.client || new TypeSafeClient();
    this.defaultModel = config.modelName || "jev-latest";
  }

  /**
   * Returns the underlying TypeSafeClient instance.
   */
  getClient(): TypeSafeClient {
    return this.client;
  }

  /**
   * Verifies connectivity with the TypeSafe API by listing available models.
   */
  async checkHealth(): Promise<{ healthy: boolean; modelCount: number; error?: string }> {
    try {
      const modelList = await this.client.listModels();
      return {
        healthy: true,
        modelCount: modelList.models.length,
      };
    } catch (err: unknown) {
      return {
        healthy: false,
        modelCount: 0,
        error: (err as Error)?.message || String(err),
      };
    }
  }

  /**
   * Evaluates a user intent against current HomeState using the TypeSafe Jev API.
   *
   * In Milestone 2.1, this executes the server-side TypeSafe System One contract if configured.
   * It fails clearly if credentials are missing or the API is unreachable, without producing synthetic decisions.
   */
  async evaluate(intent: string, homeState: HomeState): Promise<DecisionResult> {
    const startTime = Date.now();

    if (!this.client.isConfigured()) {
      throw new TypeSafeConfigurationError(
        "Cannot evaluate intent with Jev: TYPESAFE_API_KEY is not configured on the server."
      );
    }

    if (!intent || !intent.trim()) {
      return {
        engineId: this.id,
        source: "JEV",
        intent: "",
        actions: [],
        confidence: 0,
        reasoning: "Empty intent received; no decisions required.",
        decisionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Prepare content state describing context for Jev System One questions
    const statePayload = {
      userIntent: intent.trim(),
      simulationTime: homeState.simulationTime,
      activeDevicesCount: Object.values(homeState.devices).filter((d) => {
        if ("power" in d.state) return d.state.power === "ON";
        if ("state" in d.state) return d.state.state !== "CLOSED" && d.state.state !== "DISARMED";
        return false;
      }).length,
    };

    // Milestone 2.1 Foundation Question: Validate automation relevance
    const request: SystemOneRequest = {
      model: this.defaultModel,
      state: statePayload,
      questions: {
        is_automation_relevant: {
          type: "noul",
          instructions: "Is this intent requesting an action, routine, or state transition within a smart home?",
        },
      },
    };

    const response: SystemOneResponse = await this.client.evaluateSystemOne(request);

    // Compute confidence based on actual Jev response
    let computedConfidence: number | undefined;
    const noulAns = response.answers["is_automation_relevant"];
    if (noulAns && noulAns.type === "noul") {
      computedConfidence = noulAns.noul;
    }

    const decisionTimeMs = Date.now() - startTime;

    // In Milestone 2.1: Actions array is empty until the policy engine is implemented in Milestone 2.2.
    // Retain full structured Jev output in metadata for evaluation and audit.
    const result: DecisionResult = {
      engineId: this.id,
      source: "JEV",
      intent,
      actions: [],
      confidence: computedConfidence,
      reasoning: `TypeSafe Jev System One evaluation completed using model "${response.model}".`,
      decisionTimeMs,
      metadata: {
        rawAnswers: response.answers,
        modelUsed: response.model,
        tokenUsage: response.usage,
      },
      timestamp: new Date().toISOString(),
    };

    return result;
  }
}
