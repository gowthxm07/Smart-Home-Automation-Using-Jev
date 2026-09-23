import { Action, ActionLogEntry, ActionSource } from "@/types/action";
import { Device, DeviceState, LightState, FanState, ACState, CurtainState, LockState, SecurityState, SmartPlugState } from "@/types/device";
import { HomeState } from "@/types/home";
import { ISimulationEngine, SimulationResult } from "@/types/engine";

function formatStateForSummary(state: DeviceState | undefined): string {
  if (!state) return "UNKNOWN";
  if ("speed" in state) {
    return state.power === "ON" ? `ON (Speed ${state.speed})` : "OFF";
  }
  if ("targetTemperature" in state) {
    if ("power" in state) {
      return (state as ACState).power === "ON"
        ? `ON (${state.targetTemperature}°C, ${(state as ACState).mode ?? "COOL"})`
        : `OFF (${state.targetTemperature}°C)`;
    }
    return `Mode: ${state.mode} (${state.targetTemperature}°C, Ambient: ${state.ambientTemperature}°C)`;
  }
  if ("brightness" in state) {
    return state.power === "ON" ? `ON (${state.brightness}%)` : "OFF";
  }
  if ("state" in state) {
    if ("position" in state) {
      return `${state.state} (${state.position}%)`;
    }
    return state.state;
  }
  if ("power" in state) {
    return state.power;
  }
  return JSON.stringify(state);
}

export class SimulationEngine implements ISimulationEngine {
  /**
   * Applies an action deterministically to the HomeState.
   * Validates device existence, capability support, and payload boundaries.
   */
  applyAction(action: Action, currentState: HomeState): SimulationResult {
    const device = currentState.devices[action.deviceId];
    if (!device) {
      return {
        success: false,
        newState: currentState,
        error: `Unknown device: "${action.deviceId}".`,
      };
    }

    const previousState: DeviceState = JSON.parse(JSON.stringify(device.state));
    let nextState: DeviceState;

    switch (action.actionType) {
      case "TURN_ON": {
        if (!device.capabilities.powerToggle) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support power toggle.`,
          };
        }
        if (device.category === "LIGHT") {
          const s = previousState as LightState;
          nextState = {
            ...s,
            power: "ON",
            brightness: s.brightness === 0 ? 100 : s.brightness,
          };
        } else if (device.category === "CLIMATE") {
          if ("speed" in previousState) {
            const s = previousState as FanState;
            nextState = {
              ...s,
              power: "ON",
              speed: s.speed === 0 ? 1 : s.speed,
            };
          } else {
            const s = previousState as ACState;
            nextState = { ...s, power: "ON" };
          }
        } else if (device.category === "POWER") {
          const s = previousState as SmartPlugState;
          nextState = {
            ...s,
            power: "ON",
            currentWatts: device.metadata?.wattageRating ?? 45,
          };
        } else {
          nextState = { ...(previousState as any), power: "ON" };
        }
        break;
      }

      case "TURN_OFF": {
        if (!device.capabilities.powerToggle) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support power toggle.`,
          };
        }
        if (device.category === "CLIMATE" && "speed" in previousState) {
          const s = previousState as FanState;
          nextState = { ...s, power: "OFF", speed: 0 };
        } else if (device.category === "POWER") {
          const s = previousState as SmartPlugState;
          nextState = { ...s, power: "OFF", currentWatts: 0 };
        } else {
          nextState = { ...(previousState as any), power: "OFF" };
        }
        break;
      }

      case "SET_BRIGHTNESS": {
        if (!device.capabilities.dimmable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support dimming/brightness adjustment.`,
          };
        }
        const val = Number(action.value);
        if (isNaN(val) || val < 0 || val > 100) {
          return {
            success: false,
            newState: currentState,
            error: `Brightness value must be a number between 0 and 100. Received: ${action.value}`,
          };
        }
        const s = previousState as LightState;
        nextState = {
          ...s,
          brightness: val,
          power: val > 0 ? "ON" : "OFF",
          mode: val <= 30 && val > 0 ? "DIMMED" : "NORMAL",
        };
        break;
      }

      case "SET_DIMMED": {
        if (!device.capabilities.dimmable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support dimming.`,
          };
        }
        const s = previousState as LightState;
        nextState = {
          ...s,
          power: "ON",
          brightness: 25,
          mode: "DIMMED",
        };
        break;
      }

      case "SET_FAN_SPEED": {
        if (!device.capabilities.fanSpeed) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support fan speed control.`,
          };
        }
        const sp = Number(action.value);
        if (![0, 1, 2, 3].includes(sp)) {
          return {
            success: false,
            newState: currentState,
            error: `Fan speed must be 0 (OFF), 1, 2, or 3. Received: ${action.value}`,
          };
        }
        const s = previousState as FanState;
        nextState = {
          ...s,
          speed: sp as 0 | 1 | 2 | 3,
          power: sp > 0 ? "ON" : "OFF",
        };
        break;
      }

      case "SET_TEMPERATURE": {
        const bounds = device.capabilities.temperatureAdjustment;
        if (!bounds) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support temperature adjustment.`,
          };
        }
        const temp = Number(action.value);
        if (isNaN(temp) || temp < bounds.min || temp > bounds.max) {
          return {
            success: false,
            newState: currentState,
            error: `Temperature must be between ${bounds.min}°C and ${bounds.max}°C. Received: ${action.value}`,
          };
        }
        const s = previousState as ACState;
        nextState = {
          ...s,
          targetTemperature: temp,
        };
        break;
      }

      case "SET_AC_MODE": {
        if (device.category !== "CLIMATE" || !("mode" in previousState)) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" does not support AC mode selection.`,
          };
        }
        const validModes = ["COOL", "HEAT", "ECO", "FAN"];
        const mode = String(action.value).toUpperCase();
        if (!validModes.includes(mode)) {
          return {
            success: false,
            newState: currentState,
            error: `Invalid AC mode: ${action.value}. Must be one of: ${validModes.join(", ")}`,
          };
        }
        const s = previousState as ACState;
        nextState = {
          ...s,
          mode: mode as "COOL" | "HEAT" | "ECO" | "FAN",
        };
        break;
      }

      case "LOCK": {
        if (!device.capabilities.lockable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" cannot be locked.`,
          };
        }
        const s = previousState as LockState;
        nextState = { ...s, state: "LOCKED" };
        break;
      }

      case "UNLOCK": {
        if (!device.capabilities.lockable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" cannot be unlocked.`,
          };
        }
        const s = previousState as LockState;
        nextState = { ...s, state: "UNLOCKED" };
        break;
      }

      case "ARM": {
        if (!device.capabilities.armable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" cannot be armed.`,
          };
        }
        const armMode = action.value === "AWAY" ? "AWAY" : "STAY";
        const s = previousState as SecurityState;
        nextState = { ...s, state: "ARMED", mode: armMode };
        break;
      }

      case "DISARM": {
        if (!device.capabilities.armable) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" cannot be disarmed.`,
          };
        }
        const s = previousState as SecurityState;
        nextState = { ...s, state: "DISARMED" };
        break;
      }

      case "OPEN_CURTAIN": {
        if (!device.capabilities.curtainPosition) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" is not a motorized curtain.`,
          };
        }
        const s = previousState as CurtainState;
        nextState = { ...s, state: "OPEN", position: 100 };
        break;
      }

      case "CLOSE_CURTAIN": {
        if (!device.capabilities.curtainPosition) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" is not a motorized curtain.`,
          };
        }
        const s = previousState as CurtainState;
        nextState = { ...s, state: "CLOSED", position: 0 };
        break;
      }

      case "SET_CURTAIN_POSITION": {
        if (!device.capabilities.curtainPosition) {
          return {
            success: false,
            newState: currentState,
            error: `Device "${device.name}" is not a motorized curtain.`,
          };
        }
        const pos = Number(action.value);
        if (isNaN(pos) || pos < 0 || pos > 100) {
          return {
            success: false,
            newState: currentState,
            error: `Curtain position must be between 0 and 100. Received: ${action.value}`,
          };
        }
        const s = previousState as CurtainState;
        nextState = {
          ...s,
          position: pos,
          state: pos > 0 ? "OPEN" : "CLOSED",
        };
        break;
      }

      default: {
        return {
          success: false,
          newState: currentState,
          error: `Unsupported action type: "${(action as any).actionType}".`,
        };
      }
    }

    const prevDesc = formatStateForSummary(previousState);
    const nextDesc = formatStateForSummary(nextState);

    const logEntry: ActionLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: action.timestamp || currentState.simulationTime,
      deviceId: device.id,
      deviceName: device.name,
      roomId: device.roomId,
      actionType: action.actionType,
      previousState,
      newState: nextState,
      source: action.source,
      summary: `${prevDesc} → ${nextDesc}`,
    };

    const updatedDevice: Device = {
      ...device,
      state: nextState,
    };

    const newState: HomeState = {
      ...currentState,
      devices: {
        ...currentState.devices,
        [device.id]: updatedDevice,
      },
      lastAction: action,
      actionHistory: [logEntry, ...currentState.actionHistory].slice(0, 100), // maintain latest 100
    };

    return {
      success: true,
      newState,
      logEntry,
    };
  }

  /**
   * Applies multiple actions sequentially.
   */
  applyBatchActions(
    actions: Action[],
    currentState: HomeState
  ): { finalState: HomeState; results: SimulationResult[] } {
    let state = currentState;
    const results: SimulationResult[] = [];

    for (const action of actions) {
      const res = this.applyAction(action, state);
      results.push(res);
      if (res.success) {
        state = res.newState;
      }
    }

    return {
      finalState: state,
      results,
    };
  }
}

export const simulationEngine = new SimulationEngine();
