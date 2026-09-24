import { execSync } from "child_process";
import { EvaluationScenario } from "../types";
import { evaluateScenario, EvaluationRunnerError } from "../runner";
import {
  ComparativeProviderEntry,
  ComparativeScenarioResult,
  ComparativeBenchmarkReport,
  ComparativeRunnerOptions,
  ComparativeBenchmarkOptions,
  ProviderComparativeRun,
} from "./types";
import { computeStateFingerprint } from "./fingerprint";

/**
 * Dynamically resolves the current Git commit hash from the repository runtime.
 */
export function getRuntimeGitCommitHash(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Executes a single controlled EvaluationScenario through multiple DecisionEngines
 * in a provider-neutral, strictly isolated experimental setup.
 *
 * CRITICAL SCIENTIFIC INTEGRITY GUARANTEES:
 * 1. Same Initial State: Each provider receives an independent deep clone of the canonical initial HomeState.
 * 2. Deterministic State Fingerprint: A SHA-256 fingerprint is recorded to mathematically verify equivalent initial conditions.
 * 3. Same Intent: Providers receive the exact same natural language intent string.
 * 4. Zero Answer-Key Leakage: Providers never receive expected outcomes, required actions, or evaluation criteria.
 * 5. Simulation & Evaluation Consistency: The SAME SimulationEngine and SAME StandardEvaluationEngine evaluate all providers.
 * 6. Explicit Status Distinction: Distinguishes SUPPORTED_SUCCESS, SUPPORTED_FAILURE, and UNSUPPORTED.
 * 7. Zero Fallback: Never falls back from one provider to another on error.
 */
export async function runComparativeScenario(
  scenario: Readonly<EvaluationScenario>,
  providers: ComparativeProviderEntry[],
  options?: ComparativeRunnerOptions
): Promise<ComparativeScenarioResult> {
  // 1. Validate scenario
  if (!scenario || !scenario.id || !scenario.initialState || !scenario.expectedOutcome) {
    throw new Error("Invalid EvaluationScenario provided to runComparativeScenario.");
  }

  if (!providers || providers.length === 0) {
    throw new Error("At least one provider must be configured for comparative execution.");
  }

  // 2. Compute deterministic fingerprint of the scenario's canonical initial state
  const initialStateFingerprint = computeStateFingerprint(scenario.initialState);
  const executedAt = new Date().toISOString();
  const category = (scenario.metadata?.category as string) || "NORMAL";

  const providerRuns: ProviderComparativeRun[] = [];

  // 3. Sequentially execute each provider against independent cloned state
  for (const entry of providers) {
    const { providerId, engine, isScenarioSupported, getUnsupportedReason } = entry;
    const engineId = engine.id || providerId;

    // A. Check if scenario is supported by the provider
    if (isScenarioSupported && !isScenarioSupported(scenario)) {
      const reason = getUnsupportedReason
        ? getUnsupportedReason(scenario)
        : `Scenario "${scenario.id}" is not supported by provider "${providerId}".`;

      providerRuns.push({
        providerId,
        engineId,
        status: "UNSUPPORTED",
        unsupportedReason: reason,
        actions: [],
        evaluationResult: null,
      });
      continue;
    }

    // B. Strict State Isolation: Create an independent deep clone for this provider
    // This guarantees that any mutations during engine decision or simulation can NEVER leak
    const isolatedInitialState = JSON.parse(JSON.stringify(scenario.initialState));

    // Construct an isolated scenario object carrying the cloned initial state
    const isolatedScenario: EvaluationScenario = {
      ...scenario,
      initialState: isolatedInitialState,
    };

    // C. Execute provider through generic evaluateScenario runner
    try {
      const runResult = await evaluateScenario(isolatedScenario, engine, {
        evaluator: options?.evaluator,
        simulationEngine: options?.simulationEngine,
        throwOnSimulationError: false, // Record simulation failure rather than unhandled throw
      });

      if (runResult.success && runResult.evaluationResult) {
        providerRuns.push({
          providerId,
          engineId,
          status: "SUPPORTED_SUCCESS",
          run: runResult.run,
          decisionResult: runResult.run.decisionResult,
          evaluationResult: runResult.evaluationResult,
          finalState: runResult.finalState,
          timing: runResult.timing,
          actions: runResult.run.actions,
          providerMetadata: runResult.run.providerMetadata,
        });
      } else {
        providerRuns.push({
          providerId,
          engineId,
          status: "SUPPORTED_FAILURE",
          error: runResult.simulationErrors?.join("; ") || runResult.run.error || "Simulation rejection",
          errorPhase: "SIMULATION",
          run: runResult.run,
          decisionResult: runResult.run.decisionResult,
          evaluationResult: null,
          finalState: runResult.finalState,
          timing: runResult.timing,
          actions: runResult.run.actions,
          providerMetadata: runResult.run.providerMetadata,
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || String(err);
      const errorPhase = (err as EvaluationRunnerError)?.phase || "DECISION";

      providerRuns.push({
        providerId,
        engineId,
        status: "SUPPORTED_FAILURE",
        error: errorMsg,
        errorPhase,
        evaluationResult: null,
      });
    }
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    category,
    intent: scenario.intent,
    initialStateFingerprint,
    executedAt,
    providerRuns,
  };
}

/**
 * Sequentially executes an array of EvaluationScenarios across all configured providers.
 *
 * Produces a complete, reproducible ComparativeBenchmarkReport with environment metadata.
 * STRICT RESEARCH INTEGRITY:
 * - NO composite scores
 * - NO rankings
 * - NO winner declaration
 * - Canonical dataset remains 100% unmutated
 */
export async function runComparativeBenchmark(
  scenarios: ReadonlyArray<EvaluationScenario>,
  providers: ComparativeProviderEntry[],
  options?: ComparativeBenchmarkOptions
): Promise<ComparativeBenchmarkReport> {
  const experimentId =
    options?.experimentId ||
    `exp_comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const generatedAt = new Date().toISOString();
  const gitCommitHash = options?.gitCommitHash || getRuntimeGitCommitHash();
  const datasetVersion =
    options?.datasetVersion || "HomeMind-Eval-Dataset-v1.0 (36 Controlled Scenarios)";

  const providerMetadataList = providers.map((p) => ({
    providerId: p.providerId,
    engineId: p.engine.id,
    engineName: p.engine.name,
    modelId: typeof (p.engine as any).getModel === "function"
      ? (p.engine as any).getModel()
      : undefined,
  }));

  const scenarioResults: ComparativeScenarioResult[] = [];

  for (const scenario of scenarios) {
    const scenarioResult = await runComparativeScenario(scenario, providers, options);
    scenarioResults.push(scenarioResult);
  }

  return {
    metadata: {
      experimentId,
      generatedAt,
      gitCommitHash,
      datasetVersion,
      nodeVersion: process.version,
      platform: process.platform,
      totalScenarios: scenarios.length,
      providers: providerMetadataList,
    },
    scenarioResults,
  };
}
