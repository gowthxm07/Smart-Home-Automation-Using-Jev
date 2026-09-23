import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { TypeSafeClient } from "@/lib/typesafe/client";
import { SystemOneRequest, SystemOneResponse } from "@/lib/typesafe/types";
import { TypeSafeConfigurationError } from "@/lib/typesafe/errors";
import { JevDecisionTrace, buildTraceItem } from "./trace";
import { GoingToSleepPolicy } from "@/lib/policies/GoingToSleepPolicy";
import {
  LockState,
  LightState,
  CurtainState,
  SecurityState,
  FanState,
  ACState,
} from "@/types/device";

export interface JevDecisionEngineConfig {
  client?: TypeSafeClient;
  modelName?: string;
}

/**
 * JevDecisionEngine adapts the official TypeSafe Jev API into the HomeMind DecisionEngine interface.
 *
 * Milestone 2.2: First Real Jev Decision Workflow for GOING_TO_SLEEP.
 *
 * WORKFLOW:
 * 1. Read current relevant HomeState context.
 * 2. Send structured decision questions to Jev (POST /v1/systemone).
 * 3. Receive real structured answers (Noul, Choice) and build JevDecisionTrace.
 * 4. Pass trace and HomeState to GoingToSleepPolicy to generate non-redundant Action[].
 * 5. Return typed DecisionResult ready for SimulationEngine execution.
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
   * Evaluates a user intent against current HomeState.
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

    const normalizedIntent = intent.trim().toLowerCase();

    // Milestone 2.2: Focus exclusively on GOING_TO_SLEEP scenario
    const isGoingToSleep =
      normalizedIntent.includes("sleep") ||
      normalizedIntent.includes("bed") ||
      homeState.currentScenario?.id === "GOING_TO_SLEEP";

    if (!isGoingToSleep) {
      // Step 13: Other scenarios remain intent-only for this milestone
      return {
        engineId: this.id,
        source: "JEV",
        intent,
        actions: [],
        confidence: 0,
        reasoning: `Scenario decision workflow for "${intent}" is scheduled for future milestones. Only GOING_TO_SLEEP is active in Milestone 2.2.`,
        decisionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Step 2: Use current HomeState as clean relevant context
    const lockDevice = homeState.devices["lock_main_door"];
    const lrLight = homeState.devices["light_living_room"];
    const tvDevice = homeState.devices["tv_living_room"];
    const lrCurtain = homeState.devices["curtain_living_room"];
    const brCurtain = homeState.devices["curtain_bedroom"];
    const secDevice = homeState.devices["security_system"];
    const brFan = homeState.devices["fan_bedroom"];
    const lrAC = homeState.devices["ac_living_room"];

    const stateContext = {
      scenario: "GOING_TO_SLEEP",
      userIntent: intent.trim(),
      simulationTime: homeState.simulationTime,
      currentDevices: {
        mainDoorLock: (lockDevice?.state as LockState)?.state ?? "UNKNOWN",
        livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
        livingRoomTV: "power" in (tvDevice?.state ?? {}) ? (tvDevice?.state as any).power : "UNKNOWN",
        livingRoomCurtains: (lrCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
        bedroomCurtains: (brCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
        securitySystem: (secDevice?.state as SecurityState)?.state ?? "UNKNOWN",
        bedroomFan:
          (brFan?.state as FanState)?.power === "ON"
            ? `Speed ${(brFan?.state as FanState)?.speed}`
            : "OFF",
        livingRoomAC:
          (lrAC?.state as ACState)?.power === "ON"
            ? `ON (${(lrAC?.state as ACState)?.targetTemperature}°C)`
            : "OFF",
      },
    };

    // Step 1: Structured decision questions for GOING_TO_SLEEP
    const request: SystemOneRequest = {
      model: this.defaultModel,
      state: stateContext,
      questions: {
        lock_main_door: {
          type: "noul",
          instructions: "Should the main entrance door be locked when the user is going to sleep?",
        },
        light_living_room: {
          type: "noul",
          instructions: "Should the living room light be turned off when the user is going to sleep?",
        },
        tv_living_room: {
          type: "noul",
          instructions: "Should the living room TV be turned off when the user is going to sleep?",
        },
        curtain_living_room: {
          type: "noul",
          instructions: "Should the living room window curtains be closed when the user is going to sleep?",
        },
        curtain_bedroom: {
          type: "noul",
          instructions: "Should the bedroom window curtains be closed when the user is going to sleep?",
        },
        security_system: {
          type: "noul",
          instructions: "Should the home security alarm system be armed when the user is going to sleep?",
        },
        fan_bedroom: {
          type: "choice",
          instructions: "What should the bedroom fan speed level be when the user is going to sleep?",
          criteria: {
            off: "Turn fan off",
            low: "Low quiet airflow (Speed 1)",
            medium: "Medium comfort airflow (Speed 2)",
            high: "High maximum cooling airflow (Speed 3)",
          },
        },
        ac_living_room: {
          type: "noul",
          instructions: "Should the unoccupied living room AC be turned off when the user is going to sleep?",
        },
      },
    };

    // Step 3 & 10: Call real API client (or throw clean error on failure)
    const response: SystemOneResponse = await this.client.evaluateSystemOne(request);

    // Step 4: Build Decision Trace
    const traceItems: Record<string, any> = {};
    let totalConfidence = 0;
    let countedQuestions = 0;

    for (const [qId, qDef] of Object.entries(request.questions)) {
      const ans = response.answers[qId];
      if (ans) {
        const item = buildTraceItem(qId, String(qDef.instructions || ""), ans);
        traceItems[qId] = item;
        totalConfidence += item.confidence;
        countedQuestions++;
      }
    }

    const overallConfidence = countedQuestions > 0 ? totalConfidence / countedQuestions : 0;

    const trace: JevDecisionTrace = {
      scenarioId: "GOING_TO_SLEEP",
      intent: intent.trim(),
      modelUsed: response.model,
      tokenUsage: response.usage,
      decisions: traceItems,
      overallConfidence: Number(overallConfidence.toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    // Step 5: Evaluate GoingToSleepPolicy to produce non-redundant Action[]
    const policyResult = GoingToSleepPolicy.evaluate(trace, homeState);

    const decisionTimeMs = Date.now() - startTime;

    return {
      engineId: this.id,
      source: "JEV",
      intent,
      actions: policyResult.actions,
      confidence: trace.overallConfidence,
      reasoning: policyResult.evaluationSummary,
      decisionTimeMs,
      metadata: {
        decisionTrace: trace,
        appliedDecisions: policyResult.appliedDecisions,
        skippedRedundantActions: policyResult.skippedRedundantActions,
        modelUsed: response.model,
        tokenUsage: response.usage,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
