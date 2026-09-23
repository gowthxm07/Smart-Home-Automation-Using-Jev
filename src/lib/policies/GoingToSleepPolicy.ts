import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";
import {
  LightState,
  FanState,
  ACState,
  LockState,
  SecurityState,
  CurtainState,
} from "@/types/device";

export interface PolicyEvaluationResult {
  actions: Action[];
  skippedRedundantActions: string[];
  appliedDecisions: string[];
  evaluationSummary: string;
}

/**
 * Deterministic policy that maps Jev's structured decisions to HomeMind Action[].
 *
 * CRITICAL SEPARATION:
 * - Jev API produces structured decisions (probabilities, choices, confidence).
 * - GoingToSleepPolicy determines how those decisions translate to HomeMind Action[].
 * - SimulationEngine executes the resulting Action[] to update HomeState.
 *
 * Avoids redundant actions (e.g. if TV is already OFF and Jev decides it should be OFF,
 * no action is generated).
 */
export class GoingToSleepPolicy {
  /**
   * Evaluates Jev decision trace against current HomeState.
   */
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

    // 2. Living Room Light
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

    // 3. Living Room TV
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

    // 4. Living Room Curtains
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

    // 5. Bedroom Curtains
    if (decisions["curtain_bedroom"]) {
      const decision = decisions["curtain_bedroom"];
      const curtainDevice = homeState.devices["curtain_bedroom"];

      if (curtainDevice && decision.affirmative) {
        const currentState = (curtainDevice.state as CurtainState).state;
        if (currentState === "OPEN") {
          actions.push(createAction("curtain_bedroom", "CLOSE_CURTAIN"));
          appliedDecisions.push("curtain_bedroom: OPEN → CLOSE_CURTAIN");
        } else {
          skippedRedundantActions.push("curtain_bedroom: already CLOSED");
        }
      }
    }

    // 6. Security System
    if (decisions["security_system"]) {
      const decision = decisions["security_system"];
      const secDevice = homeState.devices["security_system"];

      if (secDevice && decision.affirmative) {
        const currentState = (secDevice.state as SecurityState).state;
        if (currentState === "DISARMED") {
          actions.push(createAction("security_system", "ARM", "STAY"));
          appliedDecisions.push("security_system: DISARMED → ARM (STAY)");
        } else {
          skippedRedundantActions.push("security_system: already ARMED");
        }
      }
    }

    // 7. Bedroom Fan (Choice)
    if (decisions["fan_bedroom"]) {
      const decision = decisions["fan_bedroom"];
      const fanDevice = homeState.devices["fan_bedroom"];

      if (fanDevice && decision.selectedChoice) {
        const fanState = fanDevice.state as FanState;
        const choiceToSpeed: Record<string, 0 | 1 | 2 | 3> = {
          off: 0,
          low: 1,
          medium: 2,
          high: 3,
        };

        const targetSpeed = choiceToSpeed[decision.selectedChoice.toLowerCase()];

        if (targetSpeed !== undefined) {
          const currentSpeed = fanState.power === "ON" ? fanState.speed : 0;
          if (currentSpeed !== targetSpeed) {
            actions.push(createAction("fan_bedroom", "SET_FAN_SPEED", targetSpeed));
            appliedDecisions.push(`fan_bedroom: speed ${currentSpeed} → speed ${targetSpeed}`);
          } else {
            skippedRedundantActions.push(`fan_bedroom: already at speed ${targetSpeed}`);
          }
        } else {
          skippedRedundantActions.push(
            `fan_bedroom: unrecognized choice "${decision.selectedChoice}" skipped safely`
          );
        }
      }
    }

    // 8. Living Room AC (Power state)
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

    const evaluationSummary = `Policy evaluated ${Object.keys(decisions).length} Jev decisions. Generated ${actions.length} action(s). Filtered ${skippedRedundantActions.length} redundant action(s).`;

    return {
      actions,
      skippedRedundantActions,
      appliedDecisions,
      evaluationSummary,
    };
  }
}
