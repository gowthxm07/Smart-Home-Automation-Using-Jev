import { HomeState } from "@/types/home";
import { Action, ActionSource, ConfigurationId } from "@/types/action";
import { DecisionEngine, DecisionResult } from "@/types/engine";
import { EvaluationScenario, EvaluationResult, EngineRun } from "@/lib/evaluation/types";
import { StandardEvaluationEngine } from "@/lib/evaluation/evaluator";
import { SimulationEngine, simulationEngine } from "@/lib/simulationEngine";
import { LayaDecisionEngine } from "@/lib/laya/LayaDecisionEngine";
import { LLMDecisionEngine } from "@/lib/llm/LLMDecisionEngine";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";

export interface LatencyBreakdown {
  decision: number;
  simulation: number;
  evaluation: number;
  total: number;
}

export interface ConfigurationRun {
  configurationId: ConfigurationId;
  providerId: "LAYA" | "LLM";
  displayName: string;
  initialState: HomeState;
  finalState: HomeState;
  proposedActions: Action[];
  executedActions: Action[];
  skippedRedundantActions: string[];
  evaluationResult?: EvaluationResult;
  status: "SUCCESS" | "ERROR" | "UNSUPPORTED" | "UNAVAILABLE";
  error?: string;
  latencyMs: LatencyBreakdown;
  decisionResult?: DecisionResult;
}

export interface DualConfigurationResult {
  prompt: string;
  scenarioId?: string;
  isControlled: boolean;
  timestamp: string;
  configurationA: {
    configurationId: "MULTI_ENGINE";
    layaRun: ConfigurationRun;
    llmRun: ConfigurationRun;
    primaryFloorPlanDriver: "LAYA" | "LLM";
  };
  configurationB: {
    configurationId: "LLM_ONLY";
    llmRun: ConfigurationRun;
  };
  selectedMultiEngineDriver: "LAYA" | "LLM";
}

export interface DualConfigurationOptions {
  controlledScenario?: EvaluationScenario;
  scenarioId?: string;
  selectedMultiEngineDriver?: "LAYA" | "LLM";
  enabledProviders?: Record<string, boolean>;
  layaEngine?: DecisionEngine;
  llmEngine?: DecisionEngine;
  evaluationEngine?: StandardEvaluationEngine;
  simEngine?: SimulationEngine;
}

/**
 * Executes a single provider run in complete isolation on its dedicated HomeState clone.
 */
async function executeSingleRun(
  configId: ConfigurationId,
  providerId: "LAYA" | "LLM",
  displayName: string,
  engine: DecisionEngine,
  stateClone: HomeState,
  scenario: EvaluationScenario | undefined,
  prompt: string,
  simEngine: SimulationEngine,
  evalEngine: StandardEvaluationEngine
): Promise<ConfigurationRun> {
  const runStart = performance.now();
  const initialStateCopy: HomeState = JSON.parse(JSON.stringify(stateClone));

  // Check scenario capability support if applicable
  if (
    scenario &&
    typeof (engine as any).supportsScenario === "function" &&
    !(engine as any).supportsScenario(scenario)
  ) {
    const reason =
      typeof (engine as any).getUnsupportedReason === "function"
        ? (engine as any).getUnsupportedReason(scenario)
        : `Scenario "${scenario.id}" is outside supported capabilities for ${displayName}.`;

    return {
      configurationId: configId,
      providerId,
      displayName,
      initialState: initialStateCopy,
      finalState: stateClone,
      proposedActions: [],
      executedActions: [],
      skippedRedundantActions: [],
      status: "UNSUPPORTED",
      error: reason,
      latencyMs: {
        decision: 0,
        simulation: 0,
        evaluation: 0,
        total: Math.round(performance.now() - runStart),
      },
    };
  }

  let decisionResult: DecisionResult | undefined;
  let decStart = 0;
  let decEnd = 0;
  let status: ConfigurationRun["status"] = "SUCCESS";
  let errorMsg: string | undefined;

  try {
    decStart = performance.now();
    decisionResult = await engine.evaluate(prompt, stateClone);
    decEnd = performance.now();
  } catch (err: unknown) {
    decEnd = performance.now();
    status = "ERROR";
    errorMsg = (err as Error)?.message || "Decision evaluation failed.";
  }

  if (status === "ERROR" || !decisionResult) {
    return {
      configurationId: configId,
      providerId,
      displayName,
      initialState: initialStateCopy,
      finalState: stateClone,
      proposedActions: [],
      executedActions: [],
      skippedRedundantActions: [],
      status: "ERROR",
      error: errorMsg,
      latencyMs: {
        decision: Math.round(decEnd - decStart),
        simulation: 0,
        evaluation: 0,
        total: Math.round(performance.now() - runStart),
      },
    };
  }

  // Simulation Step: Apply generated actions to this clone
  const simStart = performance.now();
  const rawActions: Action[] = decisionResult.actions || [];
  const proposedActions: Action[] = rawActions.map((a) => ({
    ...a,
    configurationId: configId,
    source: providerId as ActionSource,
  }));

  const executedActions: Action[] = [];
  let currentState = stateClone;

  for (const action of proposedActions) {
    const simRes = simEngine.applyAction(action, currentState);
    if (simRes.success) {
      currentState = simRes.newState;
      executedActions.push(action);
    }
  }
  const simEnd = performance.now();

  const skippedRedundantActions: string[] =
    (decisionResult.metadata?.skippedRedundantActions as string[]) || [];

  // Evaluation Step
  const evalStart = performance.now();
  let evaluationResult: EvaluationResult | undefined;

  if (scenario) {
    const nowIso = new Date().toISOString();
    const engineRun: EngineRun = {
      engineId: engine.id,
      runId: `run_${configId.toLowerCase()}_${providerId.toLowerCase()}_${Date.now()}`,
      scenarioId: scenario.id,
      startedAt: nowIso,
      completedAt: nowIso,
      latencyMs: Math.round(decEnd - decStart),
      decisionResult: decisionResult,
      actions: executedActions,
      finalState: currentState,
    };
    evaluationResult = evalEngine.evaluate(scenario, engineRun);
  }
  const evalEnd = performance.now();

  return {
    configurationId: configId,
    providerId,
    displayName,
    initialState: initialStateCopy,
    finalState: currentState,
    proposedActions,
    executedActions,
    skippedRedundantActions,
    evaluationResult,
    status: "SUCCESS",
    decisionResult,
    latencyMs: {
      decision: Math.round(decEnd - decStart),
      simulation: Math.round(simEnd - simStart),
      evaluation: Math.round(evalEnd - evalStart),
      total: Math.round(performance.now() - runStart),
    },
  };
}

/**
 * Orchestrates a complete dual-configuration run across three independent provider executions:
 * - Configuration A (MULTI_ENGINE): LAYA on Clone A
 * - Configuration A (MULTI_ENGINE): LLM on Clone B
 * - Configuration B (LLM_ONLY): LLM on Clone C
 *
 * Enforces strict state isolation:
 * - Same prompt
 * - Same initial HomeState (captured before provider execution)
 * - Three independent deep clones
 * - Zero state leakage between executions
 * - Zero composite scores or winner rankings
 */
export async function runDualConfiguration(
  prompt: string,
  initialHomeState: HomeState,
  options: DualConfigurationOptions = {}
): Promise<DualConfigurationResult> {
  const scenario =
    options.controlledScenario ||
    (options.scenarioId ? getEvaluationScenario(options.scenarioId) : undefined);

  const selectedDriver = options.selectedMultiEngineDriver || "LAYA";
  const layaEngine = options.layaEngine || new LayaDecisionEngine();
  const llmEngine = options.llmEngine || new LLMDecisionEngine();
  const evalEngine = options.evaluationEngine || new StandardEvaluationEngine();
  const simEngine = options.simEngine || simulationEngine;

  // 1. Create three completely independent deep clones of initialHomeState (or scenario.initialState)
  const baseInitialState = scenario ? scenario.initialState : initialHomeState;
  const cloneA: HomeState = JSON.parse(JSON.stringify(baseInitialState));
  const cloneB: HomeState = JSON.parse(JSON.stringify(baseInitialState));
  const cloneC: HomeState = JSON.parse(JSON.stringify(baseInitialState));

  // 2. Execute all three runs concurrently with strict fault isolation
  const [layaRunA, llmRunA, llmRunB] = await Promise.all([
    // Run 1: LAYA under MULTI_ENGINE on Clone A
    executeSingleRun(
      "MULTI_ENGINE",
      "LAYA",
      "Laya (System-1 Decision Model)",
      layaEngine,
      cloneA,
      scenario,
      prompt,
      simEngine,
      evalEngine
    ),
    // Run 2: LLM under MULTI_ENGINE on Clone B
    executeSingleRun(
      "MULTI_ENGINE",
      "LLM",
      "Conventional LLM (Local Ollama)",
      llmEngine,
      cloneB,
      scenario,
      prompt,
      simEngine,
      evalEngine
    ),
    // Run 3: LLM under LLM_ONLY on Clone C (Standalone baseline)
    executeSingleRun(
      "LLM_ONLY",
      "LLM",
      "Conventional LLM (Standalone Baseline)",
      llmEngine,
      cloneC,
      scenario,
      prompt,
      simEngine,
      evalEngine
    ),
  ]);

  return {
    prompt,
    scenarioId: scenario?.id,
    isControlled: Boolean(scenario),
    timestamp: new Date().toISOString(),
    configurationA: {
      configurationId: "MULTI_ENGINE",
      layaRun: layaRunA,
      llmRun: llmRunA,
      primaryFloorPlanDriver: selectedDriver,
    },
    configurationB: {
      configurationId: "LLM_ONLY",
      llmRun: llmRunB,
    },
    selectedMultiEngineDriver: selectedDriver,
  };
}
