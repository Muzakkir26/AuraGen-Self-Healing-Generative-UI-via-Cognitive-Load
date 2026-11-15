import { NextRequest, NextResponse } from 'next/server';
import { processTelemetry } from '@/lib/scoring';

/**
 * Week 1: Telemetry API Route (Member 3 Backend Contract)
 *
 * Strict Contract:
 * You send me:
 * {
 *   "mouseSpeed": 120,
 *   "pauseTime": 5,
 *   "rageClicks": 4,
 *   "fieldName": "annual_income",
 *   "userInput": "50000"
 * }
 *
 * I will return you:
 * {
 *   "success": true,
 *   "score": 85,
 *   "triggerAI": true,
 *   "stuckField": "annual_income",
 *   "savedValue": "50000"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = processTelemetry(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return NextResponse.json(
      {
        success: false,
        score: 0,
        triggerAI: false,
        stuckField: '',
        savedValue: '',
        error: `Telemetry processing error: ${message}`,
      },
      { status: 400 }
    );
  }
}
