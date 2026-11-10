'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPayload, TelemetryResponse } from '@/types/telemetry';
import { computeCognitiveScore } from '@/lib/scoring';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'http-fallback' | 'offline';

interface UseCognitiveTelemetryOptions {
  backendUrl?: string;
  webSocketUrl?: string;
  enableWebSocket?: boolean;
  streamingIntervalMs?: number; // 500 to 1000ms
  onTriggerAI?: (response: TelemetryResponse) => void;
  frictionThreshold?: number; // default: 70
}

/**
 * Week 1 Telemetry Tracker Hook
 *
 * Implements:
 * 1. Configurable WebSocket stream (NEXT_PUBLIC_TELEMETRY_WS_URL, default ws://localhost:5000/ws/telemetry).
 *    - Connected: Streams only via WebSocket (zero HTTP calls).
 *    - Dropped: Reconnects automatically and falls back to HTTP POST until reconnected.
 * 2. Field-level hesitation: Pause time measures only the actively focused field; typing or blur resets.
 * 3. Decay mechanics:
 *    - Mouse speed drops to 0 after 250ms of stillness.
 *    - Rage clicks decay by 1 every 2s, allowing score to return to 0 baseline.
 * 4. Separate isSimulating state to prevent simulation buttons from hanging in loading state.
 * 5. Score Baseline: 0 when zero activity (mouseSpeed: 0, pauseTime: 0, rageClicks: 0).
 */
export function useCognitiveTelemetry(options: UseCognitiveTelemetryOptions = {}) {
  const {
    backendUrl = '/api/telemetry',
    webSocketUrl = process.env.NEXT_PUBLIC_TELEMETRY_WS_URL || 'ws://localhost:5000/ws/telemetry',
    enableWebSocket = true,
    streamingIntervalMs = 800,
    onTriggerAI,
    frictionThreshold = 70,
  } = options;

  // Real-time telemetry values (no hardcoded defaults)
  const [mouseSpeed, setMouseSpeed] = useState<number>(0);
  const [pauseTime, setPauseTime] = useState<number>(0);
  const [rageClicks, setRageClicks] = useState<number>(0);
  const [activeFieldName, setActiveFieldName] = useState<string>('');
  const [activeUserInput, setActiveUserInput] = useState<string>('');
  const [cognitiveScore, setCognitiveScore] = useState<number>(0);

  // States
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false); // Separate simulation state
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<TelemetryResponse | null>(null);
  const [lastResponseTime, setLastResponseTime] = useState<string | null>(null);

  // Tracking refs
  const lastMousePosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recentClicksRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastFieldActionTimeRef = useRef<number | null>(null);
  const speedSamplesRef = useRef<number[]>([]);
  const hasTriggeredRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isFocusedRef = useRef<boolean>(false);
  const activeFieldRef = useRef<string>('');
  const activeInputRef = useRef<string>('');
  const wsConnectedRef = useRef<boolean>(false);

  // Synchronize ref mirrors
  useEffect(() => {
    activeFieldRef.current = activeFieldName;
    activeInputRef.current = activeUserInput;
  }, [activeFieldName, activeUserInput]);

  // Handle incoming response from either WebSocket or HTTP
  const handleIncomingResponse = useCallback(
    (data: TelemetryResponse) => {
      setLastResponse(data);
      setLastResponseTime(new Date().toLocaleTimeString());

      if (typeof data.score === 'number') {
        setCognitiveScore(data.score);
      }

      if (data.triggerAI && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsTriggered(true);
        onTriggerAI?.(data);
      }
    },
    [onTriggerAI]
  );

  // 1. WebSocket Lifecycle Management
  useEffect(() => {
    if (!enableWebSocket || typeof window === 'undefined') {
      setConnectionStatus('http-fallback');
      return;
    }

    let isUnmounted = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      if (isUnmounted) return;

      try {
        setConnectionStatus((prev) => (prev === 'connected' ? 'reconnecting' : prev));
        socket = new WebSocket(webSocketUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (isUnmounted) return;
          wsConnectedRef.current = true;
          setConnectionStatus('connected');
          setConnectionError(null);
        };

        socket.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data: TelemetryResponse = JSON.parse(event.data);
            handleIncomingResponse(data);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        socket.onerror = () => {
          if (isUnmounted) return;
          wsConnectedRef.current = false;
          setConnectionStatus('http-fallback');
          setConnectionError(`WebSocket unreachable at ${webSocketUrl}. Active HTTP fallback stream.`);
        };

        socket.onclose = () => {
          if (isUnmounted) return;
          wsConnectedRef.current = false;
          setConnectionStatus('reconnecting');
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (err) {
        wsConnectedRef.current = false;
        setConnectionStatus('http-fallback');
        setConnectionError('WebSocket initialization failed. Using HTTP fallback.');
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      wsConnectedRef.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [enableWebSocket, webSocketUrl, handleIncomingResponse]);

  // Transmit telemetry payload
  const sendTelemetry = useCallback(
    async (
      overridePayload?: Partial<TelemetryPayload>,
      options: { isSimulation?: boolean } = {}
    ): Promise<TelemetryResponse | null> => {
      const payload: TelemetryPayload = {
        mouseSpeed: Math.round(overridePayload?.mouseSpeed ?? mouseSpeed),
        pauseTime: Math.round(overridePayload?.pauseTime ?? pauseTime),
        rageClicks: overridePayload?.rageClicks ?? rageClicks,
        fieldName: overridePayload?.fieldName ?? activeFieldRef.current ?? '',
        userInput: overridePayload?.userInput ?? activeInputRef.current ?? '',
      };

      // 1. If WebSocket is connected, transmit ONLY via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(payload));
          setConnectionStatus('connected');
          setConnectionError(null);
          return null;
        } catch (err) {
          console.warn('WebSocket send error, falling back to HTTP:', err);
          wsConnectedRef.current = false;
          setConnectionStatus('http-fallback');
        }
      }

      // 2. HTTP POST fallback (only when WebSocket is NOT connected)
      try {
        if (!options.isSimulation) {
          setIsTransmitting(true);
        }

        const res = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data: TelemetryResponse = await res.json();
        handleIncomingResponse(data);
        setConnectionStatus((prev) => (prev === 'connected' ? 'connected' : 'http-fallback'));
        setConnectionError(null);
        return data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Connection failed';
        setConnectionStatus('offline');
        setConnectionError(`Telemetry backend unreachable (${message}). Verify backend at ${backendUrl}.`);
        return null;
      } finally {
        if (!options.isSimulation) {
          setIsTransmitting(false);
        }
      }
    },
    [mouseSpeed, pauseTime, rageClicks, backendUrl, handleIncomingResponse]
  );

  // Continuous Telemetry Streaming Loop (Runs every 0.5s–1s)
  useEffect(() => {
    const streamInterval = setInterval(() => {
      // Send sample continuously
      sendTelemetry();
    }, streamingIntervalMs);

    return () => clearInterval(streamInterval);
  }, [streamingIntervalMs, sendTelemetry]);

  // 2. Mouse Velocity Tracking with Automatic Stop Decay to 0
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();

      if (lastMousePosRef.current) {
        const dt = (now - lastMousePosRef.current.time) / 1000;
        if (dt > 0.016) {
          const dx = e.clientX - lastMousePosRef.current.x;
          const dy = e.clientY - lastMousePosRef.current.y;
          const distance = Math.hypot(dx, dy);
          const currentSpeed = distance / dt;

          speedSamplesRef.current.push(currentSpeed);
          if (speedSamplesRef.current.length > 6) {
            speedSamplesRef.current.shift();
          }

          const avgSpeed =
            speedSamplesRef.current.reduce((a, b) => a + b, 0) /
            speedSamplesRef.current.length;
          setMouseSpeed(Math.round(avgSpeed));
        }
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY, time: now };

      // Reset mouse stop timer: when mouse stops for >250ms, velocity drops to 0
      if (mouseStopTimerRef.current) clearTimeout(mouseStopTimerRef.current);
      mouseStopTimerRef.current = setTimeout(() => {
        setMouseSpeed(0);
        speedSamplesRef.current = [];
      }, 250);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseStopTimerRef.current) clearTimeout(mouseStopTimerRef.current);
    };
  }, []);

  // 3. Click Pattern Tracking with Decay
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const now = Date.now();

      const recent = recentClicksRef.current.filter((c) => now - c.time < 700);
      recent.push({ x: e.clientX, y: e.clientY, time: now });
      recentClicksRef.current = recent;

      let count = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        const dist = Math.hypot(e.clientX - recent[i].x, e.clientY - recent[i].y);
        if (dist <= 45) {
          count++;
        }
      }

      if (count >= 2) {
        setRageClicks((prev) => Math.max(prev, count));
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Rage Clicks Natural Decay Loop (subtracts 1 every 2 seconds of inactivity)
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setRageClicks((prev) => (prev > 0 ? prev - 1 : 0));
    }, 2000);

    return () => clearInterval(decayInterval);
  }, []);

  // 4. Field-Level Hesitation Timer (Measures ONLY currently focused field)
  useEffect(() => {
    const hesitationInterval = setInterval(() => {
      if (isFocusedRef.current && lastFieldActionTimeRef.current !== null) {
        const elapsedSeconds = Math.floor((Date.now() - lastFieldActionTimeRef.current) / 1000);
        setPauseTime(elapsedSeconds);

        const { score } = computeCognitiveScore(mouseSpeed, elapsedSeconds, rageClicks);
        setCognitiveScore(score);

        if (
          !hasTriggeredRef.current &&
          (score >= frictionThreshold || rageClicks >= 3 || elapsedSeconds >= 5)
        ) {
          sendTelemetry({
            pauseTime: elapsedSeconds,
            rageClicks,
            mouseSpeed,
            fieldName: activeFieldRef.current,
            userInput: activeInputRef.current,
          });
        }
      } else {
        setPauseTime(0);
        const { score } = computeCognitiveScore(mouseSpeed, 0, rageClicks);
        setCognitiveScore(score);
      }
    }, 1000);

    return () => clearInterval(hesitationInterval);
  }, [mouseSpeed, rageClicks, frictionThreshold, sendTelemetry]);

  // Field focus, change, and blur handlers
  const handleFieldFocus = useCallback((fieldName: string, currentValue: string = '') => {
    isFocusedRef.current = true;
    lastFieldActionTimeRef.current = Date.now();
    setActiveFieldName(fieldName);
    setActiveUserInput(currentValue);
    setPauseTime(0);
  }, []);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    isFocusedRef.current = true;
    lastFieldActionTimeRef.current = Date.now();
    setActiveFieldName(fieldName);
    setActiveUserInput(value);
    setPauseTime(0); // Typing resets hesitation on this field
  }, []);

  const handleFieldBlur = useCallback(() => {
    isFocusedRef.current = false;
    lastFieldActionTimeRef.current = null;
    setPauseTime(0); // Leaving field resets pause time
  }, []);

  // Separate simulation runner that does not hang UI buttons
  const simulateFrictionScenario = useCallback(
    async (scenario: 'contract-exact' | 'high-hesitation' | 'rage-clicks') => {
      try {
        setIsSimulating(true);

        let simPayload: TelemetryPayload;
        if (scenario === 'contract-exact') {
          simPayload = {
            mouseSpeed: 120,
            pauseTime: 5,
            rageClicks: 4,
            fieldName: activeFieldRef.current || 'annual_income',
            userInput: activeInputRef.current || '50000',
          };
        } else if (scenario === 'high-hesitation') {
          simPayload = {
            mouseSpeed: 15,
            pauseTime: 8,
            rageClicks: 1,
            fieldName: activeFieldRef.current || 'annual_income',
            userInput: activeInputRef.current || '50000',
          };
        } else {
          simPayload = {
            mouseSpeed: 320,
            pauseTime: 2,
            rageClicks: 5,
            fieldName: activeFieldRef.current || 'annual_income',
            userInput: activeInputRef.current || '50000',
          };
        }

        setMouseSpeed(simPayload.mouseSpeed);
        setPauseTime(simPayload.pauseTime);
        setRageClicks(simPayload.rageClicks);
        setActiveFieldName(simPayload.fieldName);
        setActiveUserInput(simPayload.userInput);

        return await sendTelemetry(simPayload, { isSimulation: true });
      } finally {
        setIsSimulating(false);
      }
    },
    [sendTelemetry]
  );

  const resetTelemetry = useCallback(() => {
    hasTriggeredRef.current = false;
    setIsTriggered(false);
    setRageClicks(0);
    setPauseTime(0);
    setMouseSpeed(0);
    setCognitiveScore(0);
    setLastResponse(null);
    setLastResponseTime(null);
    lastFieldActionTimeRef.current = isFocusedRef.current ? Date.now() : null;
  }, []);

  return {
    mouseSpeed,
    pauseTime,
    rageClicks,
    activeFieldName,
    activeUserInput,
    cognitiveScore,
    isTransmitting,
    isSimulating,
    isTriggered,
    connectionStatus,
    connectionError,
    lastResponse,
    lastResponseTime,
    handleFieldFocus,
    handleFieldChange,
    handleFieldBlur,
    sendTelemetry,
    simulateFrictionScenario,
    resetTelemetry,
    setIsTriggered,
  };
}
