import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { getAllEvaluationScenarios } from "../src/lib/evaluation/dataset";
import { JevDecisionEngine } from "../src/lib/jev/JevDecisionEngine";
import { LayaDecisionEngine } from "../src/lib/laya/LayaDecisionEngine";
import { LLMDecisionEngine } from "../src/lib/llm/LLMDecisionEngine";
import {
  runPreFlightValidation,
  runPreFlightDryRun,
  runControlledExperiment,
  saveControlledExperimentReport,
} from "../src/lib/evaluation/comparison/experiment";
import { ComparativeProviderEntry, ExperimentMode } from "../src/lib/evaluation/comparison/types";

/**
 * CLI Runner for Multi-Provider Controlled Empirical Experiment Platform.
 *
 * Supported Modes:
 *   FULL_COMPARISON:
 *     npm run experiment:comparison
 *     Requires at least 2 providers to be fully AVAILABLE.
 *     If Jev or Laya is UNAVAILABLE_CONFIGURATION / UNAVAILABLE_SERVICE, cleanly halts without partial/fabricated results.
 *
 *   LLM_ONLY_READINESS:
 *     npm run experiment:llm-readiness
 *     Validates the LLM pipeline across all 36 scenarios × 5 repetitions.
 *     Explicitly marked as baseline readiness only. Zero other provider observations.
 *
 *   LAYA_ONLY_READINESS:
 *     npm run experiment:laya-readiness
 *     Validates the Laya pipeline across all 36 scenarios × 5 repetitions.
 *     Explicitly marked as baseline readiness only. Zero other provider observations.
 *
 *   PREFLIGHT_ONLY:
 *     npm run experiment:preflight
 *     Validates infrastructure, configuration, and provider reachability without executions.
 *
 *   DRY_RUN (NON-LIVE MOCKS):
 *     npm run experiment:dry-run
 *     Executes the full protocol using offline mock providers (0 network calls).
 */
async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isLLMReadiness = process.argv.includes("--llm-readiness");
  const isLayaReadiness = process.argv.includes("--laya-readiness");
  const isPreflight = process.argv.includes("--preflight");

  const mode: ExperimentMode = isPreflight
    ? "PREFLIGHT_ONLY"
    : isLLMReadiness
    ? "LLM_ONLY_READINESS"
    : isLayaReadiness
    ? "LAYA_ONLY_READINESS"
    : "FULL_COMPARISON";

  console.log("================================================================================");
  console.log("HOMEMIND — MULTI-PROVIDER CONTROLLED EXPERIMENT RUNNER");
  console.log(`MODE: ${mode}`);
  console.log("================================================================================\n");

  // Load .env.local if present and not already in environment
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }

  const scenarios = getAllEvaluationScenarios();
  const jevEngine = new JevDecisionEngine();
  const layaEngine = new LayaDecisionEngine();
  const llmEngine = new LLMDecisionEngine();

  // Pre-Flight Validation
  console.log("--- PART 21: PRE-FLIGHT VALIDATION ---");
  const preflight = await runPreFlightValidation({
    jevEngine,
    layaEngine,
    llmEngine,
    scenarios,
    repetitions: 5,
    mode,
  });

  for (const check of preflight.checks) {
    const badge = check.passed ? "[PASS]" : "[FAIL]";
    console.log(`  ${badge} Check ${String(check.id).padStart(2, "0")}: ${check.name.padEnd(38)} ${check.detail}`);
  }
  console.log("");

  console.log("--- PROVIDER AVAILABILITY SUMMARY ---");
  for (const [pId, info] of Object.entries(preflight.providerAvailability)) {
    console.log(`  Provider ${pId.padEnd(5)}: [${info.status.padEnd(25)}] ${info.detail}`);
  }
  console.log("");

  // Handler: PREFLIGHT_ONLY
  if (isPreflight) {
    if (!preflight.allPassed) {
      const failedChecks = preflight.checks.filter((c) => !c.passed);
      console.error("================================================================================");
      console.error("[PRE-FLIGHT VALIDATION FAILED]");
      console.error(`Failed checks: ${failedChecks.map((c) => `#${c.id} (${c.name})`).join(", ")}`);
      console.error("================================================================================");
      process.exit(1);
    }
    console.log("[OK] Pre-flight validation passed successfully for mode:", mode);
    return;
  }

  // Handler: DRY_RUN
  if (isDryRun) {
    console.log("--- PART 22: PRE-FLIGHT DRY RUN (NON-LIVE MOCK ORCHESTRATION) ---");
    console.log("[INFO] Executing 36 scenarios × 2 providers × 5 repetitions using offline mocks...");
    const dryReport = await runPreFlightDryRun(scenarios);
    const saveResult = saveControlledExperimentReport(dryReport);

    console.log(`[OK] Dry run completed successfully.`);
    console.log(`[OK] Saved dry run artifact to: ${saveResult.filePath}\n`);

    console.log("--------------------------------------------------------------------------------");
    console.log("DRY-RUN EXECUTION SUMMARY");
    console.log("--------------------------------------------------------------------------------");
    console.log(`Experiment ID:            ${dryReport.experimentId}`);
    console.log(`Repetitions Configured:   ${dryReport.protocol.repetitions}`);
    console.log(`Dataset Scenarios:        ${dryReport.protocol.datasetScenarioCount}`);
    console.log(`Dataset SHA-256 Hash:     ${dryReport.protocol.datasetHash}`);
    console.log(`Execution Order:          ${dryReport.protocol.executionOrder}`);
    console.log("--------------------------------------------------------------------------------\n");

    for (const agg of dryReport.aggregates) {
      console.log(`PROVIDER: ${agg.providerId} (${agg.engineId})`);
      console.log(`  Supported Scenarios:     ${agg.coverage.supportedScenarios} / ${agg.coverage.totalScenarios}`);
      console.log(`  Unsupported Scenarios:   ${agg.coverage.unsupportedScenarios} / ${agg.coverage.totalScenarios}`);
      console.log(`  Repetition Attempts:     ${agg.coverage.totalRepetitionAttempts}`);
      console.log(`  Successful Runs:         ${agg.coverage.successfulRuns}`);
      console.log(`  Failed Runs:             ${agg.coverage.failedRuns}`);
      console.log(`  Unsupported Runs:        ${agg.coverage.unsupportedRuns}\n`);
    }
    return;
  }

  // Handler: LLM_ONLY_READINESS
  if (isLLMReadiness) {
    if (!preflight.allPassed) {
      const failedChecks = preflight.checks.filter((c) => !c.passed);
      console.error("================================================================================");
      console.error("[PRE-FLIGHT VALIDATION FAILED] Cannot proceed to LLM readiness evaluation.");
      console.error(`Failed checks: ${failedChecks.map((c) => `#${c.id} (${c.name})`).join(", ")}`);
      console.error("================================================================================");
      process.exit(1);
    }

    console.log("--------------------------------------------------------------------------------");
    console.log("NOTICE: RUNNING LLM-ONLY READINESS & BASELINE EVALUATION");
    console.log("--------------------------------------------------------------------------------");
    console.log("DISCLAIMER: This mode validates the conventional LLM pipeline, latency,");
    console.log("format adherence, and action generation across the 36 scenarios × 5 repetitions.");
    console.log("It does NOT constitute a comparative evaluation against TypeSafe Jev or Laya.");
    console.log("Zero Jev or Laya observations, benchmarks, or comparative metrics will be produced.");
    console.log("--------------------------------------------------------------------------------\n");

    const providers: ComparativeProviderEntry[] = [
      {
        providerId: "LLM",
        engine: llmEngine,
        isScenarioSupported: () => true,
      },
    ];

    const report = await runControlledExperiment(scenarios, providers, {
      mode: "LLM_ONLY_READINESS",
      repetitions: 5,
      onScenarioProgress: (idx, total, id) => {
        process.stdout.write(`\r[PROGRESS] Running Scenario ${idx}/${total}: ${id.padEnd(35)}`);
      },
    });
    console.log("\n");

    const saveResult = saveControlledExperimentReport(report);
    console.log(`[OK] LLM readiness baseline evaluation completed successfully.`);
    console.log(`[OK] Saved readiness report to: ${saveResult.filePath}\n`);

    printReportSummary(report);
    return;
  }

  // Handler: LAYA_ONLY_READINESS
  if (isLayaReadiness) {
    const layaStatus = preflight.providerAvailability["LAYA"]?.status;
    if (layaStatus !== "AVAILABLE") {
      console.error("================================================================================");
      console.error("[PRE-FLIGHT VALIDATION FAILED] Cannot proceed to Laya readiness evaluation.");
      console.error(`Laya Status: ${layaStatus}`);
      console.error(`Detail: ${preflight.providerAvailability["LAYA"]?.detail}`);
      console.error("\nTo run Laya locally:");
      console.error("  1. Ensure Python 3.10+ and torch are installed.");
      console.error("  2. pip install laya");
      console.error("  3. Start the daemon: laya-serve --port 8081");
      console.error("================================================================================");
      process.exit(1);
    }

    console.log("--------------------------------------------------------------------------------");
    console.log("NOTICE: RUNNING LAYA-ONLY READINESS & BASELINE EVALUATION");
    console.log("--------------------------------------------------------------------------------");
    console.log("DISCLAIMER: This mode validates the Laya System-1 non-autoregressive decision pipeline.");
    console.log("It does NOT constitute a comparative evaluation against other providers.");
    console.log("Zero other provider observations, benchmarks, or comparative metrics will be produced.");
    console.log("--------------------------------------------------------------------------------\n");

    const providers: ComparativeProviderEntry[] = [
      {
        providerId: "LAYA",
        engine: layaEngine,
        isScenarioSupported: (s) => layaEngine.supportsScenario(s),
        getUnsupportedReason: (s) => layaEngine.getUnsupportedReason(s),
      },
    ];

    const report = await runControlledExperiment(scenarios, providers, {
      mode: "LAYA_ONLY_READINESS",
      repetitions: 5,
      onScenarioProgress: (idx, total, id) => {
        process.stdout.write(`\r[PROGRESS] Running Scenario ${idx}/${total}: ${id.padEnd(35)}`);
      },
    });
    console.log("\n");

    const saveResult = saveControlledExperimentReport(report);
    console.log(`[OK] Laya readiness baseline evaluation completed successfully.`);
    console.log(`[OK] Saved readiness report to: ${saveResult.filePath}\n`);

    printReportSummary(report);
    return;
  }

  // Handler: FULL_COMPARISON
  if (!preflight.allPassed) {
    const failedChecks = preflight.checks.filter((c) => !c.passed);
    const jevStatus = preflight.providerAvailability["JEV"]?.status;
    const layaStatus = preflight.providerAvailability["LAYA"]?.status;

    console.error("================================================================================");
    console.error("[PRE-FLIGHT VALIDATION FAILED] Cannot proceed to live comparative experiment.");
    console.error(`Failed checks: ${failedChecks.map((c) => `#${c.id} (${c.name})`).join(", ")}`);

    if (jevStatus === "UNAVAILABLE_CONFIGURATION" || jevStatus === "UNAVAILABLE_SERVICE") {
      console.error("\n[DIAGNOSTIC — JEV PROVIDER UNAVAILABLE]");
      console.error(`Status: ${jevStatus}`);
      console.error(`Detail: ${preflight.providerAvailability["JEV"]?.detail}`);
      console.error("  Note: TypeSafe registration portal is currently at capacity.");
    }

    if (layaStatus !== "AVAILABLE") {
      console.error("\n[DIAGNOSTIC — LAYA PROVIDER UNAVAILABLE]");
      console.error(`Status: ${layaStatus}`);
      console.error(`Detail: ${preflight.providerAvailability["LAYA"]?.detail}`);
      console.error("  Note: Start local Laya daemon via 'laya-serve' on port 8081.");
    }

    console.error("\nPer strict scientific protocol:");
    console.error("  1. Providers are never substituted with alternative models or proxies.");
    console.error("  2. Full comparative research requires at least two fully AVAILABLE providers.");
    console.error("\nFor single-provider baseline readiness, run:");
    console.error("  npm run experiment:llm-readiness    # for Ollama LLM baseline");
    console.error("  npm run experiment:laya-readiness   # for Laya System-1 baseline");

    console.error("\nSafe execution halted (0 partial or fabricated results generated).");
    console.error("================================================================================");
    process.exit(1);
  }

  console.log("--- LIVE CONTROLLED EXPERIMENT EXECUTION (FULL COMPARISON) ---");
  console.log(`Executing 36 scenarios × configured providers × 5 repetitions...\n`);

  const providers: ComparativeProviderEntry[] = [
    {
      providerId: "JEV",
      engine: jevEngine,
      isScenarioSupported: (s) => jevEngine.supportsScenario(s),
      getUnsupportedReason: (s) =>
        `Scenario category "${s.metadata?.category || "UNKNOWN"}" is outside Jev's active intent workflow families.`,
    },
    {
      providerId: "LAYA",
      engine: layaEngine,
      isScenarioSupported: (s) => layaEngine.supportsScenario(s),
      getUnsupportedReason: (s) => layaEngine.getUnsupportedReason(s),
    },
    {
      providerId: "LLM",
      engine: llmEngine,
      isScenarioSupported: () => true,
    },
  ];

  const report = await runControlledExperiment(scenarios, providers, {
    mode: "FULL_COMPARISON",
    repetitions: 5,
    onScenarioProgress: (idx, total, id) => {
      process.stdout.write(`\r[PROGRESS] Running Scenario ${idx}/${total}: ${id.padEnd(35)}`);
    },
  });
  console.log("\n");

  const saveResult = saveControlledExperimentReport(report);
  console.log(`[OK] Full comparative experiment completed successfully.`);
  console.log(`[OK] Saved report to: ${saveResult.filePath}\n`);

  printReportSummary(report);
}

function printReportSummary(report: any) {
  console.log("================================================================================");
  console.log("HOMEMIND EXPERIMENTAL REPORT — DESCRIPTIVE AGGREGATES");
  console.log("================================================================================");
  console.log(`Experiment ID:            ${report.experimentId}`);
  console.log(`Mode:                     ${report.mode}`);
  if (report.disclaimer) {
    console.log(`Disclaimer:               ${report.disclaimer}`);
  }
  console.log(`Git Commit Hash:          ${report.protocol.gitCommitHash}`);
  console.log(`Dataset Version:          ${report.protocol.datasetVersion}`);
  console.log(`Dataset Scenario Count:   ${report.protocol.datasetScenarioCount}`);
  console.log(`Repetitions:              ${report.protocol.repetitions}`);
  console.log(`Dataset SHA-256 Hash:     ${report.protocol.datasetHash}`);
  console.log(`Execution Order:          ${report.protocol.executionOrder}`);
  console.log("--------------------------------------------------------------------------------");

  for (const agg of report.aggregates) {
    console.log(`\nPROVIDER: ${agg.providerId} (${agg.engineId})`);
    console.log("  COVERAGE & ATTEMPTS:");
    console.log(`    Total Scenarios:         ${agg.coverage.totalScenarios}`);
    console.log(`    Supported Scenarios:     ${agg.coverage.supportedScenarios}`);
    console.log(`    Unsupported Scenarios:   ${agg.coverage.unsupportedScenarios}`);
    console.log(`    Total Repetition Runs:   ${agg.coverage.totalRepetitionAttempts}`);
    console.log(`    Successful Runs:         ${agg.coverage.successfulRuns}`);
    console.log(`    Failed Runs:             ${agg.coverage.failedRuns}`);
    console.log(`    Unsupported Runs:        ${agg.coverage.unsupportedRuns}`);

    console.log("  ACTION COMPARISON METRICS (SUCCESSFUL RUNS):");
    console.log(`    Matched Required:        Mean=${agg.actionDistributions.matchedRequiredActions.mean}, Med=${agg.actionDistributions.matchedRequiredActions.median}, SD=${agg.actionDistributions.matchedRequiredActions.standardDeviation}`);
    console.log(`    Missed Required:         Mean=${agg.actionDistributions.missedRequiredActions.mean}, Med=${agg.actionDistributions.missedRequiredActions.median}, SD=${agg.actionDistributions.missedRequiredActions.standardDeviation}`);
    console.log(`    Executed Forbidden:      Mean=${agg.actionDistributions.executedForbiddenActions.mean}, Med=${agg.actionDistributions.executedForbiddenActions.median}, SD=${agg.actionDistributions.executedForbiddenActions.standardDeviation}`);
    console.log(`    Executed Optional:       Mean=${agg.actionDistributions.executedOptionalActions.mean}, Med=${agg.actionDistributions.executedOptionalActions.median}, SD=${agg.actionDistributions.executedOptionalActions.standardDeviation}`);
    console.log(`    Unnecessary Actions:     Mean=${agg.actionDistributions.unnecessaryActions.mean}, Med=${agg.actionDistributions.unnecessaryActions.median}, SD=${agg.actionDistributions.unnecessaryActions.standardDeviation}`);
    console.log(`    Redundant Actions:       Mean=${agg.actionDistributions.redundantActions.mean}, Med=${agg.actionDistributions.redundantActions.median}, SD=${agg.actionDistributions.redundantActions.standardDeviation}`);

    console.log("  STATE ACCURACY RATIO:");
    console.log(`    Mean=${agg.stateAccuracyDistribution.mean}, Median=${agg.stateAccuracyDistribution.median}, Min=${agg.stateAccuracyDistribution.min}, Max=${agg.stateAccuracyDistribution.max}, SD=${agg.stateAccuracyDistribution.standardDeviation}`);

    console.log("  LATENCY TELEMETRY (MS):");
    console.log(`    Decision Latency:        Mean=${agg.timingDistributions.decisionLatencyMs.mean} ms, Med=${agg.timingDistributions.decisionLatencyMs.median} ms, SD=${agg.timingDistributions.decisionLatencyMs.standardDeviation} ms`);
    console.log(`    Simulation Latency:      Mean=${agg.timingDistributions.simulationLatencyMs.mean} ms, Med=${agg.timingDistributions.simulationLatencyMs.median} ms, SD=${agg.timingDistributions.simulationLatencyMs.standardDeviation} ms`);
    console.log(`    Evaluation Latency:      Mean=${agg.timingDistributions.evaluationLatencyMs.mean} ms, Med=${agg.timingDistributions.evaluationLatencyMs.median} ms, SD=${agg.timingDistributions.evaluationLatencyMs.standardDeviation} ms`);
    console.log(`    Total Execution Latency: Mean=${agg.timingDistributions.totalExecutionLatencyMs.mean} ms, Med=${agg.timingDistributions.totalExecutionLatencyMs.median} ms, SD=${agg.timingDistributions.totalExecutionLatencyMs.standardDeviation} ms`);
  }

  console.log("\n================================================================================");
}

main().catch((err) => {
  console.error("\n[FATAL ERROR]", err);
  process.exit(1);
});
