import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { TypeSafeClient } from "@/lib/typesafe/client";
import {
  SystemOneRequest,
  SystemOneResponse,
  Question,
} from "@/lib/typesafe/types";
import { TypeSafeConfigurationError } from "@/lib/typesafe/errors";
import { JevDecisionTrace, buildTraceItem } from "./trace";
import {
  GoingToSleepPolicy,
  LeavingHomePolicy,
  MovieNightPolicy,
  WorkingPolicy,
  ComingHomePolicy,
  RelaxingPolicy,
  WakingUpPolicy,
  PolicyEvaluationResult,
} from "@/lib/policies";
import {
  LockState,
  LightState,
  CurtainState,
  SecurityState,
  FanState,
  ACState,
  SmartPlugState,
} from "@/types/device";

export type JevIntentFamily =
  | "GOING_TO_SLEEP"
  | "LEAVING_HOME"
  | "MOVIE_NIGHT"
  | "WORKING"
  | "COMING_HOME"
  | "RELAXING"
  | "WAKING_UP";

/**
 * Normalizes user intent and scenario context to identify one of the 7 supported
 * Jev intent workflow families, or returns null if unsupported.
 */
export function detectIntentFamily(
  intent: string,
  scenarioId?: string,
  tags?: readonly string[]
): JevIntentFamily | null {
  const normIntent = (intent || "").trim().toLowerCase();
  const tagList = tags || [];
  const sId = (scenarioId || "").toLowerCase();

  // 1. Tag-based detection (most specific domain indicator)
  if (tagList.includes("sleep")) return "GOING_TO_SLEEP";
  if (tagList.includes("leave")) return "LEAVING_HOME";
  if (tagList.includes("movie")) return "MOVIE_NIGHT";
  if (tagList.includes("work")) return "WORKING";
  if (tagList.includes("arrive")) return "COMING_HOME";
  if (tagList.includes("relax")) return "RELAXING";
  if (tagList.includes("wake")) return "WAKING_UP";

  // 2. Scenario ID-based detection
  if (sId.includes("sleep") || sId === "going_to_sleep") return "GOING_TO_SLEEP";
  if (sId.includes("leave") || sId === "leaving_home") return "LEAVING_HOME";
  if (sId.includes("movie") || sId === "movie_night") return "MOVIE_NIGHT";
  if (sId.includes("work") || sId === "working") return "WORKING";
  if (sId.includes("arrive") || sId === "coming_home") return "COMING_HOME";
  if (sId.includes("relax") || sId === "relaxing") return "RELAXING";
  if (sId.includes("wake") || sId === "waking_up") return "WAKING_UP";

  // 3. Intent text pattern matching
  if (!normIntent) return null;

  if (normIntent.includes("sleep") || normIntent.includes("bed")) {
    return "GOING_TO_SLEEP";
  }
  if (
    normIntent.includes("leaving") ||
    normIntent.includes("leave") ||
    normIntent.includes("heading out") ||
    normIntent.includes("depart")
  ) {
    return "LEAVING_HOME";
  }
  if (normIntent.includes("movie") || normIntent.includes("cinema")) {
    return "MOVIE_NIGHT";
  }
  if (
    normIntent.includes("work") ||
    normIntent.includes("study") ||
    normIntent.includes("focus")
  ) {
    return "WORKING";
  }
  if (
    normIntent.includes("coming home") ||
    normIntent.includes("arrive") ||
    normIntent.includes("arriving") ||
    normIntent.includes("back home") ||
    normIntent.includes("return home")
  ) {
    return "COMING_HOME";
  }
  if (
    normIntent.includes("relax") ||
    normIntent.includes("unwind") ||
    normIntent.includes("lounge")
  ) {
    return "RELAXING";
  }
  if (
    normIntent.includes("waking up") ||
    normIntent.includes("wake up") ||
    normIntent.includes("morning") ||
    normIntent.includes("waking")
  ) {
    return "WAKING_UP";
  }

  return null;
}

export interface JevDecisionEngineConfig {
  client?: TypeSafeClient;
  modelName?: string;
}

/**
 * JevDecisionEngine adapts the official TypeSafe Jev API into the HomeMind DecisionEngine interface.
 *
 * Phase 3 — Milestone 3.5: Expanded Decision Coverage across 7 Intent Families:
 * 1. GOING_TO_SLEEP
 * 2. LEAVING_HOME
 * 3. MOVIE_NIGHT
 * 4. WORKING
 * 5. COMING_HOME
 * 6. RELAXING
 * 7. WAKING_UP
 *
 * WORKFLOW:
 * 1. Identify intent family via detectIntentFamily.
 * 2. Read relevant current HomeState context.
 * 3. Formulate structured decision questions for Jev (POST /v1/systemone).
 * 4. Receive real structured answers (Noul, Choice) and build JevDecisionTrace.
 * 5. Dispatch trace and HomeState to family-specific deterministic policy.
 * 6. Policy eliminates redundant actions based on actual device state.
 * 7. Return typed DecisionResult ready for SimulationEngine execution.
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
   * Evaluates whether a given intent is supported by the Jev decision workflows.
   */
  supportsIntent(intent: string): boolean {
    return detectIntentFamily(intent) !== null;
  }

  /**
   * Evaluates whether a given scenario is supported by the Jev decision workflows.
   */
  supportsScenario(scenario: { id?: string; intent: string; tags?: readonly string[] }): boolean {
    if (!scenario) return false;
    return detectIntentFamily(scenario.intent, scenario.id, scenario.tags) !== null;
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

    // Identify intent family
    const intentFamily = detectIntentFamily(
      intent,
      homeState.currentScenario?.id
    );

    if (!intentFamily) {
      return {
        engineId: this.id,
        source: "JEV",
        intent,
        actions: [],
        confidence: 0,
        reasoning: `Scenario decision workflow for "${intent}" is not supported by JevDecisionEngine. Supported workflows: GOING_TO_SLEEP, LEAVING_HOME, MOVIE_NIGHT, WORKING, COMING_HOME, RELAXING, WAKING_UP.`,
        decisionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Build family-specific context and questions
    const { stateContext, questions } = this.buildWorkflowRequest(
      intentFamily,
      intent,
      homeState
    );

    const request: SystemOneRequest = {
      model: this.defaultModel,
      state: stateContext,
      questions,
    };

    // Call real TypeSafe API client (or throw clean error on failure)
    const response: SystemOneResponse = await this.client.evaluateSystemOne(request);

    // Build Decision Trace
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

    const overallConfidence =
      countedQuestions > 0 ? totalConfidence / countedQuestions : 0;

    const trace: JevDecisionTrace = {
      scenarioId: intentFamily,
      intent: intent.trim(),
      modelUsed: response.model,
      tokenUsage: response.usage,
      decisions: traceItems,
      overallConfidence: Number(overallConfidence.toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    // Dispatch to the corresponding policy for redundancy elimination and Action[] generation
    const policyResult = this.dispatchPolicy(intentFamily, trace, homeState);

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

  /**
   * Constructs the structured decision questions and HomeState context for a given intent family.
   */
  private buildWorkflowRequest(
    family: JevIntentFamily,
    intent: string,
    homeState: HomeState
  ): { stateContext: Record<string, unknown>; questions: Record<string, Question> } {
    const devices = homeState.devices;

    const lockDevice = devices["lock_main_door"];
    const secDevice = devices["security_system"];
    const lrLight = devices["light_living_room"];
    const brLight = devices["light_bedroom"];
    const kitLight = devices["light_kitchen"];
    const entLight = devices["light_entrance"];
    const studyLight = devices["light_study"];
    const nightLamp = devices["light_night_lamp"];
    const tvDevice = devices["tv_living_room"];
    const lrCurtain = devices["curtain_living_room"];
    const brCurtain = devices["curtain_bedroom"];
    const brFan = devices["fan_bedroom"];
    const lrAC = devices["ac_living_room"];
    const tvOutlet = devices["plug_tv_outlet"];
    const laptopPlug = devices["plug_laptop_charger"];
    const kitPlug = devices["plug_kitchen_general"];

    switch (family) {
      case "GOING_TO_SLEEP": {
        const stateContext = {
          scenario: "GOING_TO_SLEEP",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            mainDoorLock: (lockDevice?.state as LockState)?.state ?? "UNKNOWN",
            securitySystem: (secDevice?.state as SecurityState)?.state ?? "UNKNOWN",
            livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomTV: "power" in (tvDevice?.state ?? {}) ? (tvDevice?.state as any).power : "UNKNOWN",
            livingRoomCurtains: (lrCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
            bedroomCurtains: (brCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
            bedroomFan: (brFan?.state as FanState)?.power === "ON" ? `Speed ${(brFan?.state as FanState)?.speed}` : "OFF",
            livingRoomAC: (lrAC?.state as ACState)?.power === "ON" ? `ON (${(lrAC?.state as ACState)?.targetTemperature}°C)` : "OFF",
            entranceLight: (entLight?.state as LightState)?.power ?? "UNKNOWN",
            kitchenLight: (kitLight?.state as LightState)?.power ?? "UNKNOWN",
            studyLight: (studyLight?.state as LightState)?.power ?? "UNKNOWN",
            bedroomLight: (brLight?.state as LightState)?.power ?? "UNKNOWN",
          },
        };

        const questions: Record<string, Question> = {
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
          light_entrance: {
            type: "noul",
            instructions: "Should the entrance foyer light be turned off when the user is going to sleep?",
          },
          light_kitchen: {
            type: "noul",
            instructions: "Should the kitchen light be turned off when the user is going to sleep?",
          },
          light_study: {
            type: "noul",
            instructions: "Should the study light be turned off when the user is going to sleep?",
          },
          light_bedroom: {
            type: "noul",
            instructions: "Should the bedroom light be turned off when the user is going to sleep?",
          },
        };

        return { stateContext, questions };
      }

      case "LEAVING_HOME": {
        const stateContext = {
          scenario: "LEAVING_HOME",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            mainDoorLock: (lockDevice?.state as LockState)?.state ?? "UNKNOWN",
            securitySystem: (secDevice?.state as SecurityState)?.state ?? "UNKNOWN",
            entranceLight: (entLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
            kitchenLight: (kitLight?.state as LightState)?.power ?? "UNKNOWN",
            studyLight: (studyLight?.state as LightState)?.power ?? "UNKNOWN",
            bedroomLight: (brLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomTV: "power" in (tvDevice?.state ?? {}) ? (tvDevice?.state as any).power : "UNKNOWN",
            livingRoomAC: (lrAC?.state as ACState)?.power === "ON" ? "ON" : "OFF",
            kitchenGeneralPlug: (kitPlug?.state as SmartPlugState)?.power ?? "UNKNOWN",
            laptopChargerPlug: (laptopPlug?.state as SmartPlugState)?.power ?? "UNKNOWN",
          },
        };

        const questions: Record<string, Question> = {
          lock_main_door: {
            type: "noul",
            instructions: "Should the main entrance door be locked when the user is leaving home?",
          },
          security_system: {
            type: "noul",
            instructions: "Should the home security alarm system be armed in AWAY mode when the user is leaving home?",
          },
          light_entrance: {
            type: "noul",
            instructions: "Should the entrance foyer light be turned off when the user is leaving home?",
          },
          light_living_room: {
            type: "noul",
            instructions: "Should the living room light be turned off when the user is leaving home?",
          },
          light_kitchen: {
            type: "noul",
            instructions: "Should the kitchen light be turned off when the user is leaving home?",
          },
          light_study: {
            type: "noul",
            instructions: "Should the study light be turned off when the user is leaving home?",
          },
          light_bedroom: {
            type: "noul",
            instructions: "Should the bedroom light be turned off when the user is leaving home?",
          },
          tv_living_room: {
            type: "noul",
            instructions: "Should the living room TV be turned off when the user is leaving home?",
          },
          ac_living_room: {
            type: "noul",
            instructions: "Should the living room AC be turned off when the user is leaving home?",
          },
          plug_kitchen_general: {
            type: "noul",
            instructions: "Should the kitchen general smart plug be turned off when the user is leaving home?",
          },
          plug_laptop_charger: {
            type: "noul",
            instructions: "Should the study workstation laptop charger plug be turned off when the user is leaving home?",
          },
        };

        return { stateContext, questions };
      }

      case "MOVIE_NIGHT": {
        const stateContext = {
          scenario: "MOVIE_NIGHT",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            livingRoomTV: "power" in (tvDevice?.state ?? {}) ? (tvDevice?.state as any).power : "UNKNOWN",
            tvPowerOutlet: (tvOutlet?.state as SmartPlugState)?.power ?? "UNKNOWN",
            livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomCurtains: (lrCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
            kitchenLight: (kitLight?.state as LightState)?.power ?? "UNKNOWN",
          },
        };

        const questions: Record<string, Question> = {
          tv_living_room: {
            type: "noul",
            instructions: "Should the living room TV be turned on for movie night?",
          },
          plug_tv_outlet: {
            type: "noul",
            instructions: "Should the TV power outlet plug be turned on for movie night?",
          },
          light_living_room: {
            type: "noul",
            instructions: "Should the living room light be dimmed to create cinema ambient lighting for movie night?",
          },
          curtain_living_room: {
            type: "noul",
            instructions: "Should the living room window curtains be closed to block glare during movie night?",
          },
          light_kitchen: {
            type: "noul",
            instructions: "Should the kitchen light be turned off to reduce glare during movie night?",
          },
        };

        return { stateContext, questions };
      }

      case "WORKING": {
        const stateContext = {
          scenario: "WORKING",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            studyLight: (studyLight?.state as LightState)?.power ?? "UNKNOWN",
            laptopChargerPlug: (laptopPlug?.state as SmartPlugState)?.power ?? "UNKNOWN",
            livingRoomTV: "power" in (tvDevice?.state ?? {}) ? (tvDevice?.state as any).power : "UNKNOWN",
          },
        };

        const questions: Record<string, Question> = {
          light_study: {
            type: "noul",
            instructions: "Should the study light be turned on for working?",
          },
          plug_laptop_charger: {
            type: "noul",
            instructions: "Should the study workstation laptop charger plug be turned on for working?",
          },
          tv_living_room: {
            type: "noul",
            instructions: "Should the living room TV be turned off to eliminate distractions while working?",
          },
        };

        return { stateContext, questions };
      }

      case "COMING_HOME": {
        const stateContext = {
          scenario: "COMING_HOME",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            mainDoorLock: (lockDevice?.state as LockState)?.state ?? "UNKNOWN",
            securitySystem: (secDevice?.state as SecurityState)?.state ?? "UNKNOWN",
            entranceLight: (entLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomAC: (lrAC?.state as ACState)?.power === "ON" ? "ON" : "OFF",
          },
        };

        const questions: Record<string, Question> = {
          lock_main_door: {
            type: "noul",
            instructions: "Should the main entrance door be unlocked when the user is coming home?",
          },
          security_system: {
            type: "noul",
            instructions: "Should the home security alarm system be disarmed when the user arrives home?",
          },
          light_entrance: {
            type: "noul",
            instructions: "Should the entrance foyer light be turned on to welcome the user home?",
          },
          light_living_room: {
            type: "noul",
            instructions: "Should the living room light be turned on when returning home?",
          },
          ac_living_room: {
            type: "noul",
            instructions: "Should the living room AC be turned on for comfort upon returning home?",
          },
        };

        return { stateContext, questions };
      }

      case "RELAXING": {
        const stateContext = {
          scenario: "RELAXING",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            livingRoomLight: (lrLight?.state as LightState)?.power ?? "UNKNOWN",
            livingRoomCurtains: (lrCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
            studyLight: (studyLight?.state as LightState)?.power ?? "UNKNOWN",
            bedroomFan: (brFan?.state as FanState)?.power === "ON" ? `Speed ${(brFan?.state as FanState)?.speed}` : "OFF",
          },
        };

        const questions: Record<string, Question> = {
          light_living_room: {
            type: "noul",
            instructions: "Should the living room light be dimmed to create a relaxing ambient environment?",
          },
          curtain_living_room: {
            type: "noul",
            instructions: "Should the living room window curtains be closed for relaxation?",
          },
          light_study: {
            type: "noul",
            instructions: "Should the study light be turned off when relaxing?",
          },
          fan_bedroom: {
            type: "choice",
            instructions: "What should the bedroom fan speed level be for relaxation?",
            criteria: {
              off: "Fan off",
              low: "Gentle low airflow (Speed 1)",
              medium: "Medium comfort airflow (Speed 2)",
              high: "High maximum cooling airflow (Speed 3)",
            },
          },
        };

        return { stateContext, questions };
      }

      case "WAKING_UP": {
        const stateContext = {
          scenario: "WAKING_UP",
          userIntent: intent.trim(),
          simulationTime: homeState.simulationTime,
          currentDevices: {
            bedroomCurtains: (brCurtain?.state as CurtainState)?.state ?? "UNKNOWN",
            bedsideNightLamp: (nightLamp?.state as LightState)?.power ?? "UNKNOWN",
            kitchenGeneralPlug: (kitPlug?.state as SmartPlugState)?.power ?? "UNKNOWN",
            bedroomFan: (brFan?.state as FanState)?.power === "ON" ? `Speed ${(brFan?.state as FanState)?.speed}` : "OFF",
            kitchenLight: (kitLight?.state as LightState)?.power ?? "UNKNOWN",
          },
        };

        const questions: Record<string, Question> = {
          curtain_bedroom: {
            type: "noul",
            instructions: "Should the bedroom curtains be opened to allow morning daylight in when waking up?",
          },
          light_night_lamp: {
            type: "noul",
            instructions: "Should the bedside night lamp be turned off when waking up?",
          },
          plug_kitchen_general: {
            type: "noul",
            instructions: "Should the kitchen general smart plug be turned on when waking up to prepare coffee or kettle?",
          },
          fan_bedroom: {
            type: "choice",
            instructions: "What should the bedroom fan speed be when waking up in the morning?",
            criteria: {
              off: "Turn fan off",
              low: "Low airflow (Speed 1)",
              medium: "Medium airflow (Speed 2)",
              high: "High airflow (Speed 3)",
            },
          },
          light_kitchen: {
            type: "noul",
            instructions: "Should the kitchen light be turned on when waking up?",
          },
        };

        return { stateContext, questions };
      }
    }
  }

  /**
   * Dispatches the decision trace and home state to the policy matching the intent family.
   */
  private dispatchPolicy(
    family: JevIntentFamily,
    trace: JevDecisionTrace,
    homeState: HomeState
  ): PolicyEvaluationResult {
    switch (family) {
      case "GOING_TO_SLEEP":
        return GoingToSleepPolicy.evaluate(trace, homeState);
      case "LEAVING_HOME":
        return LeavingHomePolicy.evaluate(trace, homeState);
      case "MOVIE_NIGHT":
        return MovieNightPolicy.evaluate(trace, homeState);
      case "WORKING":
        return WorkingPolicy.evaluate(trace, homeState);
      case "COMING_HOME":
        return ComingHomePolicy.evaluate(trace, homeState);
      case "RELAXING":
        return RelaxingPolicy.evaluate(trace, homeState);
      case "WAKING_UP":
        return WakingUpPolicy.evaluate(trace, homeState);
    }
  }
}
