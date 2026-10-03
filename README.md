# HomeMind — Context-Aware Multi-Device Smart Home Automation

**Final Project Release**: `v1.0-final` (Frozen Research & Demonstration Package)
**Experiment ID**: `exp_ctrl_1790945358821_ibkjxz`
**Dataset Version**: `HomeMind-Eval-Dataset-v1.0` (SHA-256: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`)
**Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`
**Test Suite**: 279 / 279 Tests Passing (100% Pass Rate)

---

## 1. Project Overview

**HomeMind** is an open-source, software-simulated, context-aware smart home automation and research platform. It evaluates multi-device automation decisions using virtual devices and controlled scenarios, comparing non-autoregressive decision classification against conventional autoregressive language modeling.

> [!IMPORTANT]
> **100% Software-Simulated Smart Home — Zero Physical Hardware Required:**
> HomeMind operates purely in software simulation. It does **NOT** require physical IoT appliances, microcontrollers (ESP32 / Arduino), relays, or physical sensors. The platform completely simulates:
> - **Home State**: 18 virtual devices across 5 rooms (Living Room, Bedroom, Kitchen, Office, Hallway).
> - **Device Capabilities**: Lighting, multi-zone thermostats, motorized shades, security locks, contact sensors.
> - **Environmental Context**: Ambient light, indoor/outdoor temperature, simulated time clock, human and pet occupancy.
> - **Automation Decisions**: Model-driven intent parsing and parameter extraction.
> - **Physical State Transitions**: Deterministic world-model updates via `SimulationEngine`.
> - **Evaluation**: Objective rule-based scoring and final-state accuracy verification via `StandardEvaluationEngine`.

---

## 2. Key Features

- **Context-Aware Automation**: Conditions actions on the complete multi-room `HomeState` rather than static keyword patterns.
- **Multi-Device Coordinated Reasoning**: Executes complex multi-zone transitions across heterogeneous device types.
- **Simulated Home Environment**: Deterministic in-memory world model transitioning device states according to physical laws.
- **Provider Abstraction**: Decoupled Strategy Pattern (`ProviderRegistry`) supporting hot-swappable AI decision engines.
- **Laya Provider**: Non-autoregressive decision model (`ModernBERT-large`, 421M params) via local `laya-serve 0.3.20`.
- **Local Ollama LLM Provider**: Meta's `llama3.2:3b` executing locally on CPU with zero temperature and structured JSON output.
- **Provider-Neutral Evaluation**: Objective grading contract (`StandardEvaluationEngine`) decoupled from model prompts or APIs.
- **Controlled Benchmark Dataset**: 36 frozen scenarios across 7 operational categories with SHA-256 cryptographic invariant.
- **Reproducible Experiment Protocol**: 360-cell factorial benchmark grid (36 scenarios $\times$ 2 providers $\times$ 5 repetitions).
- **Comparative Research Dashboard**: Real-time floor plan visualization, multi-engine execution traces, and telemetry.
- **State Isolation**: Deep-cloned state allocation ensuring zero cross-provider or cross-repetition state leakage.
- **Comprehensive Visualizations**: 12 publication-grade vector graphics (SVG) and 7 statistical data tables (Markdown, JSON, CSV).

---

## 3. Architecture

HomeMind decouples decision inference from physical state transition simulation and rule-based evaluation:

```
                          User Intent / Scenario Prompt
                                       │
                                       ▼
                             HomeMind Dashboard
                          (Next.js 14 / TypeScript)
                                       │
                                       ▼
                           Universal Provider Registry
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                  LAYA Provider                  LLM Provider
             (System-1 Local CPU)           (Local Ollama / llama3.2:3b)
                        │                             │
                        └──────────────┬──────────────┘
                                       ▼
                             Action Validation Gate
                           (Topology & Capability)
                                       │
                                       ▼
                               SimulationEngine
                       (Deterministic State Machine)
                                       │
                                       ▼
                            StandardEvaluationEngine
                           (Frozen Ground Truth)
                                       │
                                       ▼
                       Independent Comparative Metrics
```

---

## 4. Providers

1. **LAYA (System-1)**: Convai Innovations non-autoregressive decision model (`laya-serve 0.3.20`, `english` checkpoint) running locally on CPU. Incorporates an upstream domain router that identifies out-of-domain scenarios and returns `UNSUPPORTED`.
2. **Conventional LLM (Local Ollama)**: Meta's `llama3.2:3b` executed locally on CPU via Ollama (`temperature = 0.0`, structured JSON output). Accepts all scenarios without domain boundary restrictions.
3. **TypeSafe Jev (Historical / Non-Live)**: Investigated in earlier phases as a proprietary cloud API. In Milestone 3.8, Jev was completely removed from the live runtime path to ensure reproducible local execution. Historical code is preserved in `src/lib/jev/` for provenance; Jev accounted for **0 active cells** in the validated 360-cell experiment.

---

## 5. Research Experiment Overview

- **Experiment Identifier**: `exp_ctrl_1790945358821_ibkjxz`
- **Dataset Version**: `HomeMind-Eval-Dataset-v1.0 (36 Controlled Scenarios)`
- **Dataset SHA-256 Invariant**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`
- **Execution Matrix**: 36 scenarios $\times$ 2 active providers $\times$ 5 repetitions = **360 execution cells**
- **Analysis Populations**:
  - Population A (All planned cells): **360** (180 LAYA, 180 LLM)
  - Population B (Supported cells): **350** (170 LAYA, 180 LLM)
  - Population C (Supported successful executions): **341** (166 LAYA, 175 LLM)
  - Population D (Supported execution failures): **9** (4 LAYA CPU timeouts, 1 LLM timeout, 4 LLM entity hallucination errors)
  - Population E (Unsupported domain rejections): **10** (10 LAYA rejections on `security-lockdown-01` and `ambiguous-night-ready-01`, 0 LLM)

---

## 6. Empirical Results

Per strict scientific protocol, no composite scores, rankings, or winner declarations are computed; all metrics are reported independently as measured observations.

### Provider-Level Performance (Population C: $N=341$)

| Metric Parameter | LAYA (System-1, $N=166$) | LLM (Ollama `llama3.2:3b`, $N=175$) |
|:---|:---:|:---:|
| **State Accuracy Ratio** (Mean ± SD, Median) | **0.67 ± 0.30**, Median: 0.67 | **0.49 ± 0.28**, Median: 0.50 |
| **Matched Required Actions** (Mean ± SD) | **1.60 ± 1.52** | **1.17 ± 1.38** |
| **Missed Required Actions** (Mean ± SD) | **1.29 ± 1.24** | **1.74 ± 1.52** |
| **Unnecessary Actions** (Mean ± SD) | **0.31 ± 0.46** | **2.02 ± 2.62** |
| **Executed Forbidden Actions** (Mean ± SD) | **0.00 ± 0.00** | **0.08 ± 0.27** |
| **Decision Latency** (Median, Mean, SD) | **34,880.84 ms** (36,488.06 ms, SD 5,109.70 ms) | **41,869.63 ms** (50,569.15 ms, SD 35,136.24 ms) |
| **Simulation Latency Mean** | **0.31 ms** | **1.16 ms** |
| **Evaluation Latency Mean** | **0.24 ms** | **0.65 ms** |
| **Pipeline Inference Dominance** | **>99.99%** | **>99.99%** |

### Category State Accuracy Means (LAYA / LLM):
- NORMAL: **0.52 / 0.24**
- PARTIAL_STATE: **0.76 / 0.48**
- NO_OP: **1.00 / 0.84**
- MULTI_DEVICE: **0.38 / 0.29**
- CONTEXT_SENSITIVE: **0.76 / 0.57**
- SECURITY: **0.61 / 0.63**
- AMBIGUOUS: **0.67 / 0.46**

---

## 7. Documentation Directory

Complete research reports, demonstration guides, and technical audit documentation are located in `docs/`:

| Document | Purpose & Description |
|:---|:---|
| [`docs/research/HOMEMIND_FINAL_RESEARCH_REPORT.md`](docs/research/HOMEMIND_FINAL_RESEARCH_REPORT.md) | Master academic research report (17 formal sections). |
| [`docs/research/RESULTS_SUMMARY.md`](docs/research/RESULTS_SUMMARY.md) | Concise executive summary for briefings and viva preparation. |
| [`docs/research/REPRODUCIBILITY.md`](docs/research/REPRODUCIBILITY.md) | Step-by-step reproduction guide and audit instructions. |
| [`docs/research/ARTIFACT_INDEX.md`](docs/research/ARTIFACT_INDEX.md) | Complete inventory of source, dataset, benchmark, and visualization assets. |
| [`docs/research/FIGURE_TABLE_REFERENCE.md`](docs/research/FIGURE_TABLE_REFERENCE.md) | Scientific interpretation guide for Figures 1–12 and Tables 1–7. |
| [`docs/research/3.24_FINAL_END_TO_END_AUDIT.md`](docs/research/3.24_FINAL_END_TO_END_AUDIT.md) | Final system audit report (**20 PASS, 0 WARNING, 0 BLOCKER**). |
| [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) | Operational walkthrough for evaluators and faculty demonstrations. |
| [`docs/VIVA_GUIDE.md`](docs/VIVA_GUIDE.md) | Oral defense manual with 30s/1m elevator pitches and technical Q&A. |
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Official project status ledger and post-freeze policy. |

---

## 8. Running Locally

### Prerequisites
- Node.js v20.x or v22.x LTS (`node -v`)
- npm v10.x (`npm -v`)
- Local Laya daemon: `laya-serve 0.3.20` with `english` checkpoint
- Local Ollama daemon: `ollama` with `llama3.2:3b` model

### Installation
```bash
git clone <repository-url>
cd "Home simulator using Jev"
npm install
```

### Starting the Application
```powershell
# 1. Start Laya daemon (Terminal 1)
laya-serve --model english --port 8080

# 2. Start Ollama daemon (Terminal 2)
ollama serve

# 3. Launch HomeMind Next.js application (Terminal 3)
npm run dev
```

Navigate to `http://localhost:3000` to interact with the dashboard.

---

## 9. Research Reproduction & Verification

To verify the test suite, dataset hash, and production build without running live inference:

```powershell
# Run full unit and integration test suite (279 passing tests)
npm test -- --run

# Run static TypeScript typecheck
npx tsc --noEmit

# Compile optimized production build
npm run build
```

For complete instructions on re-running the automated 360-cell benchmark harness, consult [`docs/research/REPRODUCIBILITY.md`](docs/research/REPRODUCIBILITY.md).

---

## 10. Research Limitations

1. **Local CPU Execution**: Latencies reflect consumer-grade CPU compute bounds rather than hardware-accelerated edge TPUs or GPUs.
2. **Discrete Scenario Scope**: 36 controlled scenarios across 5 repetitions profile core behaviors but do not represent unconstrained natural language dialogues.
3. **Simulated State Environment**: Transitions evaluated in a software world model; physical RF attenuation, Zigbee mesh delays, and hardware packet loss were not modeled.
4. **Model Checkpoint Specifics**: Findings characterize `laya-serve 0.3.20 (english)` and Meta's `llama3.2:3b`.
5. **Uncalibrated Model Confidence**: Laya confidence probabilities were raw network activations and not independently calibrated.
