# HomeMind — Context-Aware Multi-Device Smart Home Automation

**HomeMind** is a final-year engineering student research and simulation project designed to study and evaluate how a decision-oriented AI system (such as **Jev**) compares with conventional Large Language Models (**LLMs**) in handling complex, multi-device smart home automation.

> [!IMPORTANT]
> **100% Software-Simulated Smart Home — Zero Physical Hardware:**
> This project operates exclusively in software simulation. It does **NOT** use any physical IoT devices, microcontrollers (ESP32 / ESP8266 / Arduino), physical relays, MQTT broker hardware, or real-world sensors. All virtual devices, rooms, capabilities, telemetry, and clock contexts are executed purely in software.

---

## Current Status: Phase 1 — Smart Home Simulation Foundation (COMPLETE)

Phase 1 provides the foundational virtual environment, deterministic simulation engine, centralized device state management, manual override controls, and interactive dark-themed dashboard. 

> [!NOTE]
> **Provider-Independent AI Architecture:**
> Phase 1 intentionally contains **no artificial intelligence decision generation**. Neither Jev nor any LLM has been integrated yet, and no fake or hardcoded scenario responses are executed. The architecture defines strict, provider-independent interfaces (`DecisionEngine`, `DecisionResult`, `Action`) so that future phases can plug in real AI systems without altering the virtual simulation foundation.

---

## Project Roadmap

| Phase | Milestone | Status | Description |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Simulation Foundation** | **COMPLETE** | Virtual home, 18 devices, deterministic engine, state management, manual controls, dashboard UI |
| **Phase 2** | **Jev Decision Engine** | *NOT STARTED* | Integration of the decision-oriented Jev reasoning engine via `DecisionEngine` interface |
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

The automated test suite (`npm test`) covers 19 assertions across 4 test suites:
- **`simulationEngine.test.ts`**: Verifies turning lights ON/OFF/DIM, locking/unlocking doors, AC temperature setpoints & boundary rejections (e.g. 14°C or 35°C), fan speeds (0, 1, 2, 3), curtain position sliders, security arm/disarm, and action history logging.
- **`manualControls.test.ts`**: Verifies sequential manual action dispatching and central audit log updates.
- **`dashboardScenarios.test.ts`**: Verifies that scenario presets only populate natural language intents without mutating device states.
- **`devices.test.ts`**: Verifies exact device count (18 devices), room distributions (6 Living Room, 5 Bedroom, 2 Kitchen, 3 Entrance, 2 Study), and scenario catalog integrity.
