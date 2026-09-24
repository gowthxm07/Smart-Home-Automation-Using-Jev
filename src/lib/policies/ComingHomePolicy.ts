import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LockState,
  SecurityState,
  LightState,
  ACState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for COMING_HOME
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - ComingHomePolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class ComingHomePolicy {
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

    // 1. Main Door Lock (Unlock)
    if (decisions["lock_main_door"]) {
      const decision = decisions["lock_main_door"];
      const lockDevice = homeState.devices["lock_main_door"];

      if (lockDevice && decision.affirmative) {
        const currentState = (lockDevice.state as LockState).state;
        if (currentState === "LOCKED") {
          actions.push(createAction("lock_main_door", "UNLOCK"));
          appliedDecisions.push("lock_main_door: LOCKED → UNLOCK");
        } else {
          skippedRedundantActions.push("lock_main_door: already UNLOCKED");
        }
      }
    }

    // 2. Security System (Disarm)
    if (decisions["security_system"]) {
      const decision = decisions["security_system"];
      const secDevice = homeState.devices["security_system"];

      if (secDevice && decision.affirmative) {
        const currentState = (secDevice.state as SecurityState).state;
        if (currentState === "ARMED") {
          actions.push(createAction("security_system", "DISARM"));
          appliedDecisions.push("security_system: ARMED → DISARM");
        } else {
          skippedRedundantActions.push("security_system: already DISARMED");
        }
      }
    }

    // 3. Entrance Foyer Light (Power ON)
    if (decisions["light_entrance"]) {
      const decision = decisions["light_entrance"];
      const lightDevice = homeState.devices["light_entrance"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "OFF") {
          actions.push(createAction("light_entrance", "TURN_ON"));
          appliedDecisions.push("light_entrance: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("light_entrance: already ON");
        }
      }
    }

    // 4. Living Room Light (Power ON)
    if (decisions["light_living_room"]) {
      const decision = decisions["light_living_room"];
      const lightDevice = homeState.devices["light_living_room"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "OFF") {
          actions.push(createAction("light_living_room", "TURN_ON"));
          appliedDecisions.push("light_living_room: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("light_living_room: already ON");
        }
      }
    }

    // 5. Living Room AC (Power ON)
    if (decisions["ac_living_room"]) {
      const decision = decisions["ac_living_room"];
      const acDevice = homeState.devices["ac_living_room"];

      if (acDevice && decision.affirmative) {
        const currentState = (acDevice.state as ACState).power;
        if (currentState === "OFF") {
          actions.push(createAction("ac_living_room", "TURN_ON"));
          appliedDecisions.push("ac_living_room: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("ac_living_room: already ON");
        }
      }
    }

    const evaluationSummary = `ComingHomePolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
