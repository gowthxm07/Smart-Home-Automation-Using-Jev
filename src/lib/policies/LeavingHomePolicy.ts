import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LightState,
  LockState,
  SecurityState,
  ACState,
  SmartPlugState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for LEAVING_HOME
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - LeavingHomePolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class LeavingHomePolicy {
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

    // 1. Main Door Lock
    if (decisions["lock_main_door"]) {
      const decision = decisions["lock_main_door"];
      const lockDevice = homeState.devices["lock_main_door"];

      if (lockDevice && decision.affirmative) {
        const currentState = (lockDevice.state as LockState).state;
        if (currentState === "UNLOCKED") {
          actions.push(createAction("lock_main_door", "LOCK"));
          appliedDecisions.push("lock_main_door: UNLOCKED → LOCK");
        } else {
          skippedRedundantActions.push("lock_main_door: already LOCKED");
        }
      }
    }

    // 2. Security System (Arm in AWAY mode)
    if (decisions["security_system"]) {
      const decision = decisions["security_system"];
      const secDevice = homeState.devices["security_system"];

      if (secDevice && decision.affirmative) {
        const currentState = (secDevice.state as SecurityState).state;
        if (currentState === "DISARMED") {
          actions.push(createAction("security_system", "ARM", "AWAY"));
          appliedDecisions.push("security_system: DISARMED → ARM (AWAY)");
        } else {
          skippedRedundantActions.push("security_system: already ARMED");
        }
      }
    }

    // 3. Entrance Light
    if (decisions["light_entrance"]) {
      const decision = decisions["light_entrance"];
      const lightDevice = homeState.devices["light_entrance"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_entrance", "TURN_OFF"));
          appliedDecisions.push("light_entrance: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_entrance: already OFF");
        }
      }
    }

    // 4. Living Room Light
    if (decisions["light_living_room"]) {
      const decision = decisions["light_living_room"];
      const lightDevice = homeState.devices["light_living_room"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_living_room", "TURN_OFF"));
          appliedDecisions.push("light_living_room: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_living_room: already OFF");
        }
      }
    }

    // 5. Kitchen Light
    if (decisions["light_kitchen"]) {
      const decision = decisions["light_kitchen"];
      const lightDevice = homeState.devices["light_kitchen"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_kitchen", "TURN_OFF"));
          appliedDecisions.push("light_kitchen: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_kitchen: already OFF");
        }
      }
    }

    // 6. Study Light
    if (decisions["light_study"]) {
      const decision = decisions["light_study"];
      const lightDevice = homeState.devices["light_study"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_study", "TURN_OFF"));
          appliedDecisions.push("light_study: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_study: already OFF");
        }
      }
    }

    // 7. Bedroom Light
    if (decisions["light_bedroom"]) {
      const decision = decisions["light_bedroom"];
      const lightDevice = homeState.devices["light_bedroom"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_bedroom", "TURN_OFF"));
          appliedDecisions.push("light_bedroom: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_bedroom: already OFF");
        }
      }
    }

    // 8. Living Room TV
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

    // 9. Living Room AC
    if (decisions["ac_living_room"]) {
      const decision = decisions["ac_living_room"];
      const acDevice = homeState.devices["ac_living_room"];

      if (acDevice && decision.affirmative) {
        const currentState = (acDevice.state as ACState).power;
        if (currentState === "ON") {
          actions.push(createAction("ac_living_room", "TURN_OFF"));
          appliedDecisions.push("ac_living_room: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("ac_living_room: already OFF");
        }
      }
    }

    // 10. Kitchen General Plug
    if (decisions["plug_kitchen_general"]) {
      const decision = decisions["plug_kitchen_general"];
      const plugDevice = homeState.devices["plug_kitchen_general"];

      if (plugDevice && decision.affirmative) {
        const currentState = (plugDevice.state as SmartPlugState).power;
        if (currentState === "ON") {
          actions.push(createAction("plug_kitchen_general", "TURN_OFF"));
          appliedDecisions.push("plug_kitchen_general: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("plug_kitchen_general: already OFF");
        }
      }
    }

    // 11. Study Laptop Charger Plug
    if (decisions["plug_laptop_charger"]) {
      const decision = decisions["plug_laptop_charger"];
      const plugDevice = homeState.devices["plug_laptop_charger"];

      if (plugDevice && decision.affirmative) {
        const currentState = (plugDevice.state as SmartPlugState).power;
        if (currentState === "ON") {
          actions.push(createAction("plug_laptop_charger", "TURN_OFF"));
          appliedDecisions.push("plug_laptop_charger: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("plug_laptop_charger: already OFF");
        }
      }
    }

    const evaluationSummary = `LeavingHomePolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
