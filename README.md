# HomeMind — Context-Aware Multi-Device Smart Home Automation

HomeMind is a final-year engineering research and simulation project designed to study and evaluate how a decision-oriented AI system (such as Jev) compares with conventional LLM approaches in handling complex, context-aware, multi-device smart home automation.

> [!IMPORTANT]
> **100% Software-Simulated Environment**: This project does **NOT** use any physical IoT devices, ESP32 microcontrollers, Arduino boards, MQTT hardware relays, or physical sensors. All devices, capabilities, telemetry, and room contexts are simulated entirely in software.

---

## Current Status: Phase 1 — Smart Home Simulation Foundation

Phase 1 establishes the core architectural foundation, deterministic simulation engine, centralized device states, manual override controls, and interactive user dashboard without connecting to external AI providers.

### Planned Project Phases:
- **Phase 1: Smart Home Simulation Foundation** (Current)
- **Phase 2: Jev Decision Engine Integration**
- **Phase 3: LLM Baseline Integration**
- **Phase 4: Jev vs. LLM Comparison Framework**
- **Phase 5: Evaluation & Analytics Dashboard**
- **Phase 6: Final Polish, Verification & Documentation**

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Dark Engineering Dashboard Theme)
- **Icons**: Lucide React
- **Testing**: Vitest

---

## Getting Started

### Prerequisites
- Node.js >= 18.x (Tested on v22.19.0)
- npm >= 9.x

### Installation
```bash
npm install
```

### Running the Simulator
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
```bash
npm test
```
