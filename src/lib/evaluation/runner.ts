import {
  EvaluationScenario,
  EngineRun,
  EvaluationResult,
  EvaluationEngine,
} from "./types";
import { StandardEvaluationEngine } from "./evaluator";
import { DecisionEngine, DecisionResult, ISimulationEngine, SimulationResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { simulationEngine as defaultSimulationEngine } from "@/lib/simulationEngine";

/**
 * High-resolution timing metrics captured across execution phases.
 */
export interface EvaluationTiming {
  decisionLatencyMs: number;
  simulationLatencyMs: number;
  evaluationLatencyMs: number;
  totalExecutionLatencyMs: number;
}

/**
 * Options for configuring scenario evaluation execution.
 */
export interface EvaluationRunnerOptions {
  evaluator?: EvaluationEngine;
  simulationEngine?: ISimulationEngine;
  /**
   * When true (default), any simulation action rejection throws an EvaluationRunnerError with phase "SIMULATION".
   * When explicitly false, returns an EvaluationRunResult with success: false and evaluationResult: null,
   * guaranteeing that no normal benchmark EvaluationResult is produced from a failed simulation.
   */
  throwOnSimulationError?: boolean;
}

/**
 * Result returned upon completing a scenario evaluation run.
 */
export interface EvaluationRunResult {
  run: EngineRun;
  evaluationResult: EvaluationResult | null;
  timing: EvaluationTiming;
  finalState: HomeState;
  simulationResults: SimulationResult[];
  simulationErrors?: string[];
  success: boolean;
}

/**
 * Typed error thrown during evaluation pipeline execution.
 */
export class EvaluationRunnerError extends Error {
  constructor(
    message: string,
    public readonly phase: "DECISION" | "SIMULATION" | "EVALUATION" | "VALIDATION",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "EvaluationRunnerError";
  }
}

/**
 * Generates a unique execution run ID.
 */
function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Executes a controlled EvaluationScenario through an arbitrary DecisionEngine,
 * applies generated actions through the deterministic SimulationEngine,
 * and evaluates the resulting state and action alignment with the EvaluationEngine.
 *
 * Provider-neutral: Completely decoupled from Jev, LLM, OpenAI, Anthropic, or Gemini.
 */
export async function evaluateScenario(
  scenario: Readonly<EvaluationScenario>,
  engine: DecisionEngine,
  options?: EvaluationRunnerOptions
): Promise<EvaluationRunResult> {
  const tTotalStart = performance.now();
  const startedAt = new Date().toISOString();

  const evalEngine = options?.evaluator ?? new StandardEvaluationEngine();
  const simEngine = options?.simulationEngine ?? defaultSimulationEngine;
  const throwOnSimulationError = options?.throwOnSimulationError ?? true;

  // 1. Validate scenario input
  if (!scenario || !scenario.id || !scenario.initialState || !scenario.expectedOutcome) {
    throw new EvaluationRunnerError(
      "Invalid EvaluationScenario: scenario must include id, initialState, and expectedOutcome.",
      "VALIDATION",
      { scenario }
    );
  }

  // 2. Initial State Isolation: Deep clone initialState so scenario is NEVER mutated
  const engineInputState: HomeState = JSON.parse(JSON.stringify(scenario.initialState));
  const simulationInputState: HomeState = JSON.parse(JSON.stringify(scenario.initialState));

  // 3. Decision Phase: Invoke DecisionEngine
  let decisionResult: DecisionResult;
  const tDecStart = performance.now();

  try {
    decisionResult = await engine.evaluate(scenario.intent, engineInputState);
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || String(err);
    throw new EvaluationRunnerError(
      `DecisionEngine execution failed for scenario "${scenario.id}": ${errorMsg}`,
      "DECISION",
      err
    );
  }

  const decisionLatencyMs = Math.round((performance.now() - tDecStart) * 100) / 100;

  // 4. Validate DecisionResult
  if (!decisionResult || typeof decisionResult !== "object" || !Array.isArray(decisionResult.actions)) {
    throw new EvaluationRunnerError(
      `DecisionEngine returned an invalid DecisionResult for scenario "${scenario.id}": missing actions array.`,
      "VALIDATION",
      { decisionResult }
    );
  }

  // 5. Simulation Phase: Apply actions through SimulationEngine
  const tSimStart = performance.now();
  const { finalState, results: simulationResults } = simEngine.applyBatchActions(
    decisionResult.actions,
    simulationInputState
  );
  const simulationLatencyMs = Math.round((performance.now() - tSimStart) * 100) / 100;

  // Check for simulation failures
  const simulationErrors = simulationResults
    .filter((r) => !r.success)
    .map((r) => r.error || "Unknown simulation error");

  if (simulationErrors.length > 0) {
    if (throwOnSimulationError) {
      throw new EvaluationRunnerError(
        `Simulation error during scenario "${scenario.id}": ${simulationErrors.join("; ")}`,
        "SIMULATION",
        { simulationResults, simulationErrors }
      );
    }

    // When throwOnSimulationError is explicitly false:
    // Mark execution explicitly as failed. An execution containing an invalid or rejected action
    // must NEVER be evaluated or presented as a normal successful benchmark EvaluationResult.
    const totalExecutionLatencyMs = Math.round((performance.now() - tTotalStart) * 100) / 100;
    const completedAt = new Date().toISOString();
    const engineId = decisionResult.engineId || engine.id;

    const failedEngineRun: EngineRun = {
      runId: generateRunId(),
      engineId,
      scenarioId: scenario.id,
      startedAt,
      completedAt,
      latencyMs: decisionLatencyMs,
      decisionResult,
      actions: decisionResult.actions,
      finalState,
      error: simulationErrors.join("; "),
      providerMetadata: decisionResult.metadata,
    };

    const timing: EvaluationTiming = {
      decisionLatencyMs,
      simulationLatencyMs,
      evaluationLatencyMs: 0,
      totalExecutionLatencyMs,
    };

    return {
      run: failedEngineRun,
      evaluationResult: null,
      timing,
      finalState,
      simulationResults,
      simulationErrors,
      success: false,
    };
  }

  // 6. Build EngineRun
  const completedAt = new Date().toISOString();
  const engineId = decisionResult.engineId || engine.id;

  const engineRun: EngineRun = {
    runId: generateRunId(),
    engineId,
    scenarioId: scenario.id,
    startedAt,
    completedAt,
    latencyMs: decisionLatencyMs,
    decisionResult,
    actions: decisionResult.actions,
    finalState,
    error: null,
    providerMetadata: decisionResult.metadata,
  };

  // 7. Evaluation Phase: Invoke EvaluationEngine
  let evaluationResult: EvaluationResult;
  const tEvalStart = performance.now();

  try {
    evaluationResult = evalEngine.evaluate(scenario, engineRun);
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || String(err);
    throw new EvaluationRunnerError(
      `EvaluationEngine failed for scenario "${scenario.id}": ${errorMsg}`,
      "EVALUATION",
      err
    );
  }

  const evaluationLatencyMs = Math.round((performance.now() - tEvalStart) * 100) / 100;
  const totalExecutionLatencyMs = Math.round((performance.now() - tTotalStart) * 100) / 100;

  const timing: EvaluationTiming = {
    decisionLatencyMs,
    simulationLatencyMs,
    evaluationLatencyMs,
    totalExecutionLatencyMs,
  };

  return {
    run: engineRun,
    evaluationResult,
    timing,
    finalState,
    simulationResults,
    simulationErrors: undefined,
    success: true,
  };
}

/**
 * Sequentially executes an array of EvaluationScenarios through a DecisionEngine.
 * Guarantees zero cross-scenario state leakage.
 */
export async function evaluateScenarios(
  scenarios: ReadonlyArray<EvaluationScenario>,
  engine: DecisionEngine,
  options?: EvaluationRunnerOptions
): Promise<EvaluationRunResult[]> {
  const results: EvaluationRunResult[] = [];
  for (const scenario of scenarios) {
    const res = await evaluateScenario(scenario, engine, options);
    results.push(res);
  }
  return results;
}
