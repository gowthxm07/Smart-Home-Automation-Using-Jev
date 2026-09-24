import { JevDecisionEngine } from "../src/lib/jev/JevDecisionEngine";
import { runJevBenchmark, saveBenchmarkResult } from "../src/lib/evaluation/benchmarks/jevBenchmark";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

/**
 * CLI Runner for Milestone 3.5 — Jev Benchmark Execution (Expanded Coverage).
 *
 * Command: npm run benchmark:jev
 *
 * Requirements:
 * - Requires a valid TYPESAFE_API_KEY configured in the environment or .env.local.
 * - If unconfigured, exits immediately with a clean, actionable error (zero fake data).
 * - Executes genuinely supported scenarios across 7 intent families (34 supported, 2 unsupported).
 * - Explicitly marks unsupported scenarios as UNSUPPORTED.
 * - Saves a sanitized JSON benchmark artifact to artifacts/benchmarks/.
 */
async function main() {
  console.log("==================================================");
  console.log("HOMEMIND — JEV BENCHMARK EXECUTION (MILESTONE 3.5)");
  console.log("==================================================\n");

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

  // 1. Verify API Key Configuration
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) {
    console.error("[CONFIGURATION ERROR] Real Jev benchmark execution requires a configured TYPESAFE_API_KEY.");
    console.error("No valid server-side API key was found in the environment or .env.local.");
    console.error("\nTo execute the benchmark against the real TypeSafe Jev API:");
    console.error("1. Set TYPESAFE_API_KEY in your environment: export TYPESAFE_API_KEY='your_key'");
    console.error("2. Or add TYPESAFE_API_KEY to .env.local in the project root.");
    console.error("\nExecution aborted safely (zero fake results fabricated).");
    process.exit(1);
  }

  // 2. Resolve Git commit hash for reproducibility
  let gitCommitHash: string | undefined;
  try {
    gitCommitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    gitCommitHash = undefined;
  }

  console.log(`[INFO] Initializing Jev Decision Engine...`);
  const engine = new JevDecisionEngine();

  console.log(`[INFO] Checking API connectivity...`);
  const health = await engine.checkHealth();
  if (!health.healthy) {
    console.error(`[CONNECTION ERROR] Failed to connect to TypeSafe API: ${health.error}`);
    console.error("Please verify that your TYPESAFE_API_KEY is active and network access is available.");
    process.exit(1);
  }
  console.log(`[OK] TypeSafe API connection verified (${health.modelCount} model(s) available).\n`);

  console.log(`[INFO] Executing controlled evaluation benchmark across 36 scenarios...`);
  const benchmarkResult = await runJevBenchmark({
    engine,
    gitCommitHash,
  });

  // 3. Save JSON artifact
  const artifactPath = saveBenchmarkResult(benchmarkResult);
  console.log(`[OK] Benchmark completed successfully.`);
  console.log(`[OK] Saved benchmark report to: ${artifactPath}\n`);

  // 4. Output Summary Report
  console.log("--------------------------------------------------");
  console.log("BENCHMARK EXECUTION SUMMARY");
  console.log("--------------------------------------------------");
  console.log(`Benchmark ID:            ${benchmarkResult.benchmarkId}`);
  console.log(`Generated At:            ${benchmarkResult.generatedAt}`);
  console.log(`Git Commit Hash:         ${benchmarkResult.gitCommitHash || "N/A"}`);
  console.log(`Dataset Version:         ${benchmarkResult.datasetVersion}`);
  console.log(`Engine ID:               ${benchmarkResult.engineId}`);
  console.log(`Model ID:                ${benchmarkResult.modelId}`);
  console.log("--------------------------------------------------");
  console.log(`Total Scenarios:         ${benchmarkResult.summary.totalScenarios}`);
  console.log(`Supported Scenarios:     ${benchmarkResult.summary.supportedScenarios}`);
  console.log(`Unsupported Scenarios:   ${benchmarkResult.summary.unsupportedScenarios}`);
  console.log(`Successful Runs:         ${benchmarkResult.summary.successfulRuns}`);
  console.log(`Failed Runs:             ${benchmarkResult.summary.failedRuns}`);
  console.log("--------------------------------------------------");
  console.log("ACTION COMPARISON (SUPPORTED RUNS)");
  console.log(`Total Required Actions:  ${benchmarkResult.summary.totalRequiredActions}`);
  console.log(`Matched Required:        ${benchmarkResult.summary.totalMatchedRequiredActions}`);
  console.log(`Missed Required:         ${benchmarkResult.summary.totalMissedRequiredActions}`);
  console.log(`Forbidden Executed:      ${benchmarkResult.summary.totalForbiddenActionsExecuted}`);
  console.log(`Unnecessary Executed:    ${benchmarkResult.summary.totalUnnecessaryActions}`);
  console.log("--------------------------------------------------");
  console.log("LATENCY TELEMETRY (SUCCESSFUL SUPPORTED RUNS)");
  console.log(`Mean Decision Latency:   ${benchmarkResult.summary.meanDecisionLatencyMs} ms`);
  console.log(`Median Decision Latency: ${benchmarkResult.summary.medianDecisionLatencyMs} ms`);
  console.log(`Mean Total Latency:      ${benchmarkResult.summary.meanTotalExecutionLatencyMs} ms`);
  console.log(`Median Total Latency:    ${benchmarkResult.summary.medianTotalExecutionLatencyMs} ms`);
  console.log("--------------------------------------------------\n");

  console.log("PER-SCENARIO STATUS:");
  for (const s of benchmarkResult.scenarioResults) {
    const statusBadge =
      s.status === "SUPPORTED_SUCCESS"
        ? "[PASS]"
        : s.status === "SUPPORTED_FAILURE"
        ? "[FAIL]"
        : "[UNSUPPORTED]";
    console.log(`  ${statusBadge} ${s.scenarioId.padEnd(35)} (${s.category})`);
  }
  console.log("\n==================================================");

  if (benchmarkResult.summary.failedRuns > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n[FATAL ERROR]", err);
  process.exit(1);
});
