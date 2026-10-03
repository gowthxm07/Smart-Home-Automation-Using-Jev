# HomeMind Research Artifact Index

**Experiment ID**: `exp_ctrl_1790945358821_ibkjxz`  
**Dataset Version**: `HomeMind-Eval-Dataset-v1.0 (36 Controlled Scenarios)`  
**Dataset SHA-256 Hash**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`  
**Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`  
**Execution Matrix**: 36 scenarios $\times$ 2 active providers $\times$ 5 repetitions = 360 cells  

---

## 1. Source Code & Core Architecture (SOURCE CODE)

The foundational software execution harness, models, and application interfaces:

| Source Path | Purpose |
|:---|:---|
| `src/lib/providers/registry.ts` | Universal Provider Registry managing active decision providers (LAYA, LLM). |
| `src/lib/simulationEngine.ts` | Deterministic world-model physics and state transition engine. |
| `src/lib/evaluation/evaluator.ts` | Standard provider-neutral evaluation engine (`StandardEvaluationEngine`). |
| `src/lib/evaluation/comparison/dualConfigRunner.ts` | Dual-configuration comparative execution harness enforcing state isolation. |
| `src/lib/evaluation/comparison/scenarioMapping.ts` | Deterministic mapping between UI presets and frozen benchmark scenario IDs. |
| `src/context/HomeContext.tsx` | Central React context managing home state, clock simulation, and intent execution. |
| `src/lib/jev/` | Preserved non-live historical Jev integration artifacts (0 active benchmark cells). |

---

## 2. Frozen Benchmark Dataset (DATASET)

The standardized, cryptographically verified scenario dataset:

| Artifact Path | Format | Description & Verification |
|:---|:---:|:---|
| `src/lib/evaluation/dataset/scenarios.ts` | TypeScript | Canonical repository of exactly 36 controlled scenarios across 7 operational categories (NORMAL, PARTIAL_STATE, NO_OP, MULTI_DEVICE, CONTEXT_SENSITIVE, SECURITY, AMBIGUOUS). |
| `src/tests/evaluationDataset.test.ts` | Vitest | Automated integrity test suite verifying the SHA-256 hash invariant: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329` (10/10 tests pass). |

---

## 3. Primary Benchmark Raw Data (EXPERIMENT)

The immutable, complete historical execution record located in `artifacts/benchmarks/exp_ctrl_1790945358821_ibkjxz/`:

| Artifact Path | Format | Size | Description & Purpose |
|:---|:---:|:---:|:---|
| `runs.jsonl` | JSONL | 1.92 MB | Streaming raw log of all 360 execution cells. Contains complete per-cell telemetry: intent, initial state, raw provider output, parsed actions, validation diffs, post-simulation state, evaluation scores, and microsecond-precision timing breakdowns. |
| `manifest.json` | JSON | 1.03 KB | Cryptographic run manifest recording experiment ID, timestamp, host platform, active providers (LAYA, LLM), dataset SHA-256 hash, and random seeds. |
| `summary.json` | JSON | 11.78 MB | Consolidated post-run serialization of all 360 cell objects, complete state objects, and execution logs. |
| `controlled-experiment-full_exp_ctrl_1790945358821_ibkjxz.json` | JSON | 11.78 MB | Standalone benchmark execution output file matching summary format. |

---

## 4. Canonical Research Analysis Artifacts (ANALYSIS)

Computed programmatically from `runs.jsonl` during Milestone 3.21 and remediated in 3.22B. Located in `artifacts/analysis/controlled-experiment/`:

| Artifact Path | Format | Description & Purpose |
|:---|:---:|:---|
| `research_analysis.md` | Markdown | Validated comprehensive narrative analysis document (Version 1.2), reporting provider metrics, category breakdowns, failure forensics, and research questions. |
| `research_analysis.json` | JSON | Machine-readable master analysis file containing population counts, provider summary objects, category summaries, and cross-metric statistics. |
| `provider_summary.json` | JSON | Provider-level descriptive statistics for LAYA and LLM: action count distributions, state accuracy distributions, and latency distributions. |
| `category_summary.json` | JSON | Operational category-level statistics for all 7 categories. |
| `failure_analysis.json` | JSON | Detailed catalog and classification of the 9 execution failures (Pop D) and 10 unsupported rejections (Pop E). |
| `latency_summary.json` | JSON | Breakdown of decision latency, simulation latency, evaluation latency, and total latency by provider and category. |
| `scenario_summary.json` | JSON | Per-scenario aggregate statistics across all 36 individual scenarios. |

---

## 5. Publication Visualization Tables (VISUALIZATION)

Located in `artifacts/analysis/controlled-experiment/visualizations/tables/` in Markdown (`.md`), JSON (`.json`), and CSV (`.csv`):

| Table Identifier | Markdown File | Corresponding CSV / JSON | Description & Purpose |
|:---|:---|:---|:---|
| **Table 1** | `table1_population_and_status.md` | `table1_...csv`, `table1_...json` | Distribution of assigned cells across Populations A, B, C, D, and E for LAYA and LLM. |
| **Table 2** | `table2_provider_action_metrics.md` | `table2_...csv`, `table2_...json` | Provider-level action distributions (matched, missed, unnecessary, forbidden, redundant, optional) for Population C. |
| **Table 3** | `table3_provider_state_accuracy.md` | `table3_...csv`, `table3_...json` | Provider-level state accuracy distributions (Mean, Median, Quartiles, Sample SD: 0.30 for LAYA, 0.28 for LLM). |
| **Table 4** | `table4_category_results.md` | `table4_...csv`, `table4_...json` | Detailed behavioral performance breakdown across all 7 operational categories. |
| **Table 5** | `table5_latency_statistics.md` | `table5_...csv`, `table5_...json` | High-resolution latency statistics by phase (decision, simulation, evaluation, total) for Population C. |
| **Table 6** | `table6_failure_mechanisms.md` | `table6_...csv`, `table6_...json` | Itemized catalog of all 9 supported execution failures (Population D). |
| **Table 7** | `table7_scenario_completion.md` | `table7_...csv`, `table7_...json` | Scenario completion count (5/5 vs. partial vs. unsupported) across all 36 scenarios. |

---

## 6. Publication Visualization Figures (VISUALIZATION)

Located in `artifacts/analysis/controlled-experiment/visualizations/figures/` as Scalable Vector Graphics (`.svg`):

| Figure Identifier | File Path | Figure Title & Scientific Content |
|:---|:---|:---|
| **FIG-01** | `fig01_execution_status_distribution.svg` | Execution status distribution across Populations C, D, and E. |
| **FIG-02** | `fig02_action_metric_means.svg` | Action metric means (matched, missed, unnecessary, forbidden) comparison. |
| **FIG-03** | `fig03_observed_state_accuracy_distribution.svg` | Observed state accuracy distribution histograms and boxplots. |
| **FIG-04** | `fig04_state_accuracy_by_category.svg` | State accuracy ratio by category across all 7 operational categories. |
| **FIG-05** | `fig05_unnecessary_actions_by_category.svg` | Unnecessary actions mean count across operational categories. |
| **FIG-06** | `fig06_decision_latency_distribution.svg` | Decision latency distribution (boxplots and violin curves). |
| **FIG-07** | `fig07_latency_pipeline_composition.svg` | Execution pipeline latency composition (>99.99% decision dominance). |
| **FIG-08** | `fig08_failure_mechanisms.svg` | Distribution of failure mechanisms (timeouts vs. entity hallucination). |
| **FIG-09** | `fig09_unsupported_domain_observations.svg` | Unsupported domain router rejection observations (LAYA vs. LLM). |
| **FIG-10** | `fig10_scenario_completion_status.svg` | Scenario-level completion status (31 Laya 5/5, 34 LLM 5/5). |
| **FIG-11** | `fig11_scenario_state_accuracy_heatmap.svg` | Comprehensive 36-scenario state accuracy comparison heatmap. |
| **FIG-12** | `fig12_repetition_outcome_matrix.svg` | Full 360-cell repetition outcome matrix (36 scenarios $\times$ 5 repetitions $\times$ 2 providers). |

---

## 7. Research Documentation Package (RESEARCH DOCUMENTATION)

Located in `docs/research/`:

| Document Path | Purpose & Research Focus |
|:---|:---|
| `HOMEMIND_FINAL_RESEARCH_REPORT.md` | Primary academic research report documenting system architecture, evaluation protocol, empirical results, research questions, discussion, and limitations. |
| `RESULTS_SUMMARY.md` | Concise executive summary of results designed for presentation, oral examination (viva), and quick reference. |
| `REPRODUCIBILITY.md` | Step-by-step reproduction guide detailing host environment, serving setup, execution procedure, and validation checks. |
| `FIGURE_TABLE_REFERENCE.md` | Complete mapping and scientific interpretation guide for all 12 figures and 7 tables. |
| `README.md` | Navigation guide to the complete HomeMind research documentation package. |

---

## 8. Forensic & System Audits (AUDIT)

Located in `docs/research/`:

| Document Path | Purpose & Audit Scope |
|:---|:---|
| `3.22A_FORENSIC_RECONCILIATION.md` | Milestone 3.22A forensic reconciliation audit establishing the mathematical integrity of the raw benchmark data and resolving discrepancies. |
| `3.24_FINAL_END_TO_END_AUDIT.md` | Milestone 3.24 comprehensive read-only audit across 20 assessment categories (**20 PASS, 0 WARNING, 0 BLOCKER**), establishing readiness for Project Freeze. |

---

## 9. Demonstration, Viva & Project Management (DEMO, VIVA, STATUS)

Located in `docs/`:

| Document Path | Purpose & Operational Role |
|:---|:---|
| `docs/DEMO_GUIDE.md` | Operational walkthrough for evaluators and faculty, covering startup sequence, recommended demo scenarios, and failure recovery. |
| `docs/VIVA_GUIDE.md` | Comprehensive oral defense preparation manual containing 30s/1m elevator pitches, architecture Q&A, research methodology Q&A, and cheat sheet of canonical numbers. |
| `docs/PROJECT_STATUS.md` | Official project status ledger documenting frozen state, active vs. historical providers, validation pass counts, and post-freeze policies. |
