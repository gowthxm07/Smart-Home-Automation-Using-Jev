# HomeMind Controlled Experiment Reproducibility Guide

**Experiment Identifier**: `exp_ctrl_1790945358821_ibkjxz`  
**Dataset Invariant**: `HomeMind-Eval-Dataset-v1.0` (SHA-256: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`)  
**Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`  
**Evaluation Harness**: Standard Provider-Neutral Evaluator (`StandardEvaluationEngine`)  

---

## 1. Introduction & Methodological Distinction

This guide documents the procedures required to inspect, verify, and deterministically replicate the HomeMind controlled evaluation.

### Critical Methodological Distinction: Historical Record vs. Future Reproduction
- **The Historical Record (`exp_ctrl_1790945358821_ibkjxz`)**: The benchmark logs located in `artifacts/benchmarks/` represent an immutable, completed empirical run executed under specific host hardware conditions. Its outcomes, action classifications, and timings are frozen.
- **Future Re-Execution by Independent Researchers**: A future researcher executing the experimental harness against fresh provider daemons will reproduce identical scenario logic, initial state definitions, and deterministic evaluation scoring. However, **decision inference latencies and OS scheduling timeouts will naturally vary** depending on the researcher's host CPU architecture, RAM bandwidth, background OS processes, and daemon initialization states. Future execution should not be expected to produce identical millisecond-level timings.

---

## 2. Environment & System Requirements

### 2.1 Host Computing Platform
- **Operating System**: Microsoft Windows 11 (or modern Linux / macOS)
- **Node.js**: v20.x or v22.x LTS (tested on Node.js v22.19.0)
- **TypeScript**: v5.x
- **Package Manager**: `npm` v10.x
- **Host CPU**: Multi-core x86_64 or ARM64 processor (tested on 8-core CPU)
- **System Memory**: $\ge 16$ GB RAM recommended

### 2.2 Provider Daemons & AI Runtimes

#### Provider 1: Laya (System-1)
- **Runtime**: `laya-serve 0.3.20`
- **Environment**: Python 3.10+ / PyTorch with CPU support
- **Model Checkpoint**: Official `english` checkpoint
- **Endpoint**: Local HTTP server listening on `http://127.0.0.1:8080`
- **Verification Command**:
  ```bash
  curl -s http://127.0.0.1:8080/health
  ```
  Expected: HTTP 200 with status ok.

#### Provider 2: Conventional LLM (Local Ollama)
- **Runtime**: Ollama (v0.3.x or v0.4.x)
- **Model Tag**: `llama3.2:3b`
- **Endpoint**: Local HTTP server listening on `http://127.0.0.1:11434`
- **Pull Command**:
  ```bash
  ollama pull llama3.2:3b
  ```
- **Verification Command**:
  ```bash
  curl -s http://127.0.0.1:11434/api/tags
  ```
  Expected: JSON array containing `"name": "llama3.2:3b"`.

---

## 3. Dataset Integrity & Invariant Verification

Before executing or analyzing benchmarks, verify that the scenario dataset has not been modified.

1. **Automated Vitest Verification**:
   ```powershell
   npm test -- src/tests/evaluationDataset.test.ts
   ```
   *Expected Output*: 10 passing tests confirming all 36 scenarios, schemas, categories, and hash invariant.

2. **Cryptographic SHA-256 Hash**:
   The programmatic hash of the canonical scenario definitions must equal:
   ```
   66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329
   ```

---

## 4. Controlled Execution Protocol

The experiment executes a full factorial grid:

$$\text{Matrix} = 36\text{ scenarios} \times 2\text{ providers} \times 5\text{ repetitions} = 360\text{ execution cells}$$

### 4.1 Step-by-Step Reproduction Procedure

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/gowthxm07/Smart-Home-Automation-Using-Laya.git
   cd Smart-Home-Automation-Using-Laya
   git checkout v1.0-final
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Provider Daemons in Separate Terminals**:
   - *Terminal 1 (Laya)*:
     ```bash
     laya-serve --model english --port 8080
     ```
   - *Terminal 2 (Ollama)*:
     ```bash
     ollama serve
     ```

4. **Verify Daemon Responsiveness**:
   Ensure both `http://127.0.0.1:8080` and `http://127.0.0.1:11434` respond before launching the benchmark.

5. **Execute the Controlled Experiment Runner**:
   ```bash
   npx ts-node scripts/runControlledExperiment.ts
   ```
   *Runner Operation*:
   - Initializes benchmark manifest with random seed and timestamps.
   - Iterates through the 36 scenarios in canonical dataset order.
   - For each scenario, iterates through repetitions 1 to 5 for LAYA, followed by repetitions 1 to 5 for LLM.
   - For each cell, deep-clones the canonical initial `HomeState`.
   - Records high-resolution timestamps for decision, simulation, and evaluation phases.
   - Appends each completed cell record to `runs.jsonl`.
   - Generates final summary files upon completion.

---

## 5. Artifact Persistence Format

Upon completion of the benchmark runner, artifacts are stored in:
`artifacts/benchmarks/controlled-experiment-full_<experiment_id>/`

1. **`runs.jsonl`** (Streaming Line-Delimited JSON):
   Each line corresponds to exactly one execution cell:
   ```json
   {
     "cellId": "cell_normal-sleep-01_LAYA_rep1_...",
     "scenarioId": "normal-sleep-01",
     "provider": "LAYA",
     "repetition": 1,
     "status": "SUCCESS",
     "actions": [...],
     "evaluation": {
       "stateAccuracy": 0.67,
       "matchedRequired": 2,
       "missedRequired": 1,
       "unnecessary": 0,
       "forbidden": 0,
       "redundant": 0
     },
     "timings": {
       "decisionLatencyMs": 34880.84,
       "simulationLatencyMs": 0.08,
       "evaluationLatencyMs": 0.06,
       "totalLatencyMs": 34881.63
     }
   }
   ```

2. **`manifest.json`**:
   Records host metadata, environment parameters, and dataset SHA-256 hash.

3. **`summary.json`**:
   Complete consolidated JSON serialization of the benchmark run.

---

## 6. Analysis & Visualization Generation Procedure

To transform raw `runs.jsonl` data into canonical research tables and publication figures:

1. **Generate Canonical Intermediate Summaries**:
   ```bash
   npx ts-node scripts/generateAnalysisSummaries.ts
   ```
   Produces `research_analysis.json`, `provider_summary.json`, `category_summary.json`, `failure_analysis.json`, and `latency_summary.json` in `artifacts/analysis/controlled-experiment/`.

2. **Export Publication Tables**:
   ```bash
   npx ts-node artifacts/analysis/controlled-experiment/visualizations/source/export_tables.ts
   ```
   Produces `table1` through `table7` in Markdown, JSON, and CSV in `artifacts/analysis/controlled-experiment/visualizations/tables/`.

3. **Render Publication Figures (SVG)**:
   ```bash
   npx ts-node artifacts/analysis/controlled-experiment/visualizations/source/generate_visualizations.ts
   ```
   Renders standalone vector figures `fig01` through `fig12` in `artifacts/analysis/controlled-experiment/visualizations/figures/`.

---

## 7. Known Unsupported & Failure Characteristics

An independent reproduction will observe the following expected behavioral characteristics:

### 7.1 Expected Unsupported Rejections (Population E: 10 Cells)
- **Scenarios**: `security-lockdown-01` and `ambiguous-night-ready-01`.
- **Expected Provider Behavior**: Laya System-1 will reject these scenarios deterministically across all 5 repetitions (10 cells total) with status `UNSUPPORTED`.
- **Reason**: Upstream domain router classifies these complex multi-zone security and ambiguous conversational intents as outside Laya's operational domain.

### 7.2 Expected Failure Behaviors (Population D)
- **Laya CPU Timeouts**: Under sustained CPU load, PyTorch forward-pass inference may occasionally exceed the 60,000 ms client timeout. In the validated experiment, 4 timeouts occurred across `normal-sleep-01` (rep 2), `normal-movie-01` (reps 2, 3), and `context-movie-tv-already-on-01` (rep 5).
- **LLM Cold-Start Timeout**: The first execution cell on LLM may experience extended model loading latency (>180s) if the Ollama daemon has unloaded weights from memory.
- **LLM Action Validation Failure**: On `multi-wake-01` (reps 2–5), the LLM generated commands targeting `"thermostat_bedroom"`. Because the scenario state only defines `"thermostat_living_room"`, the HomeMind validation engine rejects the cell deterministically prior to simulation.

---

## 8. Automated Verification & Sanity Checks

To audit an existing or reproduced dataset without re-running inference:

```powershell
# 1. Verify Dataset Invariant
npm test -- src/tests/evaluationDataset.test.ts

# 2. Verify Multi-Provider Test Suite
npm test -- src/tests/multiProviderPlatform.test.ts

# 3. Check for Fictional Scenario Names (Expected: 0 matches)
Get-ChildItem -Path "artifacts/analysis/controlled-experiment/*" -Recurse | Select-String -Pattern "security-door-sensor-01|security-smoke-alarm-01|normal-reading-01|multi-party-mode-01"
```
