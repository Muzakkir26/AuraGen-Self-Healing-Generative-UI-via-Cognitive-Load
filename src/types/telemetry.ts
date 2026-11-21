/**
 * Week 1: Telemetry Tracker Contracts (Member 02 - Frontend & UI)
 *
 * Contract with Member 3 Backend:
 * - Request Payload:
 *   {
 *     "mouseSpeed": 120,
 *     "pauseTime": 5,
 *     "rageClicks": 4,
 *     "fieldName": "annual_income",
 *     "userInput": "50000"
 *   }
 *
 * - Response Payload:
 *   {
 *     "success": true,
 *     "score": 85,
 *     "triggerAI": true,
 *     "stuckField": "annual_income",
 *     "savedValue": "50000"
 *   }
 */

export interface TelemetryPayload {
  mouseSpeed: number;     // e.g. 120 (pixels per second)
  pauseTime: number;      // e.g. 5 (seconds of hesitation / idle on field)
  rageClicks: number;     // e.g. 4 (number of rapid frustrated clicks)
  fieldName: string;      // e.g. "annual_income"
  userInput: string;      // e.g. "50000"
}

export interface TelemetryResponse {
  success: boolean;       // true
  score: number;          // e.g. 85 (Cognitive Load Score 0-100)
  triggerAI: boolean;     // e.g. true
  stuckField: string;     // e.g. "annual_income"
  savedValue: string;     // e.g. "50000"
  error?: string;
}

export interface FrictionMetrics {
  mouseSpeed: number;
  pauseTime: number;
  rageClicks: number;
  fieldName: string;
  userInput: string;
  cognitiveScore: number;
  status: 'monitoring' | 'idle' | 'friction-detected' | 'trigger-ready';
}
