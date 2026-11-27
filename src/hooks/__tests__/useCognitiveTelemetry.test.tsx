import { renderHook, act } from '@testing-library/react';
import { useCognitiveTelemetry } from '../useCognitiveTelemetry';
import { computeCognitiveScore } from '@/lib/scoring';

describe('trigger rule', () => {
  test('the score alone decides, like the backend (/api/heal-ui)', () => {
    // Rage clicks alone (40) or a pause alone (35) must not trigger: the backend would decline to generate.
    expect(computeCognitiveScore(0, 0, 6)).toEqual({ score: 40, triggerAI: false });
    expect(computeCognitiveScore(0, 8, 0)).toEqual({ score: 35, triggerAI: false });
    // Pause + rage clicks reach the threshold.
    expect(computeCognitiveScore(0, 5, 4)).toEqual({ score: 75, triggerAI: true });
    expect(computeCognitiveScore(120, 5, 4)).toEqual({ score: 85, triggerAI: true });
  });
});

describe('useCognitiveTelemetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, score: 0, triggerAI: false, stuckField: '', savedValue: '' }),
    }));
  });
  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).fetch;
  });

  test('re-rendering with a new onTriggerAI does not restart the timers', () => {
    // The page passes a new onTriggerAI function on every render. If that restarted the 1 s hesitation
    // timer, the 0.8 s telemetry replies would keep resetting it and pauseTime would stay 0.
    const spy = jest.spyOn(global, 'setInterval');
    const { rerender } = renderHook(() =>
      useCognitiveTelemetry({ enableWebSocket: false, streamingIntervalMs: 800, onTriggerAI: () => {} })
    );
    const afterMount = spy.mock.calls.length;
    for (let i = 0; i < 5; i++) rerender();
    expect(spy.mock.calls.length).toBe(afterMount);
    spy.mockRestore();
  });

  test('measures hesitation while telemetry replies keep arriving', async () => {
    // A new onTriggerAI on every render, exactly like the page passes it.
    const { result } = renderHook(() =>
      useCognitiveTelemetry({ enableWebSocket: false, streamingIntervalMs: 800, onTriggerAI: () => {} })
    );
    act(() => result.current.handleFieldFocus('annual_income', '72000'));

    for (let i = 0; i < 12; i++) {
      await act(async () => {
        jest.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve();
      });
    }
    expect(result.current.pauseTime).toBeGreaterThanOrEqual(5);
    expect(result.current.fieldValues).toEqual({});
    act(() => result.current.handleFieldChange('annual_income', '81000'));
    expect(result.current.fieldValues).toEqual({ annual_income: '81000' });
  });
});
