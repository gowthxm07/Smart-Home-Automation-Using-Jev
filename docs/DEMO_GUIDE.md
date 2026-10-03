# HomeMind Final Demo Guide

**Faculty & Reviewer Demonstration Operational Manual**  
**Project**: HomeMind — Context-Aware Multi-Device Smart Home Automation  
**Release**: Final Frozen Release (v1.0-final)  
**Experiment Reference**: `exp_ctrl_1790945358821_ibkjxz`  
**Host Application**: Next.js 14 / TypeScript Local Simulation Dashboard  

---

## 1. Demo Objective

The primary objective of this demonstration is to showcase **HomeMind's software-simulated, context-aware smart home execution and evaluation platform** to evaluators and faculty.

### What Evaluators Should Observe:
1. **Interactive Virtual Home Environment**: A complete software-defined home topology (18 virtual devices across 5 rooms: Living Room, Bedroom, Kitchen, Office, Hallway) operating without any physical IoT hardware.
2. **Context-Aware Intent Translation**: How natural language intents are translated into structured device state mutations conditioned on the current physical `HomeState`.
3. **Comparative Multi-Provider Execution**: Independent, side-by-side execution of two distinct AI architectures:
   - **Laya (System-1)**: Fast non-autoregressive classification model.
   - **Conventional LLM (Local Ollama)**: Autoregressive structured JSON generator (`llama3.2:3b`).
4. **Deterministic World-Model Simulation**: Microsecond-level state transitions executed by `SimulationEngine`.
5. **Provider-Neutral Evaluation**: Objective action-level grading and final-state accuracy scoring executed by `StandardEvaluationEngine`.
6. **Live Research Trace & Metrics**: Observable decision latency, action parsimony (unnecessary actions), and state agreement.

> [!IMPORTANT]
> **Demo Scope Clarification**:
> HomeMind is an autonomous smart-home execution simulator. It operates entirely on the desktop laptop via the web browser dashboard (`http://localhost:3000`). It does **NOT** require physical smart plugs, relays, ESP32 microcontrollers, or telephone/receptionist integrations.

---

## 2. Environment & System Checklist

Before commencing the demonstration, verify that the required software dependencies and provider daemons are operational on the host machine:

| Component | Required Version / Tag | Verification Command | Expected Operational State |
|:---|:---|:---|:---|
| **Node.js** | v20.x or v22.x LTS | `node -v` | v20.x or v22.x installed |
| **npm** | v10.x | `npm -v` | v10.x installed |
| **Laya Service** | `laya-serve 0.3.20` (`english`) | `curl -s http://127.0.0.1:8080/health` | HTTP 200 `{"status": "ok"}` |
| **Ollama Service** | Ollama local daemon | `curl -s http://127.0.0.1:11434/api/tags` | JSON array containing `llama3.2:3b` |
| **Web Browser** | Chrome, Edge, or Firefox | Open browser window | Ready to navigate to `localhost:3000` |

---

## 3. Step-by-Step Startup Sequence

Execute the following commands in order across separate terminal windows:

### Step 1: Start Laya System-1 Daemon (Terminal 1)
```powershell
# Start local Laya inference daemon on port 8080
laya-serve --model english --port 8080
```
*Verification*: Endpoint `http://127.0.0.1:8080` is listening.

### Step 2: Start Ollama LLM Service (Terminal 2)
```powershell
# Start local Ollama daemon
ollama serve
```
*Verification*: Run `ollama list` to confirm `llama3.2:3b` is present. If missing, run `ollama pull llama3.2:3b`.

### Step 3: Launch HomeMind Web Application (Terminal 3)
```powershell
cd "D:\Home simulator using Jev"

# Start Next.js development server
npm run dev
```
*Verification*: Terminal displays: `Ready in ... ms` on `http://localhost:3000`.

### Step 4: Open Browser
Navigate to:
```
http://localhost:3000
```
The HomeMind interactive floor plan and comparative automation dashboard will load.

---

## 4. Recommended Demonstration Scenarios

Demonstrate the system using the preset scenarios mapped directly to frozen benchmark dataset scenarios:

```
+--------------------------------------------------------------------------------+
| Preset Button    | Mapped Scenario ID | Category      | Core Behavioral Focus  |
|:-----------------|:-------------------|:--------------|:-----------------------|
| 1. GOING_TO_SLEEP| normal-sleep-01    | NORMAL        | Multi-room shutdown    |
| 2. LEAVING_HOME  | normal-leave-01    | NORMAL        | Perimeter & climate    |
| 3. MOVIE_NIGHT   | normal-movie-01    | NORMAL        | Ambience & TV actuation|
| 4. WORKING       | normal-work-01     | NORMAL        | Office focus lights    |
| 5. COMING_HOME   | normal-arrive-01   | NORMAL        | Entryway disarm & light|
| 6. RELAXING      | multi-relax-01     | MULTI_DEVICE  | Multi-zone coordination|
| 7. WAKING_UP     | normal-wake-01     | NORMAL        | Morning routine        |
+--------------------------------------------------------------------------------+
```

### Walkthrough Script for Scenario 1: `GOING_TO_SLEEP`
1. **Show Initial State**: Point out that living room lights are ON, bedroom lights are ON, TV is ON, and front door is LOCKED.
2. **Trigger Automation**: Click the **"Going to Sleep"** preset button (or type `"I'm going to sleep."`).
3. **Click "Run Automation"**: Observe the live comparative execution.
4. **Explain Pipeline Output**:
   - Both Laya and LLM receive identical initial state clones.
   - Laya emits actions turning OFF living room lights, turning OFF TV, and setting bedroom lights to DIM.
   - `SimulationEngine` applies actions in $<1$ ms, mutating the virtual device states.
   - `StandardEvaluationEngine` grades actions against frozen ground truth (`normal-sleep-01`).
   - The UI displays the updated floor plan and decision traces.

---

## 5. What to Explain While Demonstrating

When guiding faculty or evaluators through a run, articulate the following technical execution points:

1. **State-Conditioned Decision Making**:
   - "HomeMind does not execute static scripts. The AI models receive the complete current state of all 18 devices in JSON format along with the natural language prompt."
2. **Action Parsimony & Redundancy Suppression**:
   - "Notice how the system avoids unnecessary actions. If a door is already locked, a state-aware model does not issue a redundant lock command."
3. **Execution Pipeline Latency Composition**:
   - "Notice the timing breakdown panel: Decision inference takes several seconds on CPU, while deterministic world-model simulation takes less than 1 millisecond. Neural compute is the sole bottleneck."
4. **Independent Comparative Evaluation**:
   - "The two engines are executed strictly independently on deep-cloned states. There is zero action merging and zero fallback. Both are evaluated by the same neutral rule engine."

---

## 6. Research Comparison Demonstration

To show the comparative research capabilities:
1. Navigate to `/research` in the browser (or view the Comparative Evaluation tab on the main dashboard).
2. Point out:
   - **Multi-Engine Mode**: Shows side-by-side telemetry for LAYA and LLM.
   - **Action Distribution Comparison**: Displays matched required actions vs. unnecessary actions.
   - **State Accuracy Ratio**: Displays the proportion of devices that achieved the intended target state.
   - **Trace Inspection**: Expand the raw decision trace to view the exact JSON payload returned by each model.

---

## 7. Handling Offline Services & Graceful Degradation

If one of the local AI daemons is not running during the demonstration, HomeMind handles it gracefully:

### If Laya Is Unavailable:
- The UI displays a red badge: `LAYA: UNAVAILABLE_SERVICE`.
- The explanation text states: *"Laya server unreachable at http://127.0.0.1:8080. Start local daemon via: laya-serve"*.
- The LLM configuration continues to execute independently. **No silent fallback or artificial proxy substitution occurs.**

### If Ollama Is Unavailable:
- The UI displays: `LLM: UNAVAILABLE_SERVICE`.
- Laya continues to execute independently.

---

## 8. Latency Behavior Explanation for Evaluators

If an evaluator asks why local inference takes 30–50 seconds:
- **Factual Explanation**:
  - *"Both models are running purely locally on consumer CPU hardware without dedicated GPU acceleration."*
  - *"Laya performs PyTorch CPU inference on ModernBERT-large (421M parameters), averaging ~36 seconds per decision."*
  - *"Ollama performs autoregressive token generation for llama3.2:3b on CPU, averaging ~50 seconds per decision."*
  - *"In production edge deployments with dedicated NPU or GPU acceleration, these forward passes typically execute in under 100 milliseconds."*

---

## 9. Failure Recovery Procedures

If an unexpected error occurs during live demonstration:

1. **Reset Home State**: Click the **"Reset State"** button in the dashboard header to restore all 18 devices to default factory states.
2. **Restart Web Server**: If the web page freezes, press `Ctrl+C` in Terminal 3 and rerun `npm run dev`.
3. **Re-verify Daemon Endpoints**:
   - Check `http://127.0.0.1:8080/health` in browser.
   - Check `http://127.0.0.1:11434/api/tags` in browser.
4. **Data Safety Guarantee**: Live UI interactions mutate only in-memory React state. **The frozen benchmark artifacts in `artifacts/benchmarks/` are read-only and cannot be corrupted by UI usage.**
