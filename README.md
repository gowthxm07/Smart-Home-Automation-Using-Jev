# HomeMind — Context-Aware Multi-Device Smart Home Automation

**HomeMind** is a final-year engineering student research and simulation project designed to study and evaluate how a decision-oriented AI system (such as **Jev**) compares with conventional Large Language Models (**LLMs**) in handling complex, multi-device smart home automation.

> [!IMPORTANT]
> **100% Software-Simulated Smart Home — Zero Physical Hardware:**
> This project operates exclusively in software simulation. It does **NOT** use any physical IoT devices, microcontrollers (ESP32 / ESP8266 / Arduino), physical relays, MQTT broker hardware, or real-world sensors. All virtual devices, rooms, capabilities, telemetry, and clock contexts are executed purely in software.

---

## Current Status: Phase 2 — Jev Decision Engine Integration (In Progress)

- **Phase 1 (Simulation Foundation)**: COMPLETE and FROZEN.
- **Phase 2 — Milestone 2.1 (Jev Provider / API Integration Foundation)**: IMPLEMENTED.
  Establishes the server-side TypeSafe Jev client (`POST /v1/systemone`, `GET /v1/models`), structured decision primitive models (`noul`, `choice`, `score`), secret sanitization, and `JevDecisionEngine` adapter conforming to `DecisionEngine`.

> [!NOTE]
> **Zero Fake AI & Intent-Only Scenarios:**
> In Milestone 2.1, the API communication foundation is real and strictly server-side. No synthetic or mocked probabilities are generated in production code, and smart-home scenario decision policies (e.g. `GOING_TO_SLEEP`) remain intent-only templates without hardcoded device actions.

---

## Project Roadmap

| Phase | Milestone | Status | Description |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Simulation Foundation** | **COMPLETE** | Virtual home, 18 devices, deterministic engine, state management, manual controls, dashboard UI |
| **Phase 2** | **Jev Decision Engine** | **IN PROGRESS** | **Milestone 2.1 Complete**: Server-side TypeSafe Jev API client, types, error sanitization, adapter |
| **Phase 3** | **LLM Baseline** | *NOT STARTED* | Integration of prompt-engineered LLM baseline (e.g. Gemini / OpenAI) for comparison |
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

### Environment Configuration (Phase 2)
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

---

## Verification & Testing Coverage

The automated test suite (`npm test`) covers **33 assertions across 6 test suites**:
- **`typesafeClient.test.ts`** (10 tests): Verifies TypeSafe Jev API communication (`POST /v1/systemone`, `GET /v1/models`), Bearer token headers, HTTP 401/403 auth error handling, HTTP 422 validation detail extraction, HTTP 500 error mapping, malformed JSON handling, typed primitive response preservation (`noul`, `choice`, `score`), and API key sanitization/redaction from error messages.
- **`jevDecisionEngine.test.ts`** (4 tests): Verifies that `JevDecisionEngine` conforms to the existing `DecisionEngine` contract, validates server configuration, preserves structured Jev metadata, and executes health checks.
- **`simulationEngine.test.ts`** (13 tests): Verifies turning lights ON/OFF/DIM, locking/unlocking doors, AC temperature setpoints & boundary rejections (e.g. 14°C or 35°C), fan speeds (0, 1, 2, 3), curtain position sliders, security arm/disarm, and action history logging.
- **`devices.test.ts`** (3 tests): Verifies exact device count (18 devices), room distributions (6 Living Room, 5 Bedroom, 2 Kitchen, 3 Entrance, 2 Study), and scenario catalog integrity.
- **`dashboardScenarios.test.ts`** (2 tests): Verifies that scenario presets only populate natural language intents without mutating device states.
- **`manualControls.test.ts`** (1 test): Verifies sequential manual action dispatching and central audit log updates.

