import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LightState,
  CurtainState,
  SmartPlugState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for MOVIE_NIGHT
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - MovieNightPolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class MovieNightPolicy {
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

    // 1. Living Room TV (Power ON)
    if (decisions["tv_living_room"]) {
      const decision = decisions["tv_living_room"];
      const tvDevice = homeState.devices["tv_living_room"];

      if (tvDevice && decision.affirmative) {
        const isPowerOn =
          "power" in tvDevice.state ? (tvDevice.state as any).power === "ON" : false;
        if (!isPowerOn) {
          actions.push(createAction("tv_living_room", "TURN_ON"));
          appliedDecisions.push("tv_living_room: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("tv_living_room: already ON");
        }
      }
    }

    // 2. TV Power Outlet Plug (Power ON)
    if (decisions["plug_tv_outlet"]) {
      const decision = decisions["plug_tv_outlet"];
      const plugDevice = homeState.devices["plug_tv_outlet"];

      if (plugDevice && decision.affirmative) {
        const currentState = (plugDevice.state as SmartPlugState).power;
        if (currentState === "OFF") {
          actions.push(createAction("plug_tv_outlet", "TURN_ON"));
          appliedDecisions.push("plug_tv_outlet: OFF → TURN_ON");
        } else {
          skippedRedundantActions.push("plug_tv_outlet: already ON");
        }
      }
    }

    // 3. Living Room Light (Set Dimmed)
    if (decisions["light_living_room"]) {
      const decision = decisions["light_living_room"];
      const lightDevice = homeState.devices["light_living_room"];

      if (lightDevice && decision.affirmative) {
        const lightState = lightDevice.state as LightState;
        const isAlreadyDimmed =
          lightState.power === "ON" && lightState.mode === "DIMMED";

        if (!isAlreadyDimmed) {
          actions.push(createAction("light_living_room", "SET_DIMMED"));
          appliedDecisions.push("light_living_room: → SET_DIMMED");
        } else {
          skippedRedundantActions.push("light_living_room: already DIMMED");
        }
      }
    }

    // 4. Living Room Curtains (Close)
    if (decisions["curtain_living_room"]) {
      const decision = decisions["curtain_living_room"];
      const curtainDevice = homeState.devices["curtain_living_room"];

      if (curtainDevice && decision.affirmative) {
        const currentState = (curtainDevice.state as CurtainState).state;
        if (currentState === "OPEN") {
          actions.push(createAction("curtain_living_room", "CLOSE_CURTAIN"));
          appliedDecisions.push("curtain_living_room: OPEN → CLOSE_CURTAIN");
        } else {
          skippedRedundantActions.push("curtain_living_room: already CLOSED");
        }
      }
    }

    // 5. Kitchen Light (Turn off to eliminate glare)
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

    const evaluationSummary = `MovieNightPolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
