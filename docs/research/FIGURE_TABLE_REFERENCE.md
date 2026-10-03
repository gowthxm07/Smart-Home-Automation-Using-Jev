# HomeMind Figure & Table Reference Guide

**Experiment ID**: `exp_ctrl_1790945358821_ibkjxz`  
**Dataset Invariant**: `HomeMind-Eval-Dataset-v1.0` (SHA-256: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`)  
**Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`  
**Location of Visualizations**: `artifacts/analysis/controlled-experiment/visualizations/`  

---

## 1. Overview & Reading Guidance

This reference provides a complete index, visual mapping, and scientific interpretation guide for all publication-quality vector graphics (Figures 1–12) and data tables (Tables 1–7) generated from the validated 360-cell controlled experiment.

All figures and tables were compiled deterministically from `runs.jsonl` and canonical summary JSON files. No visualizations have been manually altered or retrofitted.

---

## 2. Publication Figures (FIG-01 through FIG-12)

All figures are standalone Scalable Vector Graphics (`.svg`) located in:
`artifacts/analysis/controlled-experiment/visualizations/figures/`

### FIG-01: Execution Status Distribution
- **File**: `fig01_execution_status_distribution.svg`
- **Visual Mapping**: Stacked horizontal bar chart showing the breakdown of all 180 cells per provider into Successful (Pop C), Failed (Pop D), and Unsupported (Pop E).
- **Canonical Values**:
  - LAYA: 166 Success (92.22%), 4 Failed (2.22%), 10 Unsupported (5.56%).
  - LLM: 175 Success (97.22%), 5 Failed (2.78%), 0 Unsupported (0.00%).
- **Scientific Reading**: Laya enforces strict domain boundaries through router rejections (Pop E), whereas LLM attempts execution across the entire dataset without router-level filtering.

### FIG-02: Action Metric Means
- **File**: `fig02_action_metric_means.svg`
- **Visual Mapping**: Grouped bar chart comparing mean action counts per cell across Population C ($N=341$).
- **Canonical Values**:
  - Matched Required: LAYA = 1.60 | LLM = 1.17
  - Missed Required: LAYA = 1.29 | LLM = 1.74
  - Unnecessary Actions: LAYA = 0.31 | LLM = 2.02
  - Forbidden Actions: LAYA = 0.00 | LLM = 0.08
- **Scientific Reading**: Laya exhibited higher action parsimony, producing fewer unnecessary actions on average (0.31 vs. 2.02) and maintaining zero forbidden actions.

### FIG-03: Observed State Accuracy Distribution
- **File**: `fig03_observed_state_accuracy_distribution.svg`
- **Visual Mapping**: Kernel density estimation and histogram overlay comparing the spread of final state accuracy ratios for Population C.
- **Canonical Values**:
  - LAYA ($N=166$): Mean = 0.67, Median = 0.67, Sample SD = 0.30, $P_{25} = 0.50, P_{75} = 1.00$.
  - LLM ($N=175$): Mean = 0.49, Median = 0.50, Sample SD = 0.28, $P_{25} = 0.25, P_{75} = 0.67$.
- **Scientific Reading**: Laya displays a bimodal accuracy distribution with a heavy cluster at perfect state agreement (1.00), while LLM displays a more symmetric unimodal distribution centered at 0.50.

### FIG-04: State Accuracy by Category
- **File**: `fig04_state_accuracy_by_category.svg`
- **Visual Mapping**: Multi-category grouped bar chart showing mean state accuracy across all 7 operational categories.
- **Canonical Values**:
  - NORMAL: LAYA = 0.52 | LLM = 0.24
  - PARTIAL_STATE: LAYA = 0.76 | LLM = 0.48
  - NO_OP: LAYA = 1.00 | LLM = 0.84
  - MULTI_DEVICE: LAYA = 0.38 | LLM = 0.29
  - CONTEXT_SENSITIVE: LAYA = 0.76 | LLM = 0.57
  - SECURITY: LAYA = 0.61 | LLM = 0.63
  - AMBIGUOUS: LAYA = 0.67 | LLM = 0.46
- **Scientific Reading**: Laya observed higher state accuracy across 6 of the 7 categories (notably NO_OP at 1.00 and PARTIAL_STATE at 0.76). On SECURITY scenarios, both providers achieved comparable accuracy (0.61 vs. 0.63).

### FIG-05: Unnecessary Actions by Category
- **File**: `fig05_unnecessary_actions_by_category.svg`
- **Visual Mapping**: Grouped vertical bar chart displaying mean unnecessary actions emitted across categories.
- **Canonical Values**:
  - NORMAL: LAYA = 0.30 | LLM = 2.24
  - PARTIAL_STATE: LAYA = 0.33 | LLM = 1.23
  - NO_OP: LAYA = 0.40 | LLM = 1.56
  - MULTI_DEVICE: LAYA = 0.33 | LLM = 1.50
  - CONTEXT_SENSITIVE: LAYA = 0.17 | LLM = 2.80
  - SECURITY: LAYA = 0.00 | LLM = 4.00
  - AMBIGUOUS: LAYA = 0.67 | LLM = 1.20
- **Scientific Reading**: LLM generated unnecessary actions across all categories, peaking at 4.00 on SECURITY and 2.80 on CONTEXT_SENSITIVE. Laya maintained unnecessary action means $\le 0.67$ across all categories, reaching 0.00 on SECURITY.

### FIG-06: Decision Latency Distribution
- **File**: `fig06_decision_latency_distribution.svg`
- **Visual Mapping**: Box-and-whisker plot with outlier scatter points illustrating decision latency distributions on local CPU.
- **Canonical Values**:
  - LAYA: Median = 34,880.84 ms, Mean = 36,488.06 ms, Min = 27,884.57 ms, Max = 55,654.47 ms, SD = 5,109.70 ms.
  - LLM: Median = 41,869.63 ms, Mean = 50,569.15 ms, Min = 14,700.88 ms, Max = 171,671.48 ms, SD = 35,136.24 ms.
- **Scientific Reading**: Laya exhibited lower latency dispersion ($CV = 14.00\%$), while LLM exhibited high variance ($CV = 69.48\%$) driven by token generation length and CPU scheduling load.

### FIG-07: Latency Pipeline Composition
- **File**: `fig07_latency_pipeline_composition.svg`
- **Visual Mapping**: Log-scale stacked composition chart depicting the share of execution time consumed by decision inference vs. world-model simulation vs. evaluation.
- **Canonical Values**:
  - Decision Phase: >99.99% (36,488 ms for Laya, 50,569 ms for LLM).
  - Simulation Phase: 0.31 ms for Laya, 1.16 ms for LLM.
  - Evaluation Phase: 0.24 ms for Laya, 0.65 ms for LLM.
- **Scientific Reading**: Confirms that world-model simulation and rule evaluation introduce negligible computational overhead in local smart home automation pipelines.

### FIG-08: Failure Mechanisms
- **File**: `fig08_failure_mechanisms.svg`
- **Visual Mapping**: Categorical distribution of the 9 execution failures (Population D) by underlying root cause.
- **Canonical Values**:
  - LAYA (4 failures): 100% Client Timeout (>60s) due to transient CPU scheduling load (`normal-sleep-01` rep 2, `normal-movie-01` reps 2–3, `context-movie-tv-already-on-01` rep 5).
  - LLM (5 failures): 20% Cold-Start Timeout (>180s on `normal-sleep-01` rep 1) and 80% Entity Hallucination Validation Failure on `multi-wake-01` reps 2–5 (`"thermostat_bedroom"`).
- **Scientific Reading**: Demonstrates divergent failure modes: Laya failed solely due to latency threshold exceedance, whereas LLM experienced semantic hallucination of unmodeled entities.

### FIG-09: Unsupported Domain Observations
- **File**: `fig09_unsupported_domain_observations.svg`
- **Visual Mapping**: Proportional visualization of out-of-domain router rejections (Population E).
- **Canonical Values**:
  - LAYA: 10 rejections across `security-lockdown-01` (5 reps) and `ambiguous-night-ready-01` (5 reps).
  - LLM: 0 rejections.
- **Scientific Reading**: Highlights Laya's conservative operational policy that refuses execution on unmodeled intent categories.

### FIG-10: Scenario Completion Status
- **File**: `fig10_scenario_completion_status.svg`
- **Visual Mapping**: Stacked bar comparison of 36 scenarios categorized as Fully Completed (5/5), Partially Completed (1–4/5), or Unsupported (0/5).
- **Canonical Values**:
  - LAYA: 31 fully completed (86.11%), 3 partially completed (8.33%), 2 unsupported (5.56%).
  - LLM: 34 fully completed (94.44%), 2 partially completed (5.56%), 0 unsupported (0.00%).
- **Scientific Reading**: LLM achieved full 5/5 completion on 34 scenarios vs. Laya's 31, reflecting LLM's broader execution coverage.

### FIG-11: Scenario State Accuracy Heatmap
- **File**: `fig11_scenario_state_accuracy_heatmap.svg`
- **Visual Mapping**: 2-column $\times$ 36-row matrix heatmap colored by mean state accuracy from 0.00 (red) to 1.00 (green).
- **Canonical Values**: Exact scenario-level accuracies matching `table4_category_results.md` and `scenario_summary.json`.
- **Scientific Reading**: Provides granular scenario-by-scenario visual contrast, showing Laya's strong performance across NO_OP and PARTIAL_STATE rows and LLM's performance on SECURITY rows.

### FIG-12: Repetition Outcome Matrix
- **File**: `fig12_repetition_outcome_matrix.svg`
- **Visual Mapping**: Complete 360-cell grid (36 scenarios $\times$ 5 repetitions $\times$ 2 providers) where each cell is color-coded by execution outcome (Green = Success, Red = Timeout Failure, Orange = Validation Failure, Gray = Unsupported).
- **Canonical Values**: Exact 360-cell representation directly reflecting `runs.jsonl`.
- **Scientific Reading**: Serves as the complete forensic map of the entire experiment, documenting repetition-level determinism and isolating the exact coordinates of all 9 failures and 10 unsupported cells.

---

## 3. Publication Tables (Table 1 through Table 7)

Located in `artifacts/analysis/controlled-experiment/visualizations/tables/`.

### Table 1: Population and Execution Status
- **Markdown**: `table1_population_and_status.md`
- **Machine Formats**: `table1_population_and_status.json`, `table1_population_and_status.csv`
- **Content**: Complete census of assigned cells across Populations A, B, C, D, and E with percentage rates.

### Table 2: Provider Action Metrics
- **Markdown**: `table2_provider_action_metrics.md`
- **Machine Formats**: `table2_provider_action_metrics.json`, `table2_provider_action_metrics.csv`
- **Content**: Summary statistics (Mean, Median, Std Dev, Min, P25, P75, Max) for matched, missed, unnecessary, forbidden, redundant, and optional actions on Population C.

### Table 3: Provider State Accuracy
- **Markdown**: `table3_provider_state_accuracy.md`
- **Machine Formats**: `table3_provider_state_accuracy.json`, `table3_provider_state_accuracy.csv`
- **Content**: State accuracy distribution for Population C:
  - LAYA: $N=166$, Mean = 0.67, Median = 0.67, P25 = 0.50, P75 = 1.00, Min = 0.00, Max = 1.00, Sample SD = 0.30.
  - LLM: $N=175$, Mean = 0.49, Median = 0.50, P25 = 0.25, P75 = 0.67, Min = 0.00, Max = 1.00, Sample SD = 0.28.

### Table 4: Category-Level Results
- **Markdown**: `table4_category_results.md`
- **Machine Formats**: `table4_category_results.json`, `table4_category_results.csv`
- **Content**: Full operational breakdown across all 7 categories (NORMAL, PARTIAL_STATE, NO_OP, MULTI_DEVICE, CONTEXT_SENSITIVE, SECURITY, AMBIGUOUS), reporting cell counts, state accuracy, matched/missed/unnecessary actions, and decision latency.

### Table 5: High-Resolution Latency Statistics
- **Markdown**: `table5_latency_statistics.md`
- **Machine Formats**: `table5_latency_statistics.json`, `table5_latency_statistics.csv`
- **Content**: Detailed quantiles and moments for Decision Latency, Simulation Latency, Evaluation Latency, and Total Execution Latency for Population C.

### Table 6: Supported-Execution Failure Mechanisms
- **Markdown**: `table6_failure_mechanisms.md`
- **Machine Formats**: `table6_failure_mechanisms.json`, `table6_failure_mechanisms.csv`
- **Content**: Exact itemization of all 9 failed cells (Population D), documenting Provider, Scenario ID, Repetition Number, Category, Failure Classification, Pipeline Phase, and Error Message.

### Table 7: Scenario Completion Status
- **Markdown**: `table7_scenario_completion.md`
- **Machine Formats**: `table7_scenario_completion.json`, `table7_scenario_completion.csv`
- **Content**: Scenario-level completion census (5/5 full completion, partial completion, unsupported) across all 36 scenarios.
