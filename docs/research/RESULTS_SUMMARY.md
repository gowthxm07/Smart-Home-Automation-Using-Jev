# HomeMind Controlled Experiment Results Summary

**Executive Briefing & Viva Reference Guide**  
**Official Repository**: `https://github.com/gowthxm07/Smart-Home-Automation-Using-Laya`<br/>
**Experiment ID**: `exp_ctrl_1790945358821_ibkjxz`  
**Dataset**: `HomeMind-Eval-Dataset-v1.0` (36 Frozen Controlled Scenarios)  
**Dataset SHA-256 Invariant**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`  
**Methodological Policy**: Strict descriptive reporting. No winner, ranking, composite scores, or causal claims.

---

## 1. Experiment Matrix & Configurations

| Parameter | Experimental Specification |
|:---|:---|
| **Scenario Breadth** | 36 frozen scenarios across 7 operational categories |
| **Category Distribution** | NORMAL (6), PARTIAL_STATE (6), NO_OP (5), MULTI_DEVICE (6), CONTEXT_SENSITIVE (5), SECURITY (4), AMBIGUOUS (4) |
| **Repetitions** | 5 independent repetitions per scenario per provider |
| **Total Experiment Cells** | **360 cells** (180 LAYA, 180 LLM) |
| **Active Providers** | 1. **LAYA (System-1)**: Convai Innovations non-autoregressive decision model (`laya-serve 0.3.20`, `english` checkpoint) on local CPU.<br>2. **LLM**: Meta `llama3.2:3b` via Ollama (`temperature = 0.0`, structured JSON) on local CPU. |
| **Evaluation Standard** | `StandardEvaluationEngine` (Provider-neutral rule evaluation against frozen ground truth) |
| **World Model** | `SimulationEngine` (Deterministic physical state transition engine) |

---

## 2. Execution Status Breakdown

The 360 planned cells partition into five mutually exclusive populations:

| Population | Description | Total Cells | LAYA | LLM |
|:---|:---|:---:|:---:|:---:|
| **Population A** | **All Experiment Cells** (Full Matrix) | **360** (100.00%) | 180 (100.00%) | 180 (100.00%) |
| **Population B** | **Supported Executions** (Accepted by Domain Router) | **350** (97.22%) | 170 (94.44%) | 180 (100.00%) |
| **Population C** | **Supported Successful Executions** (Analyzed for Performance) | **341** (94.72%) | 166 (92.22% all / 97.65% supp) | 175 (97.22% all / 97.22% supp) |
| **Population D** | **Supported Execution Failures** (Timeouts & Validation Errors) | **9** (2.50%) | 4 (2.22% all / 2.35% supp) | 5 (2.78% all / 2.78% supp) |
| **Population E** | **Unsupported Rejections** (Router-Level Out-of-Domain Boundaries) | **10** (2.78%) | 10 (5.56% all) | 0 (0.00%) |

---

## 3. Provider-Level Action Metrics (Population C: $N=341$)

| Metric Dimension | LAYA (System-1, $N=166$) | LLM (Ollama `llama3.2:3b`, $N=175$) |
|:---|:---:|:---:|
| **Matched Required Actions** | Mean: **1.60 ± 1.52**, Median: 2.00 | Mean: **1.17 ± 1.38**, Median: 1.00 |
| **Missed Required Actions** | Mean: **1.29 ± 1.24**, Median: 1.00 | Mean: **1.74 ± 1.52**, Median: 2.00 |
| **Unnecessary Actions** | Mean: **0.31 ± 0.46**, Median: 0.00 | Mean: **2.02 ± 2.62**, Median: 1.00 |
| **Executed Forbidden Actions** | Mean: **0.00 ± 0.00**, Median: 0.00 | Mean: **0.08 ± 0.27**, Median: 0.00 |
| **Executed Optional Actions** | Mean: **0.00 ± 0.00**, Median: 0.00 | Mean: **0.00 ± 0.00**, Median: 0.00 |
| **Redundant Actions** | Mean: **0.03 ± 0.17**, Median: 0.00 | Mean: **0.00 ± 0.00**, Median: 0.00 |

*Behavioral Observation*: In the successful population, Laya emitted fewer unnecessary actions on average (0.31 vs. 2.02) and maintained zero forbidden actuations. The LLM configuration executed 0.08 forbidden actions on average across successful runs (concentrated in PARTIAL_STATE with mean 0.17 and NO_OP with mean 0.36).

---

## 4. State Accuracy Ratio (Population C: $N=341$)

| Metric Parameter | LAYA (System-1) | LLM (Ollama `llama3.2:3b`) |
|:---|:---:|:---:|
| **Sample Size ($N$)** | 166 | 175 |
| **Mean State Accuracy** | **0.67** | **0.49** |
| **Median State Accuracy** | **0.67** | **0.50** |
| **Sample Standard Deviation** | **0.30** | **0.28** |
| **Interquartile Range ($P_{25} - P_{75}$)** | $0.50 - 1.00$ ($IQR = 0.50$) | $0.25 - 0.67$ ($IQR = 0.42$) |
| **Range (Min - Max)** | $0.00 - 1.00$ | $0.00 - 1.00$ |

---

## 5. Category-Level Performance Overview

| Operational Category | Total Cells | Laya Pop C Acc | LLM Pop C Acc | Laya Unnecessary Mean | LLM Unnecessary Mean | Laya Dec Latency (ms) | LLM Dec Latency (ms) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **NORMAL** | 60 | **0.52** ($N=27$) | **0.24** ($N=29$) | 0.30 | 2.24 | 41,760.56 | 54,327.32 |
| **PARTIAL_STATE** | 60 | **0.76** ($N=30$) | **0.48** ($N=30$) | 0.33 | 1.23 | 33,419.11 | 40,620.19 |
| **NO_OP** | 50 | **1.00** ($N=25$) | **0.84** ($N=25$) | 0.40 | 1.56 | 33,380.03 | 41,637.05 |
| **MULTI_DEVICE** | 60 | **0.38** ($N=30$) | **0.29** ($N=26$) | 0.33 | 1.50 | 35,004.68 | 40,062.36 |
| **CONTEXT_SENSITIVE** | 50 | **0.76** ($N=24$) | **0.57** ($N=25$) | 0.17 | 2.80 | 37,669.07 | 64,602.84 |
| **SECURITY** | 40 | **0.61** ($N=15$) | **0.63** ($N=20$) | 0.00 | 4.00 | 39,306.66 | 59,763.86 |
| **AMBIGUOUS** | 40 | **0.67** ($N=15$) | **0.46** ($N=20$) | 0.67 | 1.20 | 36,574.11 | 58,130.34 |

---

## 6. Execution Latency Profiles (Population C)

| Execution Phase | LAYA Mean (Median, SD) | LLM Mean (Median, SD) | Pipeline Share |
|:---|:---:|:---:|:---:|
| **Decision Inference** | **36,488.06 ms** (34,880.84 ms, SD 5,109.70 ms) | **50,569.15 ms** (41,869.63 ms, SD 35,136.24 ms) | **>99.99%** |
| **World-Model Simulation** | **0.31 ms** (0.08 ms, SD 0.75 ms) | **1.16 ms** (0.19 ms, SD 1.99 ms) | $<0.01\%$ |
| **Rule-Based Evaluation** | **0.24 ms** (0.06 ms, SD 0.65 ms) | **0.65 ms** (0.09 ms, SD 1.13 ms) | $<0.01\%$ |
| **Total Execution** | **36,489.60 ms** (34,881.63 ms, SD 5,094.72 ms) | **50,572.04 ms** (41,872.98 ms, SD 35,037.72 ms) | 100.00% |

*Key Latency Takeaway*: Neural decision inference is the sole computational bottleneck in local edge automation. Deterministic state simulation and rule evaluation introduce negligible overhead ($<2$ ms combined).

---

## 7. Supported Failures & Domain Boundaries

### 7.1 Supported Execution Failures (Population D: 9 Cells)
- **LAYA (4 cells, 3 scenarios)**:
  - `normal-sleep-01` (rep 2): Decision timeout (>60s).
  - `normal-movie-01` (reps 2, 3): Decision timeouts (>60s).
  - `context-movie-tv-already-on-01` (rep 5): Decision timeout (>60s).
  *Cause*: PyTorch CPU inference latency spikes under local OS scheduling pressure.
- **LLM (5 cells, 2 scenarios)**:
  - `normal-sleep-01` (rep 1): Decision timeout (>180s) during initial Ollama cold start.
  - `multi-wake-01` (reps 2, 3, 4, 5): Action validation failure (`HALLUCINATED_DEVICE`). Emitted action targeting `"thermostat_bedroom"`, which does not exist in the scenario home topology.

### 7.2 Unsupported Domain Rejections (Population E: 10 Cells)
- **LAYA (10 cells, 2 scenarios)**:
  - `security-lockdown-01` (5 reps, 5 cells)
  - `ambiguous-night-ready-01` (5 reps, 5 cells)
  *Mechanism*: Upstream domain router returned `UNSUPPORTED` immediately without inference. This represents an architectural policy boundary, not an operational failure.
- **LLM (0 cells)**: Accepted all 36 scenarios without router-level rejection.

---

## 8. Statistical Correlation Observations

1. **Unnecessary Actions vs. State Accuracy** ($N=341$):
   - Overall: Pearson $r = \mathbf{0.0272}$, Spearman $\rho = \mathbf{-0.1060}$
   - LAYA: Pearson $r = \mathbf{-0.0015}$, Spearman $\rho = \mathbf{0.0825}$
   - LLM: Pearson $r = \mathbf{0.2496}$, Spearman $\rho = \mathbf{0.1008}$
2. **Decision Latency vs. State Accuracy** ($N=341$):
   - Overall: Pearson $r = \mathbf{0.1440}$, Spearman $\rho = \mathbf{0.1111}$
   - LAYA: Pearson $r = \mathbf{-0.0701}$, Spearman $\rho = \mathbf{-0.1087}$
   - LLM: Pearson $r = \mathbf{0.3660}$, Spearman $\rho = \mathbf{0.3063}$

*Methodological Mandate*: **Correlation does not establish causation.** The weak observed correlations indicate that neither action volume nor latency linearly predicts state accuracy.

---

## 9. Key Limitations

1. **Local CPU Execution**: Latency figures reflect consumer-grade CPU compute bounds rather than accelerated edge TPUs/GPUs.
2. **Discrete Scenario Scope**: 36 controlled scenarios across 5 repetitions ($N=360$) profile core behaviors but do not represent unconstrained natural language dialogues.
3. **Simulated State Environment**: Transitions evaluated in software world model; physical RF attenuation, Zigbee mesh delays, and hardware unresponsiveness were not modeled.
4. **Specific Model Scales**: Findings characterize `laya-serve 0.3.20 (english)` and Meta's `llama3.2:3b`.
5. **Uncalibrated Model Confidence**: Laya confidence probabilities were raw network activations and not independently calibrated.
