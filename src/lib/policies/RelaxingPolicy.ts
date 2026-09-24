import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { PolicyEvaluationResult } from "./GoingToSleepPolicy";
import {
  LightState,
  CurtainState,
  FanState,
} from "@/types/device";

/**
 * Deterministic policy that maps Jev's structured decisions for RELAXING
 * to HomeMind Action[].
 *
 * CRITICAL SEPARATION & INTEGRITY:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - RelaxingPolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 * - Redundancy elimination: if a device is already in the target state, no action is emitted.
 * - ZERO imports from the evaluation dataset.
 */
export class RelaxingPolicy {
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

    // 1. Living Room Light (Set Dimmed)
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

    // 2. Living Room Curtains (Close)
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

    // 3. Study Light (Turn OFF)
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

    // 4. Bedroom Fan (Choice: gentle speed 1 for relaxation)
    if (decisions["fan_bedroom"]) {
      const decision = decisions["fan_bedroom"];
      const fanDevice = homeState.devices["fan_bedroom"];

      if (fanDevice) {
        let targetSpeed: number | undefined;

        if (decision.selectedChoice) {
          const choiceToSpeed: Record<string, 0 | 1 | 2 | 3> = {
            off: 0,
            low: 1,
            medium: 2,
            high: 3,
          };
          targetSpeed = choiceToSpeed[decision.selectedChoice.toLowerCase()];
        } else if (decision.affirmative !== undefined) {
          // If framed as Noul for gentle cooling
          targetSpeed = decision.affirmative ? 1 : 0;
        }

        if (targetSpeed !== undefined) {
          const fanState = fanDevice.state as FanState;
          const currentSpeed = fanState.power === "ON" ? fanState.speed : 0;
          if (currentSpeed !== targetSpeed) {
            actions.push(createAction("fan_bedroom", "SET_FAN_SPEED", targetSpeed));
            appliedDecisions.push(`fan_bedroom: speed ${currentSpeed} → speed ${targetSpeed}`);
          } else {
            skippedRedundantActions.push(`fan_bedroom: already at speed ${targetSpeed}`);
          }
        }
      }
    }

    const evaluationSummary = `RelaxingPolicy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
