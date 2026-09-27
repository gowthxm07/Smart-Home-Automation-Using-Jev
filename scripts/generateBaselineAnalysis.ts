import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateFullBaselineAnalysis } from "../src/lib/evaluation/analysis";

async function main() {
  console.log("==================================================");
  console.log("MILESTONE 3.12: FROZEN BASELINE ANALYSIS GENERATOR");
  console.log("==================================================");

  let gitCommitHash = "8f493f6fd4d21b8c82b79061076019927d516c03";
  try {
    gitCommitHash = execSync("git rev-parse HEAD").toString().trim();
  } catch {
    // fallback
  }

  const layaDir = path.resolve("artifacts/benchmarks/exp_laya_readiness_1790440628419");
  const llmDir = path.resolve("artifacts/benchmarks/exp_ctrl_1790489343228_255997");
  const outputDir = path.resolve("artifacts/analysis");

  if (!fs.existsSync(layaDir)) {
    throw new Error(`Laya benchmark directory not found: ${layaDir}`);
  }
  if (!fs.existsSync(llmDir)) {
    throw new Error(`LLM benchmark directory not found: ${llmDir}`);
  }

  console.log(`Loading Laya dataset: ${layaDir}`);
  console.log(`Loading LLM dataset:  ${llmDir}`);

  const analysis = generateFullBaselineAnalysis(
    [
      { providerId: "LAYA", experimentDir: layaDir },
      { providerId: "LLM", experimentDir: llmDir },
    ],
    gitCommitHash
  );

  fs.mkdirSync(outputDir, { recursive: true });

  // 1. baseline-analysis-manifest.json
  const manifestPath = path.join(outputDir, "baseline-analysis-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(analysis.manifest, null, 2), "utf-8");
  console.log(`[SAVED] ${manifestPath}`);

  // 2. provider-summary.json
  const providerSummaryPath = path.join(outputDir, "provider-summary.json");
  fs.writeFileSync(
    providerSummaryPath,
    JSON.stringify(analysis.providerSummaries, null, 2),
    "utf-8"
  );
  console.log(`[SAVED] ${providerSummaryPath}`);

  // 3. scenario-analysis.json
  const scenarioAnalysisPath = path.join(outputDir, "scenario-analysis.json");
  fs.writeFileSync(
    scenarioAnalysisPath,
    JSON.stringify(analysis.scenarioAnalysis, null, 2),
    "utf-8"
  );
  console.log(`[SAVED] ${scenarioAnalysisPath}`);

  // 4. category-analysis.json
  const categoryAnalysisPath = path.join(outputDir, "category-analysis.json");
  fs.writeFileSync(
    categoryAnalysisPath,
    JSON.stringify(analysis.categoryAnalysis, null, 2),
    "utf-8"
  );
  console.log(`[SAVED] ${categoryAnalysisPath}`);

  // 5. latency-analysis.json
  const latencyAnalysisPath = path.join(outputDir, "latency-analysis.json");
  fs.writeFileSync(
    latencyAnalysisPath,
    JSON.stringify(analysis.latencyAnalysis, null, 2),
    "utf-8"
  );
  console.log(`[SAVED] ${latencyAnalysisPath}`);

  // 6. reliability-analysis.json
  const reliabilityAnalysisPath = path.join(outputDir, "reliability-analysis.json");
  fs.writeFileSync(
    reliabilityAnalysisPath,
    JSON.stringify(analysis.reliabilityAnalysis, null, 2),
    "utf-8"
  );
  console.log(`[SAVED] ${reliabilityAnalysisPath}`);

  console.log("\n==================================================");
  console.log("BASELINE ANALYSIS ARTIFACTS GENERATION COMPLETE");
  console.log("==================================================");
  console.log(`Analysis ID:       ${analysis.manifest.analysisId}`);
  console.log(`Dataset Hash:      ${analysis.manifest.datasetHash}`);
  console.log(`Providers Loaded:  ${Object.keys(analysis.providerSummaries).join(", ")}`);
  console.log(`Scenarios Loaded:  ${analysis.scenarioAnalysis.length}`);
  console.log(`Categories Loaded: ${analysis.categoryAnalysis.length}`);
}

main().catch((err) => {
  console.error("Analysis generation failed:", err);
  process.exit(1);
});
