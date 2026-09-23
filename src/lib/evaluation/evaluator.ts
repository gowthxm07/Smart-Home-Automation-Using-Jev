import {
  EvaluationEngine,
  EvaluationScenario,
  EngineRun,
  EvaluationResult,
  StateComparisonResult,
  ActionComparisonResult,
  StateDiscrepancy,
  MetricResult,
  ExpectedAction,
} from "./types";
import { Action } from "@/types/action";
import { DeviceState } from "@/types/device";

/**
 * StandardEvaluationEngine
 * Provider-independent reference evaluator.
 * Strictly operates as an analysis layer:
 * - Does not execute simulation actions.
 * - Does not mutate input scenarios, runs, states, or actions.
 * - Does not compute overall scores, rankings, or declare winners.
 * - Preserves independent multi-dimensional metrics for research analysis.
 */
export class StandardEvaluationEngine implements EvaluationEngine {
  readonly id = "standard-evaluation-engine";
  readonly name = "Standard Provider-Independent Evaluation Engine";

  /**
   * Evaluates an immutable EngineRun against an immutable EvaluationScenario.
   */
  evaluate(
    scenario: Readonly<EvaluationScenario>,
    run: Readonly<EngineRun>
  ): EvaluationResult {
    const stateComparison = this.compareStates(scenario, run);
    const actionComparison = this.compareActions(scenario, run);
    const metrics = this.computeMetrics(stateComparison, actionComparison, run);

    return {
      scenarioId: scenario.id,
      engineId: run.engineId,
      runId: run.runId,
      timestamp: new Date().toISOString(),
      metrics,
      stateComparison,
      actionComparison,
    };
  }

  /**
   * Compares the final simulated HomeState against expected target states.
   * Never mutates either state.
   */
  private compareStates(
    scenario: Readonly<EvaluationScenario>,
    run: Readonly<EngineRun>
  ): StateComparisonResult {
    const expectedStates = scenario.expectedOutcome.expectedDeviceStates || {};
    const finalDevices = run.finalState.devices || {};
    const deviceIds = Object.keys(expectedStates);

    const matchedDevices: string[] = [];
    const mismatchedDevices: StateDiscrepancy[] = [];

    for (const deviceId of deviceIds) {
      const expected = expectedStates[deviceId];
      const actualDevice = finalDevices[deviceId];

      if (!actualDevice) {
        mismatchedDevices.push({
          deviceId,
          expected: expected.targetState,
          actual: {} as DeviceState,
          mismatchedProperties: ["device_not_found"],
        });
        continue;
      }

      const actualState = actualDevice.state as unknown as Record<string, unknown>;
      const targetState = expected.targetState as unknown as Record<string, unknown>;
      const mismatchedProps: string[] = [];

      for (const [propKey, targetVal] of Object.entries(targetState)) {
        if (actualState[propKey] !== targetVal) {
          mismatchedProps.push(propKey);
        }
      }

      if (mismatchedProps.length === 0) {
        matchedDevices.push(deviceId);
      } else {
        mismatchedDevices.push({
          deviceId,
          expected: expected.targetState,
          actual: actualDevice.state,
          mismatchedProperties: mismatchedProps,
        });
      }
    }

    const totalEvaluatedDevices = deviceIds.length;
    const stateAccuracyRatio =
      totalEvaluatedDevices > 0 ? matchedDevices.length / totalEvaluatedDevices : 1.0;

    return {
      totalEvaluatedDevices,
      matchedDevices,
      mismatchedDevices,
      stateAccuracyRatio,
    };
  }

  /**
   * Compares the engine's dispatched actions against expected action rules.
   * Distinguishes:
   * - Required action correctly produced
   * - Required action missed
   * - Forbidden action produced
   * - Optional action produced
   * - Unnecessary action produced
   * - Redundant action produced (device already in target state prior to action)
   */
  private compareActions(
    scenario: Readonly<EvaluationScenario>,
    run: Readonly<EngineRun>
  ): ActionComparisonResult {
    const expectedActions = scenario.expectedOutcome.expectedActions || [];
    const actualActions = run.actions || [];
    const initialDevices = scenario.initialState.devices || {};

    const matchedRequiredActions: Action[] = [];
    const executedForbiddenActions: Action[] = [];
    const executedOptionalActions: Action[] = [];
    const unnecessaryActions: Action[] = [];
    const redundantActions: Action[] = [];

    const matchedExpectedIndices = new Set<number>();

    // Process each executed action
    for (const actual of actualActions) {
      let matchedIndex = -1;

      for (let i = 0; i < expectedActions.length; i++) {
        const expected = expectedActions[i];
        if (this.isActionMatch(actual, expected)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex >= 0) {
        matchedExpectedIndices.add(matchedIndex);
        const matchedExpected = expectedActions[matchedIndex];

        if (matchedExpected.requirement === "REQUIRED") {
          matchedRequiredActions.push(actual);
        } else if (matchedExpected.requirement === "OPTIONAL") {
          executedOptionalActions.push(actual);
        } else if (matchedExpected.requirement === "FORBIDDEN") {
          executedForbiddenActions.push(actual);
        }
      } else {
        // Check if any forbidden rule matches this device and actionType
        const isExplicitlyForbidden = expectedActions.some(
          (exp) =>
            exp.requirement === "FORBIDDEN" &&
            exp.deviceId === actual.deviceId &&
            exp.actionType === actual.actionType
        );

        if (isExplicitlyForbidden) {
          executedForbiddenActions.push(actual);
        } else {
          unnecessaryActions.push(actual);
        }
      }

      // Check redundancy: did initial state already have the state this action aims to achieve?
      if (this.isRedundantAction(actual, initialDevices[actual.deviceId]?.state)) {
        redundantActions.push(actual);
      }
    }

    // Identify missed required actions
    const missedRequiredActions: ExpectedAction[] = [];
    for (let i = 0; i < expectedActions.length; i++) {
      const exp = expectedActions[i];
      if (exp.requirement === "REQUIRED" && !matchedExpectedIndices.has(i)) {
        missedRequiredActions.push(exp);
      }
    }

    return {
      matchedRequiredActions,
      missedRequiredActions,
      executedForbiddenActions,
      executedOptionalActions,
      unnecessaryActions,
      redundantActions,
    };
  }

  /**
   * Helper to check if an actual Action satisfies an ExpectedAction specification.
   */
  private isActionMatch(actual: Action, expected: ExpectedAction): boolean {
    if (actual.deviceId !== expected.deviceId) return false;
    if (actual.actionType !== expected.actionType) return false;

    if (expected.expectedValue !== undefined) {
      return actual.value === expected.expectedValue;
    }

    return true;
  }

  /**
   * Helper to determine if an action was redundant given initial device state.
   */
  private isRedundantAction(action: Action, initialState?: DeviceState): boolean {
    if (!initialState) return false;

    const st = initialState as unknown as Record<string, unknown>;

    switch (action.actionType) {
      case "TURN_ON":
        return st.power === "ON";
      case "TURN_OFF":
        return st.power === "OFF";
      case "LOCK":
        return st.state === "LOCKED";
      case "UNLOCK":
        return st.state === "UNLOCKED";
      case "ARM":
        return st.state === "ARMED" && (action.value === undefined || st.mode === action.value);
      case "DISARM":
        return st.state === "DISARMED";
      case "CLOSE_CURTAIN":
        return st.state === "CLOSED";
      case "OPEN_CURTAIN":
        return st.state === "OPEN";
      case "SET_FAN_SPEED":
        return st.speed === action.value && (action.value === 0 ? st.power === "OFF" : st.power === "ON");
      case "SET_TEMPERATURE":
        return st.targetTemperature === action.value;
      case "SET_AC_MODE":
        return st.mode === action.value;
      case "SET_BRIGHTNESS":
        return st.brightness === action.value;
      default:
        return false;
    }
  }

  /**
   * Computes independent quantitative metrics without premature aggregation or scoring.
   */
  private computeMetrics(
    stateComparison: StateComparisonResult,
    actionComparison: ActionComparisonResult,
    run: Readonly<EngineRun>
  ): MetricResult[] {
    return [
      {
        name: "matched_required_actions_count",
        value: actionComparison.matchedRequiredActions.length,
        unit: "count",
        description: "Number of required actions successfully generated by the engine.",
      },
      {
        name: "missed_required_actions_count",
        value: actionComparison.missedRequiredActions.length,
        unit: "count",
        description: "Number of required actions that the engine failed to generate.",
      },
      {
        name: "forbidden_actions_count",
        value: actionComparison.executedForbiddenActions.length,
        unit: "count",
        description: "Number of hazardous, contradictory, or forbidden actions produced.",
      },
      {
        name: "optional_actions_count",
        value: actionComparison.executedOptionalActions.length,
        unit: "count",
        description: "Number of optional actions generated.",
      },
      {
        name: "unnecessary_actions_count",
        value: actionComparison.unnecessaryActions.length,
        unit: "count",
        description: "Number of actions generated that were neither required nor optional.",
      },
      {
        name: "redundant_actions_count",
        value: actionComparison.redundantActions.length,
        unit: "count",
        description: "Number of actions that targeted devices already in the expected state.",
      },
      {
        name: "state_accuracy_ratio",
        value: stateComparison.stateAccuracyRatio,
        unit: "ratio",
        description: "Proportion of evaluated devices that matched the expected final state (0.0 to 1.0).",
      },
      {
        name: "latency_ms",
        value: run.latencyMs,
        unit: "ms",
        description: "Execution latency of the decision engine in milliseconds.",
      },
    ];
  }
}
