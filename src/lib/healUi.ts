/**
 * Client for POST /api/heal-ui (docs/contracts.md §9) on the Express backend.
 *
 * The backend scores the telemetry and, at or above the threshold, returns `ui`:
 * a validated, compiled wizard (`ui.generated`) or a `ui.fallback`.
 */

import { TelemetryPayload, TelemetryResponse } from '@/types/telemetry';

export type FieldValue = string | boolean | number;
export type FieldValues = Record<string, FieldValue>;

export interface UiGenerated {
  type: 'ui.generated';
  sessionId: string;
  componentId: string;
  targetFieldId: string;
  compiled: string;
  initialValues?: FieldValues;
}

export interface UiFallback {
  type: 'ui.fallback';
  sessionId: string;
  targetFieldId: string;
  reason: string;
}

export type UiMessage = UiGenerated | UiFallback;

export interface HealUiReply extends TelemetryResponse {
  ui: UiMessage | null;
  generation: { status: string; componentName?: string; violations?: unknown[]; meta?: Record<string, unknown> } | null;
}

export const HEAL_UI_URL = process.env.NEXT_PUBLIC_HEAL_UI_URL || 'http://localhost:3001/api/heal-ui';

/** One session id per page load, so the backend cooldown and cache work per visitor. */
let sessionId: string | null = null;
export function getSessionId(): string {
  if (!sessionId) sessionId = `s_${Math.random().toString(36).slice(2, 10)}`;
  return sessionId;
}

export async function requestHealedUi(
  payload: TelemetryPayload,
  options: { url?: string; signal?: AbortSignal } = {}
): Promise<HealUiReply> {
  const res = await fetch(options.url ?? HEAL_UI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, sessionId: getSessionId() }),
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`heal-ui HTTP ${res.status}`);
  return (await res.json()) as HealUiReply;
}
