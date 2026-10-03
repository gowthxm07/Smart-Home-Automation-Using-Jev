# HomeMind Research Documentation Package

**Project**: HomeMind — Context-Aware Multi-Device Smart Home Automation  
**Release**: Academic Research Package (Milestone 3.23)  
**Experiment ID**: `exp_ctrl_1790945358821_ibkjxz`  
**Dataset Version**: `HomeMind-Eval-Dataset-v1.0` (36 Frozen Controlled Scenarios)  
**Dataset SHA-256 Hash**: `66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329`  
**Git Commit SHA**: `a996b9e6759b009fd630b9ae8ec5625d8aade12c`  
**Controlled Grid**: 36 scenarios $\times$ 2 active providers $\times$ 5 repetitions = **360 execution cells**  

---

## 1. Package Overview

This directory (`docs/research/`) contains the complete academic research documentation set for the HomeMind project. It synthesizes and presents the empirical results of a controlled evaluation comparing two local AI decision architectures:
1. **Laya (System-1)**: Convai Innovations non-autoregressive decision model (`laya-serve 0.3.20`, `english` checkpoint) on local CPU.
2. **Conventional LLM (Local Ollama)**: Meta's `llama3.2:3b` autoregressive language model (`temperature = 0.0`, structured JSON output) on local CPU.

All reporting adheres to strict scientific neutrality: metrics are reported independently, without composite scores, rankings, winner declarations, or unsupported causal claims.

---

## 2. Documentation Structure & Reading Guide

```
docs/research/
├── README.md                           <- This document: Overview and navigation guide
├── HOMEMIND_FINAL_RESEARCH_REPORT.md   <- Primary comprehensive academic research report
├── RESULTS_SUMMARY.md                  <- Concise executive summary for briefings and viva
├── REPRODUCIBILITY.md                  <- Step-by-step reproduction guide and audit procedures
├── ARTIFACT_INDEX.md                   <- Comprehensive index of all raw, summary, and visualization files
├── FIGURE_TABLE_REFERENCE.md           <- Scientific mapping and interpretation guide for Figures 1–12 and Tables 1–7
└── 3.22A_FORENSIC_RECONCILIATION.md    <- Forensic audit report verifying mathematical integrity of raw data
```

### Recommended Reading Paths
- **For an Academic Overview**: Read [`HOMEMIND_FINAL_RESEARCH_REPORT.md`](HOMEMIND_FINAL_RESEARCH_REPORT.md). It details the problem formulation, architecture, methodology, empirical results, research questions, discussion, and limitations.
- **For an Executive or Viva Briefing**: Read [`RESULTS_SUMMARY.md`](RESULTS_SUMMARY.md). It provides quick-reference metric tables and key takeaways.
- **For Experimental Reproduction & Audit**: Read [`REPRODUCIBILITY.md`](REPRODUCIBILITY.md). It specifies exact host requirements, daemon commands, execution workflows, and verification checks.
- **For Figure & Table Interpretation**: Read [`FIGURE_TABLE_REFERENCE.md`](FIGURE_TABLE_REFERENCE.md). It maps every visualization asset (`fig01`–`fig12`, `table1`–`table7`) to its canonical data source.
- **For Data Provenance & File Locations**: Read [`ARTIFACT_INDEX.md`](ARTIFACT_INDEX.md).

---

## 3. High-Level Empirical Summary

The controlled evaluation executed 360 cells across five mutually exclusive populations:
- **Population A (All Planned Cells)**: 360 cells (180 LAYA, 180 LLM).
- **Population B (Supported Executions)**: 350 cells (170 LAYA, 180 LLM).
- **Population C (Supported Successful Executions)**: 341 cells (166 LAYA, 175 LLM).
- **Population D (Supported Failures)**: 9 cells (4 LAYA CPU timeouts; 1 LLM cold-start timeout, 4 LLM entity hallucination validation failures).
- **Population E (Unsupported Rejections)**: 10 cells (Laya rejected `security-lockdown-01` and `ambiguous-night-ready-01` across all 5 repetitions via domain router).

### Core Performance Metrics (Population C: $N=341$)

| Metric Dimension | LAYA (System-1, $N=166$) | LLM (Ollama `llama3.2:3b`, $N=175$) |
|:---|:---:|:---:|
| **State Accuracy Ratio** (Mean ± SD, Median) | **0.67 ± 0.30**, Median: 0.67 | **0.49 ± 0.28**, Median: 0.50 |
| **Matched Required Actions** (Mean ± SD) | **1.60 ± 1.52** | **1.17 ± 1.38** |
| **Missed Required Actions** (Mean ± SD) | **1.29 ± 1.24** | **1.74 ± 1.52** |
| **Unnecessary Actions** (Mean ± SD) | **0.31 ± 0.46** | **2.02 ± 2.62** |
| **Executed Forbidden Actions** (Mean ± SD) | **0.00 ± 0.00** | **0.08 ± 0.27** |
| **Decision Latency** (Median, Mean, SD) | **34,880.84 ms** (36,488.06 ms, SD 5,109.70 ms) | **41,869.63 ms** (50,569.15 ms, SD 35,136.24 ms) |
| **Simulation Latency Mean** | **0.31 ms** | **1.16 ms** |
| **Evaluation Latency Mean** | **0.24 ms** | **0.65 ms** |
| **Pipeline Inference Share** | **>99.99%** | **>99.99%** |

---

## 4. Controlled Research Artifact Locations

The benchmark data and visualization artifacts referenced in this package reside in the repository as follows:
- **Raw Benchmark Data**:
  `artifacts/benchmarks/controlled-experiment-full_exp_ctrl_1790945358821_ibkjxz/`
  (`runs.jsonl`, `manifest.json`, `summary.json`)
- **Canonical Summaries**:
  `artifacts/analysis/controlled-experiment/`
  (`research_analysis.json`, `provider_summary.json`, `category_summary.json`, `failure_analysis.json`, `latency_summary.json`, `scenario_summary.json`)
- **Publication Tables**:
  `artifacts/analysis/controlled-experiment/visualizations/tables/` (`table1` through `table7` in `.md`, `.json`, `.csv`)
- **Publication Figures**:
  `artifacts/analysis/controlled-experiment/visualizations/figures/` (`fig01` through `fig12` in `.svg`)

---

## 5. Scientific Neutrality & Reporting Constraints

1. **Descriptive Protocol**: Findings document observed empirical measurements under the specified experimental conditions. No provider is declared a "winner" or ranked as "superior".
2. **Correlation vs. Causation**: Statistical correlations between actions, latency, and state accuracy ($|r| < 0.37$) do not imply causal relationships.
3. **Hardware Boundaries**: Latencies reflect local CPU execution and are not representative of cloud or GPU-accelerated endpoints.
4. **Academic Documentation Status**: This package represents a complete, internally validated academic research documentation set. It is an artifact repository, not a peer-reviewed external publication.
