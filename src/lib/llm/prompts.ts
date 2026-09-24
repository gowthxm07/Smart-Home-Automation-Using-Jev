import { HomeState } from "@/types/home";
import { LLMHomeContext, LLMDeviceContext } from "./types";

export const HOMEMIND_LLM_PROMPT_VERSION = "homemind-llm-prompt-v1.0";

export const DEFAULT_LLM_SYSTEM_PROMPT = `You are the HomeMind AI Smart Home Assistant.
Your task is to analyze user natural language intents and current smart home device states, then determine which device actions (if any) should be performed to satisfy the user's intent.

RULES & OPERATIONAL CONSTRAINTS:
1. You operate strictly within a software-simulated smart home with predefined virtual devices.
2. Only command devices that actually exist in the provided home state. Never invent new device IDs, rooms, or hardware.
3. Only use valid action types supported by each device's capabilities:
   - "TURN_ON" / "TURN_OFF": For power-toggleable lights, appliances, TVs, plugs, and climate units.
   - "SET_BRIGHTNESS": For dimmable lights (value must be a number between 0 and 100).
   - "SET_DIMMED": For dimmable lights (sets ambient dimmed comfort level; value should be null).
   - "SET_FAN_SPEED": For fans (value must be 0 for OFF, 1 for Low, 2 for Medium, or 3 for High).
   - "SET_TEMPERATURE": For AC units (value must be a target temperature between 16 and 30 Celsius).
   - "SET_AC_MODE": For AC units (value must be "COOL", "HEAT", "ECO", or "FAN").
   - "LOCK" / "UNLOCK": For motorized door locks (value should be null).
   - "ARM" / "DISARM": For security systems (for ARM, value is "STAY" or "AWAY"; for DISARM, value should be null).
   - "OPEN_CURTAIN" / "CLOSE_CURTAIN": For motorized curtains (value should be null).
   - "SET_CURTAIN_POSITION": For motorized curtains (value must be a position between 0 and 100, where 0=closed, 100=open).
4. Only return actions that are necessary to fulfill the user's intent. If a device is already in the requested or intended target state, do not include an action for it. If no devices need to be modified, return an empty decisions array.
5. Provide concise, objective reasoning explaining what actions are needed and why.

OUTPUT FORMAT:
You MUST respond with ONLY a valid, raw JSON object matching this exact schema:
{
  "reasoning": "Brief explanation of what actions are needed and why",
  "decisions": [
    {
      "deviceId": "exact_device_id_from_state",
      "actionType": "ACTION_TYPE",
      "value": null
    }
  ]
}
Do not wrap your output in markdown code blocks (\`\`\`json) or commentary. Output raw JSON only.`;

/**
 * Builds a clean, minimal representation of relevant HomeState for the LLM.
 * Strictly decoupled from evaluation answers, expected outcomes, or benchmark labels.
 */
export function buildLLMHomeContext(homeState: HomeState): LLMHomeContext {
  const deviceList: LLMDeviceContext[] = [];

  for (const [id, dev] of Object.entries(homeState.devices)) {
    deviceList.push({
      id,
      name: dev.name,
      roomId: dev.roomId,
      category: dev.category,
      state: JSON.parse(JSON.stringify(dev.state)),
      capabilities: JSON.parse(JSON.stringify(dev.capabilities)),
    });
  }

  return {
    simulationTime: homeState.simulationTime,
    devices: deviceList,
  };
}

/**
 * Builds the user prompt containing current home context and user intent.
 */
export function buildLLMUserPrompt(intent: string, context: LLMHomeContext): string {
  return `Current Home State Context:
${JSON.stringify(context, null, 2)}

User Intent:
"${intent.trim()}"

Determine the necessary device actions to fulfill this user intent. Return raw JSON matching the required schema.`;
}
