# HomeMind — Context-Aware Multi-Device Smart Home Automation

**HomeMind** is a final-year engineering student research and simulation project designed to study and evaluate how a decision-oriented AI system (such as **Jev**) compares with conventional Large Language Models (**LLMs**) in handling complex, multi-device smart home automation.

> [!IMPORTANT]
> **100% Software-Simulated Smart Home — Zero Physical Hardware:**
> This project operates exclusively in software simulation. It does **NOT** use any physical IoT devices, microcontrollers (ESP32 / ESP8266 / Arduino), physical relays, MQTT broker hardware, or real-world sensors. All virtual devices, rooms, capabilities, telemetry, and clock contexts are executed purely in software.

---

## Current Status: Phase 3 — Evaluation & Baseline Infrastructure (In Progress)

- **Phase 1 (Simulation Foundation)**: COMPLETE and FROZEN.
- **Phase 2 — Milestone 2.1 (Jev Provider Foundation)**: COMPLETE. Server-side TypeSafe Jev API client, schemas, secret sanitization, adapter.
- **Phase 2 — Milestone 2.2 (First Real Jev Workflow: GOING_TO_SLEEP)**: COMPLETE. End-to-end Jev-driven smart home workflow with non-redundant policy action generation.
- **Phase 2 — Milestone 2.3 (Jev Decision Trace & Automation Visualization)**: COMPLETE. Dashboard observability panel with probability distributions, confidence ratings, and action history.
- **Phase 3 — Milestone 3.1 (Evaluation Data Model & Experiment Contract)**: COMPLETE. Provider-independent evaluation data models (`EvaluationScenario`, `ExpectedOutcome`, `ExpectedAction`, `EngineRun`, `EvaluationResult`, `EvaluationEngine`).
- **Phase 3 — Milestone 3.2 (Controlled Evaluation Scenario Dataset)**: COMPLETE. Controlled benchmark dataset of 36 provider-neutral scenarios across 7 categories.
- **Phase 3 — Milestone 3.3 (Generic Evaluation Execution Pipeline)**: COMPLETE. Provider-neutral execution runner (`evaluateScenario`, `evaluateScenarios`) with high-resolution latency telemetry and strict state isolation.
- **Phase 3 — Milestone 3.4 (Jev Benchmark Execution)**: COMPLETE. Automated benchmark execution layer with sanitized JSON artifact generation.
- **Phase 3 — Milestone 3.5 (Expand Jev Decision Coverage)**: COMPLETE. Expanded real TypeSafe Jev decision pipeline across 7 intent families covering 34 supported scenarios and 2 explicitly unsupported scenarios.
- **Phase 3 — Milestone 3.6 (Conventional LLM Decision Engine)**: COMPLETE.
  Introduced a provider-independent conventional LLM DecisionEngine powered by a local Ollama runtime (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`):
  - Strictly implements the provider-neutral `DecisionEngine` contract (`provider: "LLM"`, `id: "llm-ollama"`).
  - Pure local Ollama runtime via non-streaming `/api/chat` with JSON schema enforcement; zero cloud vendor SDKs, zero API keys, and zero paid inference dependencies.
  - Zero dataset contamination: prompt template receives only the user intent and current home device state context (IDs, room, category, state, and capabilities); zero access to scenario IDs, ground-truth outcomes, or evaluation logic.
  - Robust structured output validation: markdown code block stripping, JSON schema parsing, 18-device registry validation, and 14-action capability/boundary enforcement.
  - State-aware redundancy normalization: actions matching existing device state are skipped and preserved in execution metadata (`skippedRedundantActions`).
  - Strict zero-fallback error propagation: rejects any fallback to Jev, hardcoded rules, or fake mock actions if Ollama fails.
  - **LLM-vs-Jev comparison is not yet implemented.** No comparison experiments, rankings, composite scores, or winner metrics exist.

> [!NOTE]
> **Research Integrity & Provider Independence:**
> The evaluation contracts, scenario dataset, and execution runner are strictly decoupled from any specific AI provider or model. They observe output actions and final simulated states without bias. **LLM-vs-Jev comparison is not yet implemented.**

---

## Project Roadmap

| Phase | Milestone | Status | Description |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Simulation Foundation** | **COMPLETE** | Virtual home, 18 devices, deterministic engine, state management, manual controls, dashboard UI |
| **Phase 2** | **Jev Decision Engine** | **COMPLETE** | TypeSafe Jev API integration, GOING_TO_SLEEP workflow, non-redundant policy, decision trace dashboard |
| **Phase 3** | **Evaluation & Baseline Infrastructure** | **IN PROGRESS** | **Milestones 3.1–3.4 Complete**: Data model, 36 scenarios, execution pipeline, Jev benchmark<br>**Milestone 3.5 Complete**: Expanded Jev decision coverage across 7 intent families (34 supported, 2 unsupported)<br>**Milestone 3.6 Complete**: Conventional LLM Decision Engine via local Ollama baseline (zero comparison, zero rankings)<br>*Next*: Comparative evaluation execution |
| **Phase 4** | **Jev vs. LLM Comparison** | *NOT STARTED* | Side-by-side automated benchmarking across scenario matrices |
| **Phase 5** | **Evaluation & Analytics** | *NOT STARTED* | Latency, token cost, decision accuracy, and state consistency metrics |
| **Phase 6** | **Final Demonstration** | *NOT STARTED* | Final presentation walkthrough, project defense artifacts, and documentation polish |

---

## Architectural Pipeline

To preserve scientific rigor in future comparisons, both Jev and LLMs will interact with the virtual home through the exact same action pipeline:

```
                  User Intent (Natural Language)
                                │
                                ▼
                       DecisionEngine (Interface)
                        │                     │
                        ▼ (Phase 2)           ▼ (Phase 3)
                JevDecisionEngine      LLMDecisionEngine
                        │                     │
                        └──────────┬──────────┘
                                   ▼
                             DecisionResult
                                   ▼
                                Action[]
                                   ▼
                           SimulationEngine
                   (Deterministic Validator & State Machine)
                                   ▼
                         Central HomeState
                   (18 Virtual Devices across 5 Rooms)
```

### Core Architecture Components:
- **`DecisionEngine` Interface** (`src/types/engine.ts`): Unified contract implemented by both Jev and LLM engines in subsequent phases.
- **`Action` Model** (`src/types/action.ts`): Typed atomic commands specifying `deviceId`, `actionType`, `value`, `source` (`MANUAL` | `JEV` | `LLM` | `SYSTEM`), and `timestamp`.
- **`SimulationEngine`** (`src/lib/simulationEngine.ts`): Pure, deterministic state machine that validates device existence, capability constraints, and boundary conditions before immutably applying state transitions.
- **`HomeContext`** (`src/context/HomeContext.tsx`): React Context providing a single source of truth for the entire application, eliminating disconnected component state.
- **`SimulationClock`** (`src/components/layout/SimulationClock.tsx`): Controllable simulation clock supporting real-time sync, simulated speed multipliers (1x, 5x, 60x), and time-advance offsets.

---

## Simulated Environment Specifications

### 5 Virtual Rooms
1. **Living Room**: Main entertaining space with AC, TV, motorized curtains, lighting, and power outlets.
2. **Bedroom**: Rest quarters with dimmable ceiling light, warm night lamp, multi-speed ceiling fan, motorized blackout curtains, and phone charger.
3. **Kitchen**: High-draw food preparation area with general smart plug and ceiling panel lighting.
4. **Entrance**: Access control foyer with motorized deadbolt lock, whole-home security system, and foyer spotlights.
5. **Study / Work Area**: Productivity office with focused desk task lighting and workstation laptop power outlet.

### 18 Simulated Virtual Devices

| # | Device ID | Device Name | Room | Category | Supported Capabilities / State Model |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `light_living_room` | Living Room Light | Living Room | `LIGHT` | Power Toggle, Dimmable (0–100%) |
| 2 | `light_bedroom` | Bedroom Light | Bedroom | `LIGHT` | Power Toggle, Dimmable (0–100%) |
| 3 | `light_kitchen` | Kitchen Light | Kitchen | `LIGHT` | Power Toggle, Dimmable (0–100%) |
| 4 | `light_entrance` | Entrance Light | Entrance | `LIGHT` | Power Toggle, Dimmable (0–100%) |
| 5 | `light_night_lamp` | Night Lamp | Bedroom | `LIGHT` | Power Toggle, Dimmable (Soft 20% default) |
| 6 | `light_study` | Study Light | Study | `LIGHT` | Power Toggle, Dimmable (0–100%) |
| 7 | `tv_living_room` | Living Room TV | Living Room | `ENTERTAINMENT` | Power Toggle, Active/Standby state |
| 8 | `ac_living_room` | Living Room AC | Living Room | `CLIMATE` | Power Toggle, Setpoint (16°C–30°C), Modes (`COOL`, `HEAT`, `ECO`, `FAN`) |
| 9 | `fan_bedroom` | Bedroom Fan | Bedroom | `CLIMATE` | Power Toggle, Discrete Speeds (0 = OFF, 1, 2, 3) |
| 10 | `thermostat_living_room` | Thermostat | Living Room | `CLIMATE` | Ambient Temp Monitor, Target Setpoint (16°C–30°C) |
| 11 | `lock_main_door` | Main Door Lock | Entrance | `SECURITY` | Motorized Deadbolt (`LOCKED`, `UNLOCKED`) |
| 12 | `security_system` | Security System | Entrance | `SECURITY` | Whole-Home Alarm (`ARMED STAY`, `ARMED AWAY`, `DISARMED`) |
| 13 | `curtain_living_room` | Living Room Curtains | Living Room | `CURTAIN` | Motorized Track (`OPEN`, `CLOSED`, 0–100% position) |
| 14 | `curtain_bedroom` | Bedroom Curtains | Bedroom | `CURTAIN` | Motorized Blackout Track (`OPEN`, `CLOSED`, 0–100% position) |
| 15 | `plug_phone_charger` | Phone Charger | Bedroom | `POWER` | Smart Plug Toggle, Telemetry (0–25W draw) |
| 16 | `plug_laptop_charger` | Laptop Charger | Study | `POWER` | Smart Plug Toggle, Telemetry (0–100W draw) |
| 17 | `plug_tv_outlet` | TV Power Outlet | Living Room | `POWER` | Smart Plug Toggle, Telemetry (0–250W draw) |
| 18 | `plug_kitchen_general` | General Smart Plug | Kitchen | `POWER` | Smart Plug Toggle, Telemetry (0–2000W draw) |

---

## 7 Predefined Automation Scenarios

Scenarios represent pure natural-language intent templates. To comply with architectural requirements, **no scenario executes hardcoded actions**. Selecting a scenario populates the user intent box:

1. **Going to Sleep**: `"I'm going to sleep."` — Prepares bedroom rest context.
2. **Leaving Home**: `"I'm leaving home."` — Vacating context.
3. **Movie Night**: `"Movie night."` — Entertainment & media context.
4. **Working**: `"I'm going to work."` — Focused workstation productivity context.
5. **Coming Home**: `"I'm coming home."` — Foyer arrival and welcoming context.
6. **Relaxing**: `"I want to relax."` — Comfort lounge context.
7. **Waking Up**: `"I'm waking up."` — Morning rise context.

---

## Controlled Evaluation Dataset (Phase 3)

The evaluation suite incorporates a controlled dataset of **36 provider-independent benchmark scenarios** designed for future comparative experiments between decision-oriented AI (Jev) and conventional LLMs:

- **Provider-Neutral Design**: Every scenario is formulated strictly in terms of the virtual smart home and expected device behaviors, with zero provider-specific assumptions, vendor identifiers, or scores.
- **Deterministic Initial States**: Each test case initializes the virtual home in a known, reproducible `HomeState` snapshot using the 18 standard devices.
- **Decoupled Expected Outcomes**: Distinguishes target device states from required action demands (`REQUIRED`, `FORBIDDEN`, `OPTIONAL`), enabling precise measurement of both state correctness and redundant action avoidance.
- **Categorical Diversity**:
  1. **Normal Intent Scenarios (6)**: Standard multi-device workflows (sleep, departure, movie, work, arrival, wake).
  2. **Partial-State Scenarios (6)**: Environments where certain devices are already in target states, validating non-redundancy.
  3. **No-Op Scenarios (5)**: Scenarios where the home is already in the optimal state, verifying zero-action restraint.
  4. **Multi-Device Scenarios (6)**: Coordinated automation spanning multiple rooms, device categories, and load types.
  5. **Context-Sensitive Scenarios (5)**: Decisions dependent on existing state context (e.g. fan speed modulation, unoccupied climate shutdown).
  6. **Safety & Security Scenarios (4)**: Strict perimeter verification forbidding hazardous actions (e.g. unlocking exterior doors during sleep).
  7. **Ambiguous / Varied Phrasings (4)**: Natural-language variations with objectively bounded target expectations.

---

## Generic Evaluation Execution Pipeline (Phase 3)

HomeMind features a fully provider-neutral execution runner (`evaluateScenario`, `evaluateScenarios`) that executes evaluation scenarios against any arbitrary `DecisionEngine`:

- **Strict State Isolation**: Deep cloning ensures the scenario's initial `HomeState` is immutable, preventing cross-scenario state leakage.
- **Standardized Execution Lifecycle**: Invokes `DecisionEngine.evaluate()`, validates `DecisionResult`, executes actions via `SimulationEngine`, computes outcomes via `StandardEvaluationEngine`, and preserves `EngineRun` and `EvaluationResult`.
- **High-Resolution Latency Telemetry**: Captures `decisionLatencyMs`, `simulationLatencyMs`, `evaluationLatencyMs`, and `totalExecutionLatencyMs` via high-precision timestamps.
- **Strict Evaluation Integrity & Robust Error Handling**: Any simulation error rejects invalid actions and immediately fails execution via `EvaluationRunnerError` (phase `"SIMULATION"` by default), strictly preventing rejected actions from ever generating a misleading normal benchmark `EvaluationResult`. Configurable `throwOnSimulationError: false` explicitly returns `success: false` and `evaluationResult: null`.
- **Zero Vendor Bias**: Provider-agnostic execution containing 0 vendor SDK imports, 0 provider branches, and 0 overall scores or subjective rankings.

---

## Jev Benchmark Execution (Phase 3)

HomeMind includes a dedicated, reproducible benchmark execution layer (`runJevBenchmark`) for the real TypeSafe Jev decision engine:

- **Controlled Dataset Reference**: Executes across the complete 36-scenario controlled dataset established in Milestone 3.2.
- **Honest Capability Identification**: Genuinely supported Jev workflows across 7 intent families (`GOING_TO_SLEEP`, `LEAVING_HOME`, `MOVIE_NIGHT`, `WORKING`, `COMING_HOME`, `RELAXING`, `WAKING_UP`, covering 34 scenarios) are executed through the engine.
- **Explicit Unsupported Classification**: The remaining 2 scenarios (`security-lockdown-01`, `ambiguous-night-ready-01`) are recorded as `UNSUPPORTED` with descriptive explanations. Zero actions are fabricated and no fake fallback policies are invoked.
- **Generic Pipeline Integration**: Supported scenarios run through the generic `evaluateScenario` pipeline and `SimulationEngine`, preserving all independent multi-dimensional evaluator metrics.
- **Independent Descriptive Statistics**: Reports independent action counts (matched, missed, forbidden, unnecessary) and high-resolution latencies (mean/median decision and total execution latencies). Zero composite scores, zero rankings, and zero winner declarations.
- **Separation of Concerns**: Unit tests (`npm test`) validate benchmark mechanics using offline fixtures without network calls or secrets. Real benchmark execution is triggered explicitly via `npm run benchmark:jev` and requires `TYPESAFE_API_KEY`.
- **Sanitized Artifact Persistence**: Benchmark runs output reproducible JSON reports to `artifacts/benchmarks/`, verified to contain zero secrets or credentials.

---

## Conventional LLM Decision Engine (Milestone 3.6)

HomeMind provides a conventional LLM baseline decision engine implemented via a local Ollama runtime, conforming to the exact same provider-independent `DecisionEngine` interface as Jev:

- **Provider-Independent Interface**: Implements `DecisionEngine` with `provider: "LLM"` and `id: "llm-ollama"`. Returns standardized `DecisionResult` with `source: "LLM"`.
- **Pure Local Ollama Runtime**: Connects via HTTP to a local Ollama instance (default `http://127.0.0.1:11434`) using non-streaming `/api/chat` with JSON format enforcement. Zero cloud vendor SDKs (no OpenAI, Anthropic, Gemini, or OpenRouter), zero API keys, and zero paid inference costs.
- **Dataset Decoupling & Research Integrity**: The LLM prompt context receives strictly the natural-language user intent and the current virtual home device state (device ID, name, room, category, current state, and capabilities). It has **zero access** to scenario IDs, required/forbidden/optional action rules, ground truth states, or benchmark evaluation contracts.
- **Strict Structured Output & Multi-Stage Validation**:
  1. *Markdown Stripping*: Robustly strips markdown code fences (````json ... ````) and extracts valid JSON.
  2. *Schema Validation*: Verifies top-level structure (`intent`, `reasoning`, `actions[]`), action structure (`deviceId`, `actionType`, `value`, `reasoning`), and rejects non-array or extra invalid properties.
  3. *Device Existence Validation*: Every referenced device ID is validated against the 18 registered HomeMind virtual devices.
  4. *Action Capability & Value Validation*: Validates all 14 action types against device capabilities (e.g., `SET_BRIGHTNESS` requires dimmable light, `SET_TEMPERATURE` bound to 16°C–30°C, `SET_SPEED` bound to 0–3, `SET_POSITION` bound to 0–100%).
- **State-Aware Redundancy Normalization**: Consistent with the Jev policy architecture, actions targeting already-achieved device states (e.g., locking an already locked door) are omitted from execution and recorded in `metadata.skippedRedundantActions`.
- **Zero Fallback Integrity**: Errors (network drops, HTTP errors, timeouts, malformed JSON, schema violations, invalid devices) propagate immediately as typed errors (`OllamaError`, `LLMError`). The engine never falls back to Jev, hardcoded rules, or fabricated mock actions.
- **Important**: **LLM-vs-Jev comparison is not yet implemented.** No comparative benchmarks, rankings, composite scores, or winner metrics exist in this milestone.

---

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (Strict mode enabled, zero `any`)
- **Styling**: Tailwind CSS (Custom dark engineering palette with glassmorphism)
- **Icons**: Lucide React
- **Test Runner**: Vitest

---

## Getting Started

### Prerequisites
- Node.js >= 18.x (Developed on v22.19.0)
- npm >= 9.x

### Environment Configuration

#### 1. TypeSafe Jev API (Phase 2 & Milestone 3.5)
The TypeSafe Jev API integration requires a server-side API key.

> [!CAUTION]
> **Server-Side Secret Only**: Never prefix the key with `NEXT_PUBLIC_` or reference it in client components. The client architecture sanitizes credentials and strips secrets from all logs and error messages.

1. Copy the example configuration template:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your TypeSafe API key:
   ```env
   TYPESAFE_API_KEY=your_actual_api_key_here
   ```
*(Note: `.env.local` is ignored by Git and will never be committed).*

#### 2. Local Ollama LLM Runtime (Milestone 3.6)
The conventional LLM DecisionEngine connects to a local Ollama instance without requiring any cloud API key or paid tokens:
- **`OLLAMA_BASE_URL`**: Base URL for local Ollama HTTP API (defaults to `http://127.0.0.1:11434`).
- **`OLLAMA_MODEL`**: Model identifier installed in local Ollama (defaults to `llama3.2:3b`).

Make sure Ollama is installed and running locally:
```bash
ollama run llama3.2:3b
```
*(Optional `.env.local` configuration for custom endpoint/model)*:
```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

### Installation
```bash
git clone https://github.com/gowthxm07/Smart-Home-Automation-Using-Jev.git
cd Smart-Home-Automation-Using-Jev
npm install
```

### Running the Application Locally
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
npm run build
npm run start
```

### Running Automated Tests
```bash
npm test
```

### TypeScript Validation
```bash
npm run typecheck
```

### Running the Jev Benchmark (Milestone 3.4)
```bash
npm run benchmark:jev
```
*(Requires `TYPESAFE_API_KEY` in environment or `.env.local`)*

---

## Verification & Testing Coverage

The automated test suite (`npm test`) covers **143 assertions across 17 test suites**:
- **`llmDecisionEngine.test.ts`** (21 tests): Verifies `LLMDecisionEngine` against the provider-independent `DecisionEngine` contract, valid action generation, multi-device actions, no-op handling, markdown code block stripping, malformed JSON rejection, schema validation errors, unknown device ID rejection, invalid action type rejection, out-of-bounds value validation, strict error propagation with zero fallback, absence of fabricated confidence (`confidence: undefined`), preservation of raw validated `proposedActions` alongside `skippedRedundantActions`, provider metadata and latency capture, home state immutability, generic `EvaluationRunner` end-to-end integration, and architectural independence guardrail (asserting zero imports from `@/lib/evaluation`, `@/lib/policies`, `@/lib/jev`, or `@/lib/typesafe`).
- **`ollamaClient.test.ts`** (10 tests): Verifies local `OllamaClient` initialization, default/custom configurations, non-streaming `/api/chat` with JSON format, model listing (`/api/tags`), health checking, timeout abort handling (`OllamaTimeoutError`), connection failure handling (`OllamaConnectionError`), HTTP error mapping (`OllamaApiError`), and missing model detection.
- **`expandedJevPolicies.test.ts`** (17 tests): Verifies expanded Jev decision policies across all 7 supported intent families (`GOING_TO_SLEEP`, `LEAVING_HOME`, `MOVIE_NIGHT`, `WORKING`, `COMING_HOME`, `RELAXING`, `WAKING_UP`), redundant action skipping, context sensitivity, and zero imports from evaluation dataset.
- **`jevBenchmark.test.ts`** (11 tests): Verifies Jev benchmark execution across the controlled 36-scenario dataset, honest capability classification (34 supported, 2 unsupported), zero action fabrication for unsupported scenarios, preservation of generic EvaluationResult metrics, latency telemetry, state isolation, engine ID retention, structured trace metadata attachment, safe error handling (SUPPORTED_FAILURE on API/simulation errors), credential sanitization, and independence of aggregate statistics.
- **`evaluationRunner.test.ts`** (13 tests): Verifies the generic evaluation execution pipeline (`evaluateScenario`, `evaluateScenarios`), unmutated initial state isolation across consecutive executions, action application via `SimulationEngine`, timing telemetry (`decisionLatencyMs`, `simulationLatencyMs`, `evaluationLatencyMs`, `totalExecutionLatencyMs`), simulation rejection integrity (default throw, explicit throw, and non-throwing `success: false` / `evaluationResult: null` mode), structured `EvaluationRunnerError` propagation, no-op execution validation, multi-scenario dataset subset runs, and source code proof of zero vendor SDK imports or branching.
- **`evaluationDataset.test.ts`** (10 tests): Verifies the 36-scenario controlled evaluation dataset, uniqueness of IDs, adherence to 7 categories, device and action validity against HomeMind configuration, independence of initial states, absence of vendor bias, and absence of overall scores/winners.
- **`evaluationContract.test.ts`** (10 tests): Verifies provider-neutral evaluation contracts (`EvaluationScenario`, `ExpectedOutcome`, `ExpectedAction`, `EngineRun`, `EvaluationResult`), separation of expected device states from expected actions, action requirement semantics (`REQUIRED`, `FORBIDDEN`, `OPTIONAL`), acceptable alternatives representation, independent metric preservation without overall scores or winners, provider independence, and complete data immutability.
- **`jevDecisionTracePanel.test.ts`** (5 tests): Verifies Jev trace dashboard rendering in all execution states (`IDLE`, `EVALUATING`, `COMPLETED`, `ERROR`), Noul percentage bars, Choice distributions, confidence ratings, applied generated actions list, skipped redundant actions list, and confirms zero fabricated fake probabilities.
- **`jevApiRoute.test.ts`** (4 tests): Verifies server-side route `/api/jev/evaluate` input validation (intent and homeState required), successful decision result propagation, secure error handling without credential leakage, and 400/500 status codes.
- **`jevGoingToSleepWorkflow.test.ts`** (4 tests): End-to-end integration tests verifying the full decision pipeline (`JevDecisionEngine` -> `GoingToSleepPolicy` -> `Action[]` -> real `SimulationEngine` -> updated `HomeState` and audit history), probability/confidence preservation, malformed response rejection, API failure handling without fake decisions, and scenario isolation.
- **`goingToSleepPolicy.test.ts`** (5 tests): Focused tests on the `GoingToSleepPolicy` rules: all relevant device action generation (`source: 'JEV'`), redundant action elimination (no-op when devices already in target state), Noul negative decision handling, choice fan speed mapping, and safe rejection of unsupported choices.
- **`typesafeClient.test.ts`** (10 tests): Verifies TypeSafe Jev API communication (`POST /v1/systemone`, `GET /v1/models`), Bearer token headers, HTTP 401/403 auth error handling, HTTP 422 validation detail extraction, HTTP 500 error mapping, malformed JSON handling, typed primitive response preservation (`noul`, `choice`, `score`), and API key sanitization/redaction from error messages.
- **`jevDecisionEngine.test.ts`** (4 tests): Verifies that `JevDecisionEngine` conforms to the existing `DecisionEngine` contract, validates server configuration, preserves structured Jev metadata, and executes health checks.
- **`simulationEngine.test.ts`** (13 tests): Verifies turning lights ON/OFF/DIM, locking/unlocking doors, AC temperature setpoints & boundary rejections (e.g. 14°C or 35°C), fan speeds (0, 1, 2, 3), curtain position sliders, security arm/disarm, and action history logging.
- **`devices.test.ts`** (3 tests): Verifies exact device count (18 devices), room distributions (6 Living Room, 5 Bedroom, 2 Kitchen, 3 Entrance, 2 Study), and scenario catalog integrity.
- **`dashboardScenarios.test.ts`** (2 tests): Verifies that scenario presets only populate natural language intents without mutating device states.
- **`manualControls.test.ts`** (1 test): Verifies sequential manual action dispatching and central audit log updates.


