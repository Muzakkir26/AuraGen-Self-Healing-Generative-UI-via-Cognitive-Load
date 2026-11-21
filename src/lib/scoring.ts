import { TelemetryPayload, TelemetryResponse } from '@/types/telemetry';

/**
 * Shared scoring & validation module for AuraGen Telemetry.
 * NOTE: In production, the cognitive score and trigger decisions are computed
 * by Member 3's backend. This implementation serves as the verified reference
 * and local mock implementation for frontend testing.
 *
 * Scoring Calibration:
 * - mouseSpeed < 20: 0 pts, 20-99: 5 pts, 100-350: 10 pts, >350: 15 pts
 * - pauseTime: min(35, Math.floor(pauseTime) * 7)
 * - rageClicks: min(40, rageClicks * 10)
 * - Baseline (0 activity) -> score: 0
 * - Contract Example (mouseSpeed: 120, pauseTime: 5, rageClicks: 4) -> score: 85
 */

export interface ValidationSuccess {
  isValid: true;
  payload: TelemetryPayload;
}

export interface ValidationFailure {
  isValid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateTelemetryPayload(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Invalid payload: Request body must be a JSON object.',
    };
  }

  const obj = data as Record<string, unknown>;
  const requiredKeys = ['mouseSpeed', 'pauseTime', 'rageClicks', 'fieldName', 'userInput'];

  // Check for missing keys
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      return {
        isValid: false,
        error: `Missing required key: "${key}". Exact keys required: ${requiredKeys.join(', ')}.`,
      };
    }
  }

  // Type validations
  if (typeof obj.mouseSpeed !== 'number' || Number.isNaN(obj.mouseSpeed)) {
    return {
      isValid: false,
      error: 'Invalid type for "mouseSpeed": must be a number.',
    };
  }

  if (typeof obj.pauseTime !== 'number' || Number.isNaN(obj.pauseTime)) {
    return {
      isValid: false,
      error: 'Invalid type for "pauseTime": must be a number.',
    };
  }

  if (typeof obj.rageClicks !== 'number' || Number.isNaN(obj.rageClicks)) {
    return {
      isValid: false,
      error: 'Invalid type for "rageClicks": must be a number.',
    };
  }

  if (typeof obj.fieldName !== 'string') {
    return {
      isValid: false,
      error: 'Invalid type for "fieldName": must be a string.',
    };
  }

  if (typeof obj.userInput !== 'string') {
    return {
      isValid: false,
      error: 'Invalid type for "userInput": must be a string.',
    };
  }

  return {
    isValid: true,
    payload: {
      mouseSpeed: obj.mouseSpeed,
      pauseTime: obj.pauseTime,
      rageClicks: obj.rageClicks,
      fieldName: obj.fieldName,
      userInput: obj.userInput,
    },
  };
}

export function computeCognitiveScore(mouseSpeed: number, pauseTime: number, rageClicks: number): {
  score: number;
  triggerAI: boolean;
} {
  // Speed component
  let speedComponent = 0;
  if (mouseSpeed >= 350) {
    speedComponent = 15;
  } else if (mouseSpeed >= 100) {
    speedComponent = 10;
  } else if (mouseSpeed >= 20) {
    speedComponent = 5;
  } else {
    speedComponent = 0;
  }

  // Pause component (up to 35 pts)
  const pauseComponent = Math.min(35, Math.floor(Math.max(0, pauseTime)) * 7);

  // Rage component (up to 40 pts)
  const rageComponent = Math.min(40, Math.max(0, rageClicks) * 10);

  const rawScore = speedComponent + pauseComponent + rageComponent;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Trigger threshold: score >= 70 or rageClicks >= 3 or pauseTime >= 5
  const triggerAI = score >= 70 || rageClicks >= 3 || pauseTime >= 5;

  return { score, triggerAI };
}

export function processTelemetry(data: unknown): TelemetryResponse {
  const validation = validateTelemetryPayload(data);
  if (!validation.isValid) {
    return {
      success: false,
      score: 0,
      triggerAI: false,
      stuckField: '',
      savedValue: '',
      error: validation.error,
    };
  }

  const { mouseSpeed, pauseTime, rageClicks, fieldName, userInput } = validation.payload;
  const { score, triggerAI } = computeCognitiveScore(mouseSpeed, pauseTime, rageClicks);

  return {
    success: true,
    score,
    triggerAI,
    stuckField: fieldName,
    savedValue: userInput,
  };
}

