import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LightState,
  SmartPlugState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for WORKING
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - WorkingPolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class WorkingPolicy {
  static evaluate(trace: JevDecisionTrace, homeState: HomeState): PolicyEvaluationResult {
    const actions: Action[] = [];
    const skippedRedundantActions: string[] = [];
    const appliedDecisions: string[] = [];

    const now = homeState.simulationTime || new Date().toISOString();

    const createAction = (
      deviceId: string,
      actionType: any,
      value?: unknown
    ): Action => ({
      id: `act_jev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      deviceId,
      actionType,
      value,
      source: "JEV",
      timestamp: now,
    });

    const decisions = trace.decisions;

    // 1. Study Light (Power ON)
    if (decisions["light_study"]) {
      const decision = decisions["light_study"];
      const lightDevice = homeState.devices["light_study"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "OFF") {
          actions.push(createAction("light_study", "TURN_ON"));
          appliedDecisions.push("light_study: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("light_study: already ON");
        }
      }
    }

    // 2. Workstation Laptop Charger Plug (Power ON)
    if (decisions["plug_laptop_charger"]) {
      const decision = decisions["plug_laptop_charger"];
      const plugDevice = homeState.devices["plug_laptop_charger"];

      if (plugDevice && decision.affirmative) {
        const currentState = (plugDevice.state as SmartPlugState).power;
        if (currentState === "OFF") {
          actions.push(createAction("plug_laptop_charger", "TURN_ON"));
          appliedDecisions.push("plug_laptop_charger: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("plug_laptop_charger: already ON");
        }
      }
    }

    // 3. Living Room TV (Turn OFF to eliminate distractions)
    if (decisions["tv_living_room"]) {
      const decision = decisions["tv_living_room"];
      const tvDevice = homeState.devices["tv_living_room"];

      if (tvDevice && decision.affirmative) {
        const isPowerOn =
          "power" in tvDevice.state ? (tvDevice.state as any).power === "ON" : false;
        if (isPowerOn) {
          actions.push(createAction("tv_living_room", "TURN_OFF"));
          appliedDecisions.push("tv_living_room: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("tv_living_room: already OFF");
        }
      }
    }

    const evaluationSummary = `WorkingPolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
