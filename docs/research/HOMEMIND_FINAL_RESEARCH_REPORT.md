# HomeMind — Context-Aware Multi-Device Smart Home Automation

**Academic Research Report & Experimental Evaluation**  
**Official Repository**: `https://github.com/gowthxm07/Smart-Home-Automation-Using-Laya`<br/>
**Document Version**: 1.0 (Final Research Release)  
**Experiment Identifier**: `exp_ctrl_1790945358821_ibkjxz`  
**Evaluation Mode**: `FULL_COMPARISON`  
**Dataset Invariant**: `HomeMind-Eval-Dataset-v1.0` (SHA-256: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`)  
**Evaluation Engine**: Standard Provider-Neutral Evaluator (`StandardEvaluationEngine`)  
**Simulation Engine**: Deterministic World-Model State Transition Engine (`SimulationEngine`)  

---

## Abstract

Smart home automation systems increasingly rely on artificial intelligence to translate natural language user intents into coordinated device actions across heterogeneous home topologies. However, state awareness—the ability to assess the current physical state of the home and avoid redundant, unnecessary, or conflicting actuations—remains a fundamental challenge. This report documents the system architecture, experimental methodology, and empirical findings of **HomeMind**, a context-aware smart home execution and evaluation platform. 

We conducted a controlled, reproducible comparative evaluation of two distinct local AI decision architectures: (1) **Laya (System-1)**, a non-autoregressive decision model executed on CPU via `laya-serve 0.3.20`, and (2) a **Conventional Large Language Model (LLM)**, Meta's `llama3.2:3b` executed locally on CPU via Ollama with zero temperature and structured JSON output. The evaluation executed a frozen dataset of **36 multi-device scenarios** across **7 operational categories** with **5 independent repetitions** per provider, yielding a complete matrix of **360 execution cells**. Each cell executed against an isolated deep clone of the canonical initial `HomeState`, with action validation, deterministic world-model simulation, and rule-based evaluation governed by a provider-neutral engine.

Across the 360 cells, **341 (94.72%)** resulted in successful supported executions, **9 (2.50%)** in supported execution failures, and **10 (2.78%)** in intentional out-of-domain router rejections. In the successful execution population ($N=341$), Laya ($N=166$) observed a mean state accuracy ratio of **0.67** (median: 0.67, sample SD: 0.30) with an observed mean of **0.31** unnecessary actions and **0.00** forbidden actions. The LLM configuration ($N=175$) observed a mean state accuracy ratio of **0.49** (median: 0.50, sample SD: 0.28) with an observed mean of **2.02** unnecessary actions and **0.08** forbidden actions. Median decision latency on local CPU was **34,880.84 ms** (mean: 36,488.06 ms) for Laya and **41,869.63 ms** (mean: 50,569.15 ms) for LLM. Decision inference accounted for >99.99% of total execution latency in both configurations. 

Per strict scientific protocol, no composite scores, rankings, or winner declarations are computed; all metrics are preserved independently. Observed correlations do not establish causality. Key limitations include local CPU compute constraints, a frozen 36-scenario scope, software-defined state simulation without physical hardware, and uncalibrated model confidence outputs.

---

## 1. Introduction

Modern smart environments encompass diverse physical devices—smart lights, multi-zone thermostats, motorized shades, security locks, and multimedia appliances—distributed across multiple rooms. Automating these environments requires translating high-level, often underspecified natural language user intents into discrete, coordinated physical device commands.

Conventional commercial smart-home hubs frequently employ naive intent-matching heuristics that execute static command sequences regardless of the home's prevailing physical context. This absence of state awareness leads to notable operational inefficiencies:
- **Redundant Actuations**: Commanding devices into states they already occupy (e.g., commanding an already-illuminated light to turn on).
- **Unnecessary Actions**: Mutating unrelated devices that were not requested and are not required to fulfill the user's intent.
- **Safety Boundary Violations**: Altering security-critical or perimeter devices in contravention of user constraints.
- **Context Blindness**: Failing to adapt actions based on environmental factors such as ambient illumination, occupancy, or time of day.

Evaluating AI decision-making in smart homes requires rigorous, reproducible, and provider-neutral experimental methodologies. Prior evaluations frequently suffered from non-deterministic testbeds, live physical hardware flakiness, conflation of model inference with execution latency, and subjective human grading. 

HomeMind was designed to address these methodological gaps by providing:
1. A deterministic, software-defined world model (`SimulationEngine`) that transitions device states according to explicit physical laws.
2. A provider-neutral evaluation engine (`StandardEvaluationEngine`) that measures action-level alignment and target-state convergence against mathematically frozen ground truth.
3. A controlled benchmark execution harness that isolates inference, state simulation, and evaluation into microsecond-accurate instrumentation phases.

This report presents the complete empirical record of the validated 360-cell controlled experiment comparing local non-autoregressive decision classification (Laya System-1) against local autoregressive language modeling (LLM via Ollama).

---

## 2. Problem Statement

The core technical challenge addressed by HomeMind is formalizable as a **State-Conditioned Intent Translation Problem**:

Given:
1. An initial home state $S_0 \in \mathcal{S}$, representing the complete topology of rooms, devices, capabilities, and attribute values at time $t_0$.
2. A natural language user intent $I \in \mathcal{I}$, which may be explicit, partial, ambient, context-dependent, or ambiguous.
3. An operational context $C \in \mathcal{C}$, capturing temporal, environmental, and occupancy variables.

The decision architecture must generate an action sequence $A = \langle a_1, a_2, \dots, a_k \rangle$ such that when $A$ is applied to $S_0$ through the deterministic transition function $T: \mathcal{S} \times \mathcal{A}^* \to \mathcal{S}$, the resulting state $S_{\text{final}} = T(S_0, A)$ satisfies the intended target state $S^*$, subject to the following constraints:
- **Completeness**: All required physical transitions are achieved ($S_{\text{final}}$ satisfies $S^*$).
- **State Awareness & Parsimony**: If a device $d$ already satisfies its intended target property in $S_0$, no action targeting $d$ should be generated. Unnecessary actions that mutate unrequested attributes must be minimized ($A \cap A_{\text{unnecessary}} = \emptyset$).
- **Safety Invariance**: Forbidden actions that compromise physical perimeter security or life safety must never be executed ($A \cap A_{\text{forbidden}} = \emptyset$).
- **Domain Validity**: Actions must only target existing entities within the known device topology $\mathcal{D}(S_0)$.

Evaluating this translation requires measuring not only syntactic command matching, but also the final physical state agreement ratio, execution pipeline latency, and failure distributions across diverse operational categories.

---

## 3. Objectives

The HomeMind research platform was engineered to achieve nine explicit research objectives:

1. **Context-Aware Automation**: Implement and test decision models capable of conditioning actions on multi-room, multi-attribute home states rather than static keyword patterns.
2. **Multi-Device State Handling**: Evaluate coordinated actuations across heterogeneous device classes (lighting, climate, media, perimeter locks, sensors).
3. **Provider-Neutral Evaluation**: Decouple the evaluation contract from model-specific prompt templates, token probabilities, or proprietary APIs, enforcing a single ground-truth standard.
4. **Reproducible Benchmarking**: Construct a frozen scenario dataset with cryptographic verification (SHA-256 invariant) and deterministic random seeds.
5. **Phase-Isolated Latency Measurement**: Separately quantify decision inference latency, world-model state transition simulation latency, and ground-truth rule evaluation latency with sub-millisecond precision.
6. **Granular Action-Level Evaluation**: Quantify action execution along discrete dimensions: matched required, missed required, unnecessary, forbidden, optional, and redundant actions.
7. **Final-State Accuracy Quantification**: Measure the proportion of physical home attributes that successfully reach their intended target state after action application in the world model.
8. **Unsupported-Domain Boundary Isolation**: Establish explicit architectural boundaries between out-of-domain rejections (intentional policy) and runtime execution failures (crashes, timeouts, validation errors).
9. **Failure Mechanism Forensics**: Systematically categorize and isolate failure modes (e.g., inference timeout, schema non-compliance, entity hallucination).

---

## 4. System Architecture

The HomeMind platform follows a decoupled, pipeline-based architecture where decision generation, physical state transition simulation, and metric evaluation are strictly separated:

```
                          +-------------------------+
                          |   User Intent / Batch   |
                          |   Controlled Scenario   |
                          +-------------------------+
                                       |
                                       v
                          +-------------------------+
                          |   HomeMind Dashboard /  |
                          |    Experiment Runner    |
                          +-------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      +-------------------------+             +-------------------------+
      |      LAYA Provider      |             |       LLM Provider      |
      |   (System-1 Local CPU)  |             |  (Ollama / llama3.2:3b) |
      +-------------------------+             +-------------------------+
                   |                                       |
                   |  Proposed Action Sequence             |  Proposed Action Sequence
                   |  A_laya = [a_1, ...]                  |  A_llm = [a_1, ...]
                   +-------------------+-------------------+
                                       |
                                       v
                          +-------------------------+
                          | Action Validation Gate  |
                          |  (Topology & Schema)    |
                          +-------------------------+
                                       | Valid Actions
                                       v
                          +-------------------------+
                          |    SimulationEngine     |
                          | (World-Model Transition)|
                          +-------------------------+
                                       | Resulting State S_final
                                       v
                          +-------------------------+
                          | StandardEvaluationEngine|
                          |  (Frozen Ground Truth)  |
                          +-------------------------+
                                       |
                                       v
                          +-------------------------+
                          |   Comparative Metrics   |
                          | (Populations, Actions,  |
                          |   Accuracy, Latency)    |
                          +-------------------------+
```

### Architectural Principles
- **Independent Provider Operation**: The two providers operate strictly independently. They are never executed as a hybrid or merged ensemble; neither provider acts as a fallback for the other; and no actions from one provider are ever shared with or transferred to the other.
- **Deep-Cloned State Isolation**: Prior to each execution cell, the canonical initial `HomeState` is deep-cloned. State mutations caused by one cell cannot leak into subsequent repetitions or across providers.
- **Strict Pipeline Phase Separation**:
  1. *Decision Phase*: The provider receives scenario intent and state, emitting an action set.
  2. *Validation Phase*: Proposed actions are validated against device schema and entity existence in the home topology.
  3. *Simulation Phase*: Validated actions mutate the cloned world model deterministically.
  4. *Evaluation Phase*: The resulting state and emitted actions are evaluated against frozen expected outcomes.

---

## 5. Provider Configurations

The experiment evaluated two active, locally hosted decision providers. Both operated on the same host machine without cloud dependencies:

### 5.1 Laya (System-1)
- **Architecture**: Convai Innovations' non-autoregressive decision model designed for rapid intent classification and parameter extraction.
- **Serving Daemon**: `laya-serve 0.3.20` listening on local HTTP endpoint `http://127.0.0.1:8080`.
- **Model Checkpoint**: Official `english` checkpoint executed via local PyTorch on CPU.
- **Inference Mechanism**: Single forward pass evaluating user text and serialized state representations.
- **Confidence Scoring**: Model-reported confidence/probability outputs. *Note: These probabilities are raw model outputs and are not independently calibrated by HomeMind.*
- **Domain Router**: Laya incorporates an upstream domain-routing policy that immediately identifies out-of-domain intents (e.g., complex multi-stage security protocols or open-ended ambiguous requests) and rejects them with status `UNSUPPORTED` without dispatching an inference pass.
- **Client Timeout**: 60,000 ms.

### 5.2 Conventional LLM (Local Ollama)
- **Architecture**: Meta's autoregressive large language model `llama3.2:3b`.
- **Serving Daemon**: Ollama runtime listening on local HTTP endpoint `http://127.0.0.1:11434`.
- **Generation Parameters**: `temperature = 0.0`, `num_predict = 512`, fixed system prompt defining smart home device capabilities and state schema.
- **Inference Mechanism**: Autoregressive token generation constrained to emit a structured JSON object containing an array of device action commands: `{"actions": [{"deviceId": "...", "property": "...", "value": ...}]}`.
- **Domain Router**: No router-level domain filtering. The LLM configuration accepts all input scenarios and attempts action generation for every prompt.
- **Client Timeout**: 180,000 ms (to accommodate cold-start context loading).

*Methodological Note*: The two providers utilize fundamentally different internal algorithms (non-autoregressive classification vs. autoregressive token generation). They are evaluated on black-box input-output behavioral equivalence under the identical evaluation harness.

---

## 6. Controlled Scenario Dataset

The benchmark utilizes **`HomeMind-Eval-Dataset-v1.0`**, comprising **36 frozen controlled scenarios**.

### 6.1 Cryptographic Integrity & Invariant
To ensure absolute reproducibility across all experimental runs and analyses, the dataset was frozen and validated prior to experimental execution:
- **Canonical File**: `src/lib/evaluation/dataset/scenarios.ts`
- **SHA-256 Invariant**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`
- **Automated Verification**: Verified via Vitest suite (`src/tests/evaluationDataset.test.ts`, 10/10 passing tests).

### 6.2 Scenario Categories
The 36 scenarios span seven operational categories designed to evaluate distinct facets of smart-home decision making:

| Category | Count | Scenario Identifiers | Core Behavioral Evaluation |
|:---|:---:|:---|:---|
| **NORMAL** | 6 | `normal-sleep-01`, `normal-leave-01`, `normal-movie-01`, `normal-work-01`, `normal-arrive-01`, `normal-wake-01` | Standard multi-room routine execution with unambiguous direct intents. |
| **PARTIAL_STATE** | 6 | `partial-sleep-01`, `partial-leave-01`, `partial-movie-01`, `partial-work-01`, `partial-arrive-01`, `partial-wake-01` | Scenarios where a subset of the target conditions is already satisfied in $S_0$. Tests state awareness and suppression of redundant actions. |
| **NO_OP** | 5 | `noop-sleep-01`, `noop-leave-01`, `noop-movie-01`, `noop-work-01`, `noop-wake-01` | Scenarios where all target conditions are already satisfied in $S_0$. The optimal action set is strictly empty ($\emptyset$). |
| **MULTI_DEVICE** | 6 | `multi-sleep-01`, `multi-leave-01`, `multi-movie-01`, `multi-arrive-01`, `multi-relax-01`, `multi-wake-01` | Complex coordinated actuation across $\ge 4$ independent devices across multiple zones. |
| **CONTEXT_SENSITIVE** | 5 | `context-sleep-fan-speed-01`, `context-movie-tv-already-on-01`, `context-climate-temp-high-01`, `context-leave-study-active-01`, `context-arrive-nighttime-01` | Scenarios where the correct action is contingent on environmental sensor context (temperature, ambient light, room occupancy). |
| **SECURITY** | 4 | `security-sleep-perimeter-01`, `security-leave-perimeter-01`, `security-lockdown-01`, `security-hazard-prevention-01` | Safety-critical scenarios enforcing strict perimeter constraints and forbidden action guards. |
| **AMBIGUOUS** | 4 | `ambiguous-bed-01`, `ambiguous-heading-out-01`, `ambiguous-movie-time-01`, `ambiguous-night-ready-01` | Underspecified, conversational user intents requiring reasonable default assumptions without over-actuation. |

---

## 7. Experimental Protocol

The controlled empirical experiment (`exp_ctrl_1790945358821_ibkjxz`) was executed following a strict, automated factorial protocol:

$$\text{Matrix} = 36\text{ scenarios} \times 2\text{ active providers} \times 5\text{ repetitions} = 360\text{ execution cells}$$

### 7.1 Execution Sequence per Cell
For every cell $(s, p, r) \in \text{Scenarios} \times \text{Providers} \times \{1, \dots, 5\}$:
1. **Scenario Loading**: Load scenario definition $s$ from the frozen dataset.
2. **State Isolation**: Create an isolated deep clone of the initial canonical `HomeState` ($S_0$).
3. **Intent Dispatch**: Transmit natural language prompt $I_s$ and state $S_0$ to assigned provider $p$.
4. **Decision Measurement**: High-resolution performance timer records decision latency $t_{\text{dec}}$.
5. **Action Validation**: Proposed actions are checked against home topology $\mathcal{D}(S_0)$. Unknown device references trigger validation failure status.
6. **World-Model Simulation**: Validated actions are executed within `SimulationEngine`. High-resolution timer records simulation latency $t_{\text{sim}}$, yielding post-execution state $S_{\text{final}}$.
7. **Rule-Based Evaluation**: `StandardEvaluationEngine` evaluates $S_{\text{final}}$ and emitted actions against frozen expected outcomes. High-resolution timer records evaluation latency $t_{\text{eval}}$.
8. **Record Persistence**: Results, timings, action classifications, and diffs are appended to immutable streaming log `runs.jsonl`.

### 7.2 Strict Controls & Isolation Invariants
- **No Provider-Specific Evaluator**: Both providers are graded by the exact same TypeScript evaluation rules in `StandardEvaluationEngine`.
- **No Provider-Specific Scoring**: Thresholds, scoring formulas, and validation schemas are identical.
- **No Fallback Provider**: If a provider fails or rejects a scenario, the cell fails or is recorded as unsupported; no secondary provider is invoked.
- **No Action Merging**: Outputs from Laya and LLM are never merged or blended.
- **Zero Cross-Cell State Contamination**: Every repetition begins from a pristine, freshly allocated deep clone of $S_0$.

---

## 8. Analysis Populations

To preserve statistical rigor and prevent distorted averages, the 360 executed cells are partitioned into five mutually exclusive and exhaustive analysis populations:

| Population Code | Population Name | Definition | Total Cells | LAYA Cells | LLM Cells |
|:---|:---|:---|:---:|:---:|:---:|
| **Population A** | **All Experiment Cells** | Complete factorial matrix of planned and executed cells. | **360** | 180 | 180 |
| **Population B** | **Supported Executions** | Cells where the scenario was accepted as within operational domain. | **350** | 170 | 180 |
| **Population C** | **Supported Successful Executions** | Cells that completed decision, simulation, and evaluation successfully. | **341** | 166 | 175 |
| **Population D** | **Supported Execution Failures** | Cells accepted by provider router that failed during execution. | **9** | 4 | 5 |
| **Population E** | **Unsupported Rejections** | Cells intentionally rejected by router as out-of-domain. | **10** | 10 | 0 |

### Distinct Separation of Unsupported (Pop E) vs. Failure (Pop D)
- **Unsupported Rejections (Pop E)** represent intentional domain-boundary enforcement by Laya's upstream router. No HTTP request is dispatched, zero state mutations occur, and the system cleanly returns `UNSUPPORTED`. This reflects architectural policy, not an operational failure.
- **Supported Failures (Pop D)** represent operational defects during execution on scenarios the provider claimed to support (e.g., PyTorch forward-pass timeouts, Ollama cold-start timeouts, or entity hallucination validation errors).
- **Statistical Rule**: Populations D and E are never merged into Population C when computing action distributions, state accuracy ratios, or latency percentiles.

---

## 9. Evaluation Metrics

All metrics are evaluated objectively by `StandardEvaluationEngine` against the scenario's frozen ground truth (`expectedOutcome`):

### 9.1 Action-Level Metrics
- **Matched Required Actions ($M_{\text{req}}$)**: Number of generated actions that match an expected required action in device ID, property name, and target value.
- **Missed Required Actions ($U_{\text{req}}$)**: Number of expected required actions that were not generated by the model.
- **Forbidden Actions ($F$)**: Actions generated by the model that match an explicitly forbidden actuation (e.g., unlocking an exterior door during a security alert).
- **Optional Actions ($O$)**: Actions that match permissible but non-mandatory actuations.
- **Unnecessary Actions ($A_{\text{unnec}}$)**: Valid physical actions generated by the model that were neither required nor optional, mutating device attributes without user justification.
- **Redundant Actions ($R$)**: Actions commanding a device into a state it already occupied in $S_0$.

### 9.2 State Accuracy Ratio
The **State Accuracy Ratio** ($\text{Acc}_{\text{state}} \in [0.0, 1.0]$) quantifies physical world-model convergence:

$$\text{Acc}_{\text{state}} = \frac{|\{d \in \mathcal{D}_{\text{eval}} \mid \text{state}(d, S_{\text{final}}) = \text{state}(d, S^*)\}|}{|\mathcal{D}_{\text{eval}}|}$$

where $\mathcal{D}_{\text{eval}}$ is the set of devices evaluated under the scenario contract, $S_{\text{final}}$ is the post-simulation state, and $S^*$ is the expected target state.

*Evaluation Scope Constraint*: State accuracy is computed **only** where objective controlled ground truth exists. Unconstrained free-form conversational prompts without pre-specified ground truth cannot be assigned a valid state accuracy ratio.

### 9.3 High-Resolution Latency Metrics
- **Decision Latency ($t_{\text{dec}}$)**: Elapsed time from intent dispatch until receipt of the parsed action list.
- **Simulation Latency ($t_{\text{sim}}$)**: Elapsed time to apply validated actions to the deterministic `HomeState` world model.
- **Evaluation Latency ($t_{\text{eval}}$)**: Elapsed time to execute declarative evaluation rules against $S_{\text{final}}$.
- **Total Pipeline Latency ($t_{\text{total}}$)**: Sum of all pipeline phases ($t_{\text{dec}} + t_{\text{sim}} + t_{\text{eval}} + t_{\text{overhead}}$).

---

## 10. Empirical Results

All reported statistics are derived directly from the immutable raw benchmark data (`runs.jsonl`, `summary.json`, `manifest.json`) and verified canonical analysis artifacts.

### 10.1 Execution Status Distribution (Populations A, B, C, D, E)

| Status Category | Metric | LAYA Count (Rate) | LLM Count (Rate) | Combined Matrix |
|:---|:---|:---:|:---:|:---:|
| **Population A** | Total Assigned Cells | 180 (100.00%) | 180 (100.00%) | 360 (100.00%) |
| **Population B** | Supported Cells | 170 (94.44%) | 180 (100.00%) | 350 (97.22%) |
| **Population C** | Supported Successful Executions | 166 (92.22% all / 97.65% supp) | 175 (97.22% all / 97.22% supp) | 341 (94.72%) |
| **Population D** | Supported Execution Failures | 4 (2.22% all / 2.35% supp) | 5 (2.78% all / 2.78% supp) | 9 (2.50%) |
| **Population E** | Unsupported Rejections | 10 (5.56% all) | 0 (0.00%) | 10 (2.78%) |

### 10.2 Provider-Level Action Metrics (Population C: $N=341$)

| Metric | Provider | N | Mean | Median | Sample SD | Min | P25 | P75 | Max |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Matched Required Actions** | LAYA | 166 | **1.60** | 2.00 | 1.52 | 0 | 0.00 | 2.00 | 6 |
| | LLM | 175 | **1.17** | 1.00 | 1.38 | 0 | 0.00 | 2.00 | 10 |
| **Missed Required Actions** | LAYA | 166 | **1.29** | 1.00 | 1.24 | 0 | 0.00 | 2.00 | 5 |
| | LLM | 175 | **1.74** | 2.00 | 1.52 | 0 | 1.00 | 2.00 | 7 |
| **Unnecessary Actions** | LAYA | 166 | **0.31** | 0.00 | 0.46 | 0 | 0.00 | 1.00 | 1 |
| | LLM | 175 | **2.02** | 1.00 | 2.62 | 0 | 1.00 | 3.00 | 12 |
| **Executed Forbidden Actions** | LAYA | 166 | **0.00** | 0.00 | 0.00 | 0 | 0.00 | 0.00 | 0 |
| | LLM | 175 | **0.08** | 0.00 | 0.27 | 0 | 0.00 | 0.00 | 1 |
| **Executed Optional Actions** | LAYA | 166 | **0.00** | 0.00 | 0.00 | 0 | 0.00 | 0.00 | 0 |
| | LLM | 175 | **0.00** | 0.00 | 0.00 | 0 | 0.00 | 0.00 | 0 |
| **Redundant Actions** | LAYA | 166 | **0.03** | 0.00 | 0.17 | 0 | 0.00 | 0.00 | 1 |
| | LLM | 175 | **0.00** | 0.00 | 0.00 | 0 | 0.00 | 0.00 | 0 |

### 10.3 State Accuracy Distribution (Population C: $N=341$)

| Provider Configuration | N | Mean | Median | Sample SD | Min | P25 | P75 | Max |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **LAYA (System-1)** | 166 | **0.67** | **0.67** | **0.30** | 0.00 | 0.50 | 1.00 | 1.00 |
| **LLM (Ollama / llama3.2:3b)** | 175 | **0.49** | **0.50** | **0.28** | 0.00 | 0.25 | 0.67 | 1.00 |

*Note on Distribution Shape*: Laya exhibited a bimodal state accuracy distribution with concentrations at 0.67 and 1.00 ($P_{75}=1.00$). LLM exhibited a broader distribution centered at 0.50 ($P_{25}=0.25, P_{75}=0.67$).

### 10.4 Category-Level Results across 7 Operational Categories

| Category | Provider | Total | Pop C | Pop D | Pop E | State Acc Mean | Matched Req Mean | Missed Req Mean | Unnecessary Mean | Dec Latency Mean (ms) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **NORMAL** | LAYA | 30 | 27 | 3 | 0 | **0.52** | 2.11 | 1.85 | **0.30** | 41,760.56 |
| | LLM | 30 | 29 | 1 | 0 | **0.24** | 1.24 | 2.72 | **2.24** | 54,327.32 |
| **PARTIAL_STATE** | LAYA | 30 | 30 | 0 | 0 | **0.76** | 1.00 | 0.83 | **0.33** | 33,419.11 |
| | LLM | 30 | 30 | 0 | 0 | **0.48** | 0.33 | 1.50 | **1.23** | 40,620.19 |
| **NO_OP** | LAYA | 25 | 25 | 0 | 0 | **1.00** | 0.00 | 0.00 | **0.40** | 33,380.03 |
| | LLM | 25 | 25 | 0 | 0 | **0.84** | 0.00 | 0.00 | **1.56** | 41,637.05 |
| **MULTI_DEVICE** | LAYA | 30 | 30 | 0 | 0 | **0.38** | 2.67 | 2.67 | **0.33** | 35,004.68 |
| | LLM | 30 | 26 | 4 | 0 | **0.29** | 2.12 | 3.58 | **1.50** | 40,062.36 |
| **CONTEXT_SENSITIVE** | LAYA | 25 | 24 | 1 | 0 | **0.76** | 1.83 | 0.79 | **0.17** | 37,669.07 |
| | LLM | 25 | 25 | 0 | 0 | **0.57** | 1.40 | 1.20 | **2.80** | 64,602.84 |
| **SECURITY** | LAYA | 20 | 15 | 0 | 5 | **0.61** | 1.67 | 1.00 | **0.00** | 39,306.66 |
| | LLM | 20 | 20 | 0 | 0 | **0.63** | 1.65 | 0.85 | **4.00** | 59,763.86 |
| **AMBIGUOUS** | LAYA | 20 | 15 | 0 | 5 | **0.67** | 2.00 | 1.67 | **0.67** | 36,574.11 |
| | LLM | 20 | 20 | 0 | 0 | **0.46** | 1.75 | 2.00 | **1.20** | 58,130.34 |

### 10.5 High-Resolution Latency Statistics (Population C)

| Provider | Phase | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Mean (ms) | Max (ms) | Std Dev (ms) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **LAYA** | Decision | 27,884.57 | 33,045.27 | **34,880.84** | 38,341.72 | **36,488.06** | 55,654.47 | 5,094.29 |
| | Simulation | 0.00 | 0.04 | 0.08 | 0.19 | **0.31** | 6.65 | 0.75 |
| | Evaluation | 0.02 | 0.03 | 0.06 | 0.10 | **0.24** | 5.64 | 0.65 |
| | **Total Execution** | 27,885.07 | 33,046.37 | **34,881.63** | 38,342.59 | **36,489.60** | 55,662.46 | 5,094.72 |
| **LLM** | Decision | 14,700.88 | 21,394.16 | **41,869.63** | 69,243.24 | **50,569.15** | 171,671.48 | 35,035.71 |
| | Simulation | 0.00 | 0.08 | 0.19 | 1.37 | **1.16** | 13.11 | 1.99 |
| | Evaluation | 0.03 | 0.06 | 0.09 | 0.47 | **0.65** | 4.90 | 1.13 |
| | **Total Execution** | 14,701.25 | 21,395.07 | **41,872.98** | 69,247.47 | **50,572.04** | 171,681.48 | 35,037.72 |

*Observations on Latency*:
1. **Decision Dominance**: Inference accounted for **>99.99%** of pipeline latency in both architectures. World-model simulation and rule evaluation accounted for $<2$ ms combined.
2. **Variance Profiles**: Laya exhibited low latency dispersion (sample SD = 5,109.70 ms, coefficient of variation $CV = 14.00\%$). LLM exhibited substantial dispersion (sample SD = 35,136.24 ms, $CV = 69.48\%$), driven by variable output token lengths and Ollama CPU context allocation.
3. **Hardware Constraint Context**: These timings reflect single-thread/multi-core consumer CPU execution and should not be interpreted as universal across GPU-accelerated environments.

### 10.6 Supported Failure Forensics (Population D: Exactly 9 Cells)

| Provider | Scenario ID | Repetition | Category | Failure Mechanism | Root-Cause Analysis |
|:---|:---|:---:|:---|:---|:---|
| **LAYA** | `normal-sleep-01` | 2 | NORMAL | Client Timeout (>60,000 ms) | PyTorch forward pass on local CPU exceeded the 60s client timeout during transient OS scheduling load. |
| **LAYA** | `normal-movie-01` | 2 | NORMAL | Client Timeout (>60,000 ms) | Transient local CPU inference latency spike; subsequent requests recovered immediately. |
| **LAYA** | `normal-movie-01` | 3 | NORMAL | Client Timeout (>60,000 ms) | Consecutive repetition timeout on same scenario under CPU scheduling pressure. |
| **LAYA** | `context-movie-tv-already-on-01` | 5 | CONTEXT_SENSITIVE | Client Timeout (>60,000 ms) | Isolated forward-pass latency spike exceeding 60s client boundary. |
| **LLM** | `normal-sleep-01` | 1 | NORMAL | Client Timeout (>180,000 ms) | Cold-start Ollama model initialization and context window memory allocation on the first cell of the experiment. |
| **LLM** | `multi-wake-01` | 2 | MULTI_DEVICE | Hallucinated Device Entity | Model emitted action for `"thermostat_bedroom"`. Device does not exist in `HomeState` (`"thermostat_living_room"` is only thermostat). |
| **LLM** | `multi-wake-01` | 3 | MULTI_DEVICE | Hallucinated Device Entity | Identical schema validation failure across repetition. |
| **LLM** | `multi-wake-01` | 4 | MULTI_DEVICE | Hallucinated Device Entity | Identical schema validation failure across repetition. |
| **LLM** | `multi-wake-01` | 5 | MULTI_DEVICE | Hallucinated Device Entity | Identical schema validation failure across repetition. |

### 10.7 Unsupported Domain Behavior (Population E: Exactly 10 Cells)
- **LAYA System-1**: Rejected **2 scenarios** across all 5 repetitions (10 cells total) via its upstream domain router:
  1. `security-lockdown-01` (5 cells): Multi-zone emergency lockdown protocol.
  2. `ambiguous-night-ready-01` (5 cells): Broad conversational query ("Get everything ready for the night").
  *Observed Mechanism*: Laya returned status `UNSUPPORTED` immediately without issuing network calls to PyTorch or mutating the world model.
- **LLM**: Recorded **0 unsupported rejections**. The LLM accepted all prompts and attempted generation across all 36 scenarios.

### 10.8 Correlation Analysis

| Metric Pair | Population Scope | Sample Size ($N$) | Pearson Correlation ($r$) | Spearman Rank ($\rho$) |
|:---|:---|:---:|:---:|:---:|
| **Unnecessary Actions vs. State Accuracy** | Overall (Pop C) | 341 | **0.0272** | **-0.1060** |
| | LAYA | 166 | **-0.0015** | **0.0825** |
| | LLM | 175 | **0.2496** | **0.1008** |
| **Decision Latency vs. State Accuracy** | Overall (Pop C) | 341 | **0.1440** | **0.1111** |
| | LAYA | 166 | **-0.0701** | **-0.1087** |
| | LLM | 175 | **0.3660** | **0.3063** |

*Scientific Policy Statement*: **Correlation does not establish causation.** The weak observed correlations ($|r| < 0.37, |\rho| \le 0.31$) indicate that neither action count nor inference duration linearly predicts final-state agreement. Final-state accuracy is structurally governed by the topology of matched vs. missed required actions relative to the initial state $S_0$.

---

## 11. Research Questions & Evidence-Based Answers

### RQ1: How do the two provider configurations behave across the controlled smart-home scenario set?
**Descriptive Evidence**:
Across the 180 assigned cells per provider, Laya recorded **166 successful executions (92.22% overall, 97.65% supported)**, 4 timeout failures (2.35% of supported), and 10 unsupported rejections (5.56% of overall). The LLM configuration recorded **175 successful executions (97.22% overall and supported)**, 1 timeout failure (0.56%), and 4 action-validation failures (2.22%). Laya constrained execution strictly to supported operational domains, whereas LLM processed all scenarios without architectural domain boundaries.

### RQ2: What action-level and state-level outcomes are observed across scenario categories?
**Descriptive Evidence**:
Within Population C ($N=341$), Laya exhibited an observed mean of **1.60** matched required actions, **1.29** missed required actions, **0.31** unnecessary actions, and **0.00** forbidden actions, yielding a mean state accuracy ratio of **0.67** (median: 0.67, sample SD: 0.30). LLM exhibited an observed mean of **1.17** matched required actions, **1.74** missed required actions, **2.02** unnecessary actions, and **0.08** forbidden actions, yielding a mean state accuracy ratio of **0.49** (median: 0.50, sample SD: 0.28). In NO_OP scenarios, Laya achieved a mean state accuracy of **1.00** (0.40 unnecessary actions) vs. LLM's **0.84** (1.56 unnecessary actions). In SECURITY scenarios, Laya recorded **0.00** forbidden actions and **0.00** unnecessary actions on supported cells, while LLM recorded **0.00** forbidden actions and **4.00** unnecessary actions.

### RQ3: What latency characteristics are observed under local CPU execution?
**Descriptive Evidence**:
Within Population C, Laya exhibited an observed median decision latency of **34,880.84 ms** (mean: 36,488.06 ms; sample SD: 5,109.70 ms). LLM exhibited an observed median decision latency of **41,869.63 ms** (mean: 50,569.15 ms; sample SD: 35,136.24 ms). In both configurations, decision inference consumed **>99.99%** of total execution time. World-model simulation averaged **0.31 ms** for Laya and **1.16 ms** for LLM; ground-truth evaluation averaged **0.24 ms** for Laya and **0.65 ms** for LLM.

### RQ4: How do unsupported-domain handling and execution failures differ between the architectures?
**Descriptive Evidence**:
Laya implemented an upstream domain router that rejected 2 scenarios (`security-lockdown-01` and `ambiguous-night-ready-01`) deterministically across all 5 repetitions (10 cells) with status `UNSUPPORTED`, preventing unverified state mutations. LLM possessed no router-level domain boundaries and accepted all 36 scenarios, but experienced 4 action-validation rejections on `multi-wake-01` where the model hallucinated an unmodeled device (`"thermostat_bedroom"`). Laya's 4 failures were strictly client timeouts (>60s) under PyTorch CPU load; LLM experienced 1 cold-start timeout (>180s) and 4 entity-validation failures.

---

## 12. Discussion

To maintain absolute scientific integrity, the discussion differentiates strictly between **FACTS**, **OBSERVED RESULTS**, **LIMITATIONS**, and **INTERPRETATIONS**:

### 12.1 Action Parsimony & State Awareness
- **FACT**: The frozen dataset included 5 NO_OP scenarios where initial state $S_0$ already satisfied all user constraints, and 6 PARTIAL_STATE scenarios where some devices were already satisfied.
- **OBSERVED RESULT**: On NO_OP scenarios, Laya generated an observed mean of 0.40 unnecessary actions (mean state accuracy 1.00); LLM generated an observed mean of 1.56 unnecessary actions (mean state accuracy 0.84). Across all 175 successful LLM runs, 2.02 unnecessary actions were generated on average, compared to 0.31 for Laya.
- **LIMITATION**: The scenarios evaluated a discrete set of 36 predefined home topologies. They do not represent all possible combinatorial states of an open-world smart home.
- **INTERPRETATION**: The higher rate of unnecessary actions in the LLM configuration is consistent with the hypothesis that autoregressive language models, when prompted to produce action lists, exhibit a generative bias toward emitting commands rather than preserving the null action set ($\emptyset$).

### 12.2 Latency Composition & Compute Overhead
- **FACT**: All inference executed locally on the host CPU. Timers measured decision, simulation, and evaluation phases separately.
- **OBSERVED RESULT**: Decision inference accounted for >99.99% of elapsed time. Simulation of state transitions in `SimulationEngine` averaged $<1.2$ ms across both providers.
- **LIMITATION**: CPU execution is subject to OS thread scheduling, thermal throttling, and context-switching overheads. Findings cannot be generalized to dedicated GPU, NPU, or cloud-hosted inference endpoints.
- **INTERPRETATION**: In local edge smart-home architectures, the computational bottleneck lies entirely within neural inference; deterministic world-model state simulation introduces virtually negligible runtime overhead.

### 12.3 Architectural Trade-Offs in Domain Boundaries
- **FACT**: Laya rejected 2 scenarios (10 cells) prior to inference; LLM accepted all 36 scenarios (180 cells).
- **OBSERVED RESULT**: Laya achieved zero execution failures on the 2 rejected scenarios by policy, but provided zero actuation. LLM attempted both scenarios and completed 5/5 successful repetitions for each, achieving mean state accuracies of 0.67 on `security-lockdown-01` and 0.50 on `ambiguous-night-ready-01`.
- **LIMITATION**: The experiment did not evaluate whether human operators prefer an explicit refusal over a partially accurate automated response.
- **INTERPRETATION**: Domain routing introduces an architectural trade-off between coverage breadth and execution certainty. Strict routing prevents out-of-domain errors at the expense of requiring manual fallback for unmodeled intents.

---

## 13. Research Limitations

This empirical investigation is bounded by the following explicit research constraints:

1. **Hardware & Execution Environment**: All executions were performed locally on consumer-grade CPU hardware. Laya used PyTorch CPU inference; LLM used Ollama CPU inference. Measured latencies reflect local compute bottlenecks rather than optimized edge silicon (TPUs, NPUs) or GPU acceleration.
2. **Sample Breadth & Horizon**: Exactly 36 frozen scenarios were evaluated across 5 repetitions ($N=360$). While statistically sufficient for descriptive profiling, findings do not generalize to open-ended conversational dialogues or arbitrary multi-floor topologies.
3. **Simulated State Environment**: State transitions were executed in a software-defined simulator (`SimulationEngine`), not against physical Zigbee, Z-Wave, or Matter hardware devices. Physical network latencies, packet loss, RF attenuation, and hardware unresponsiveness were not modeled.
4. **Specific Model Checkpoints**: Findings characterize `laya-serve 0.3.20 (english)` and Meta's `llama3.2:3b`. Other parameter scales (e.g., 7B, 13B, 70B) or fine-tuned domain variants may exhibit different behavioral characteristics.
5. **Prompt Template Invariance**: The LLM configuration utilized a single zero-shot system prompt with structured JSON formatting. Alternative prompting techniques (few-shot exemplars, chain-of-thought, retrieval-augmented state injection) were not explored.
6. **Uncalibrated Model Confidence**: Laya reports model-level probabilities. These values are raw network activations and were not independently calibrated against empirical ground-truth likelihoods by HomeMind.
7. **Evaluation Contract Rigidity**: Ground-truth targets were determined by frozen declarative rules (`expectedOutcome`). Alternative semantic evaluators might evaluate ambiguous intents under different threshold criteria.
8. **Entity Hallucination Sensitivity**: The validation gate strictly enforced entity existence in $S_0$. The LLM failed 4 cells on `multi-wake-01` due to targeting `"thermostat_bedroom"`, demonstrating vulnerability to schema assumptions when room-specific device manifests are not explicitly reinforced.

---

## 14. Reproducibility & Audit Trail

The entire experiment is designed for complete bit-level auditability and deterministic replication.

### 14.1 Cryptographic & Identifiable Markers
- **Experiment Identifier**: `exp_ctrl_1790945358821_ibkjxz`
- **Dataset Version**: `HomeMind-Eval-Dataset-v1.0`
- **Dataset SHA-256 Hash**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`
- **Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`
- **Execution Matrix**: 36 scenarios $\times$ 2 providers $\times$ 5 repetitions = 360 cells.

### 14.2 Canonical Benchmark Files on Disk
- **Manifest**: `artifacts/benchmarks/controlled-experiment-full_exp_ctrl_1790945358821_ibkjxz/manifest.json`
- **Streaming Runs Log**: `artifacts/benchmarks/controlled-experiment-full_exp_ctrl_1790945358821_ibkjxz/runs.jsonl`
- **Summary Record**: `artifacts/benchmarks/controlled-experiment-full_exp_ctrl_1790945358821_ibkjxz/summary.json`

### 14.3 Intermediate Canonical Summary Artifacts
- **Research Analysis Master**: `artifacts/analysis/controlled-experiment/research_analysis.json`
- **Provider Aggregates**: `artifacts/analysis/controlled-experiment/provider_summary.json`
- **Category Aggregates**: `artifacts/analysis/controlled-experiment/category_summary.json`
- **Failure Catalog**: `artifacts/analysis/controlled-experiment/failure_analysis.json`
- **Phase Timings**: `artifacts/analysis/controlled-experiment/latency_summary.json`

### 14.4 Publication Visualization Assets
- **Tables (Markdown, CSV, JSON)**: `artifacts/analysis/controlled-experiment/visualizations/tables/table1` through `table7`
- **Publication Figures (SVG)**: `artifacts/analysis/controlled-experiment/visualizations/figures/fig01` through `fig12`

---

## 15. Scientific Reporting Policy

To safeguard against bias, overclaiming, and confabulation, all reporting in this project adheres to the following mandatory constraints:

1. **No Winner Declarations**: No provider is designated as "winner", "superior", or "best". The two architectures exhibit different operational trade-offs across coverage, parsimony, and latency.
2. **No Composite Scoring**: No scalar weighted scores (e.g., combining latency and accuracy into an arbitrary index) are computed. All metrics are presented independently.
3. **No Causal Overreach**: Correlation metrics ($r, \rho$) are reported strictly as descriptive associations. No causal claims are asserted without controlled ablation experiments.
4. **Strict Grounding in Canonical Identifiers**: Scenario names and error logs must strictly match the frozen dataset and `runs.jsonl`. Fictional scenario names are strictly prohibited.
5. **Immutable Source of Truth**: When textual prose and underlying data tables conflict, the immutable streaming raw data (`runs.jsonl`) and canonical summary JSON files represent the absolute source of truth.

---

## 16. Future Work

The findings of this controlled evaluation suggest several productive directions for future smart-home AI research:

1. **Physical Testbed Deployment**: Transitioning the evaluation harness from `SimulationEngine` to physical smart home hardware testbeds (e.g., Home Assistant with Zigbee/Z-Wave/Matter fabrics) to evaluate real RF latencies and device failure modes.
2. **Hardware-Accelerated Edge Inference**: Benchmarking non-autoregressive and autoregressive models on dedicated local acceleration silicon (Nvidia Jetson, Apple Silicon Neural Engine, Google Coral, Intel NPU).
3. **Calibrated Confidence Estimation**: Implementing conformal prediction or temperature scaling on Laya and LLM outputs to provide calibrated confidence bounds for safety-critical actuations.
4. **Constrained Decoding for LLMs**: Integrating grammar-constrained decoding (e.g., via Guidance, Outlines, or llama.cpp grammars) to programmatically restrict LLM output tokens to existing home devices, eliminating entity hallucination.
5. **Expanded Scenario Taxonomies**: Scaling the scenario dataset from 36 to $\ge 500$ scenarios encompassing multi-user conflicts, privacy constraints, and seasonal routines.
6. **Adaptive Hybrid Routing**: Investigating router architectures that dynamically dispatch routine single-intent requests to fast System-1 classifiers while delegating multi-stage reasoning to autoregressive models.

---

## 17. Conclusion

This report has documented the design, methodology, and empirical findings of HomeMind, an open evaluation platform for context-aware smart home automation. Through a rigorous 360-cell controlled experiment, HomeMind demonstrated that:
1. Smart home decision making can be objectively evaluated using a decoupled, provider-neutral architecture combining deterministic world-model simulation with declarative rule verification.
2. Action parsimony and state awareness vary significantly across decision architectures: Laya System-1 generated fewer unnecessary actions (mean 0.31 vs. 2.02) and maintained higher state agreement on partial-state and no-op scenarios, while the LLM configuration supported universal prompt coverage without domain rejection.
3. In local CPU execution, decision inference dominates the latency budget (>99.99%), establishing that world-model simulation introduces negligible runtime overhead in local edge automation.
4. The resulting 360-cell benchmark dataset and visualization artifacts provide an immutable, cryptographically verifiable foundation for future smart home automation research.
