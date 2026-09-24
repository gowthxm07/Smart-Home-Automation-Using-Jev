import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LightState,
  CurtainState,
  FanState,
  SmartPlugState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for WAKING_UP
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - WakingUpPolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class WakingUpPolicy {
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

    // 1. Bedroom Curtains (Open)
    if (decisions["curtain_bedroom"]) {
      const decision = decisions["curtain_bedroom"];
      const curtainDevice = homeState.devices["curtain_bedroom"];

      if (curtainDevice && decision.affirmative) {
        const currentState = (curtainDevice.state as CurtainState).state;
        if (currentState === "CLOSED") {
          actions.push(createAction("curtain_bedroom", "OPEN_CURTAIN"));
          appliedDecisions.push("curtain_bedroom: CLOSED → OPEN_CURTAIN");
        } else {
          skippedRedundantActions.push("curtain_bedroom: already OPEN");
        }
      }
    }

    // 2. Bedside Night Lamp (Turn OFF)
    if (decisions["light_night_lamp"]) {
      const decision = decisions["light_night_lamp"];
      const lampDevice = homeState.devices["light_night_lamp"];

      if (lampDevice && decision.affirmative) {
        const currentState = (lampDevice.state as LightState).power;
        if (currentState === "ON") {
          actions.push(createAction("light_night_lamp", "TURN_OFF"));
          appliedDecisions.push("light_night_lamp: ON → TURN_OFF");
        } else {
          skippedRedundantActions.push("light_night_lamp: already OFF");
        }
      }
    }

    // 3. Kitchen General Smart Plug (Power ON for morning kettle/coffee)
    if (decisions["plug_kitchen_general"]) {
      const decision = decisions["plug_kitchen_general"];
      const plugDevice = homeState.devices["plug_kitchen_general"];

      if (plugDevice && decision.affirmative) {
        const currentState = (plugDevice.state as SmartPlugState).power;
        if (currentState === "OFF") {
          actions.push(createAction("plug_kitchen_general", "TURN_ON"));
          appliedDecisions.push("plug_kitchen_general: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("plug_kitchen_general: already ON");
        }
      }
    }

    // 4. Bedroom Fan (Turn OFF or set speed 0)
    if (decisions["fan_bedroom"]) {
      const decision = decisions["fan_bedroom"];
      const fanDevice = homeState.devices["fan_bedroom"];

      if (fanDevice) {
        const fanState = fanDevice.state as FanState;
        let shouldTurnOff = false;

        if (decision.selectedChoice) {
          shouldTurnOff = decision.selectedChoice.toLowerCase() === "off";
        } else if (decision.affirmative !== undefined) {
          // Question: Should bedroom fan be turned off when waking up?
          shouldTurnOff = decision.affirmative;
        }

        if (shouldTurnOff) {
          const currentSpeed = fanState.power === "ON" ? fanState.speed : 0;
          if (currentSpeed !== 0 || fanState.power === "ON") {
            actions.push(createAction("fan_bedroom", "SET_FAN_SPEED", 0));
            appliedDecisions.push(`fan_bedroom: speed ${currentSpeed} → speed 0 (OFF)`);
          } else {
            skippedRedundantActions.push("fan_bedroom: already OFF");
          }
        }
      }
    }

    // 5. Kitchen Light (Power ON)
    if (decisions["light_kitchen"]) {
      const decision = decisions["light_kitchen"];
      const lightDevice = homeState.devices["light_kitchen"];

      if (lightDevice && decision.affirmative) {
        const currentState = (lightDevice.state as LightState).power;
        if (currentState === "OFF") {
          actions.push(createAction("light_kitchen", "TURN_ON"));
          appliedDecisions.push("light_kitchen: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("light_kitchen: already ON");
        }
      }
    }

    const evaluationSummary = `WakingUpPolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
