'use client';

import React, { useState } from 'react';
import { TelemetryPayload, TelemetryResponse } from '@/types/telemetry';
import { ConnectionStatus } from '@/hooks/useCognitiveTelemetry';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import {
  Activity,
  MousePointer,
  Clock,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Server,
  Code2,
  Wifi,
  AlertTriangle,
  MoveHorizontal,
} from 'lucide-react';

interface TelemetryMonitorHUDProps {
  mouseSpeed: number;
  pauseTime: number;
  rageClicks: number;
  activeFieldName: string;
  activeUserInput: string;
  cognitiveScore: number;
  isSimulating: boolean;
  isTriggered: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  lastResponse: TelemetryResponse | null;
  lastResponseTime: string | null;
  onSimulate: (scenario: 'contract-exact' | 'high-hesitation' | 'rage-clicks') => void;
  onReset: () => void;
  backendUrl: string;
  onBackendUrlChange: (url: string) => void;
}

export function TelemetryMonitorHUD({
  mouseSpeed,
  pauseTime,
  rageClicks,
  activeFieldName,
  activeUserInput,
  cognitiveScore,
  isSimulating,
  isTriggered,
  connectionStatus,
  connectionError,
  lastResponse,
  lastResponseTime,
  onSimulate,
  onReset,
  backendUrl,
  onBackendUrlChange,
}: TelemetryMonitorHUDProps) {
  // Collapsed by default as requested
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [dockPosition, setDockPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);

  // Exact contract payload preview
  const currentPayload: TelemetryPayload = {
    mouseSpeed: Math.round(mouseSpeed),
    pauseTime: Math.round(pauseTime),
    rageClicks,
    fieldName: activeFieldName || '',
    userInput: activeUserInput || '',
  };

  const getScoreStatus = (score: number) => {
    if (score >= 70) return { label: 'High Friction', variant: 'danger' as const };
    if (score >= 40) return { label: 'Hesitation', variant: 'warning' as const };
    return { label: 'Normal Flow', variant: 'success' as const };
  };

  const status = getScoreStatus(cognitiveScore);

  const getConnectionBadge = (conn: ConnectionStatus) => {
    switch (conn) {
      case 'connected':
        return { label: 'Connected', variant: 'success' as const };
      case 'reconnecting':
        return { label: 'Reconnecting', variant: 'warning' as const };
      case 'http-fallback':
        return { label: 'HTTP Fallback', variant: 'warning' as const };
      case 'offline':
        return { label: 'Offline', variant: 'danger' as const };
    }
  };

  const connBadge = getConnectionBadge(connectionStatus);

  return (
    <aside
      aria-label="Cognitive Telemetry Engine"
      className={`fixed bottom-4 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-200 ${
        dockPosition === 'bottom-right' ? 'right-4' : 'left-4'
      }`}
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wide uppercase text-slate-200">
                Telemetry HUD
              </h2>
              <Badge variant={connBadge.variant} size="sm" dot>
                {connBadge.label}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">
              {lastResponseTime ? `Last update: ${lastResponseTime}` : 'Cognitive Friction Tracker'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Docking Toggle (Bottom-Right <-> Bottom-Left) */}
          <button
            onClick={() =>
              setDockPosition((prev) => (prev === 'bottom-right' ? 'bottom-left' : 'bottom-right'))
            }
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={`Dock to ${dockPosition === 'bottom-right' ? 'bottom-left' : 'bottom-right'}`}
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3.5 text-xs">
          {/* Connection Error Message */}
          {connectionError && (
            <div className="rounded-lg bg-amber-950/50 border border-amber-500/40 p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="leading-tight">
                <p className="font-semibold">Connection Notice</p>
                <p className="text-[10px] text-amber-300/80">{connectionError}</p>
              </div>
            </div>
          )}

          {/* Cognitive Load Score Meter */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Cognitive Load Score
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {cognitiveScore} / 100
              </span>
            </div>
            <ProgressBar value={cognitiveScore} colorScheme="auto" size="md" />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Threshold: 70 pts</span>
              <span>
                Status: {isTriggered ? 'Friction Triggered' : cognitiveScore >= 70 ? 'High Friction' : 'Normal'}
              </span>
            </div>
          </div>

          {/* Real-time Telemetry Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Mouse Speed */}
            <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MousePointer className="w-3 h-3 text-cyan-400" />
                <span>mouseSpeed</span>
              </div>
              <p className="font-mono text-sm font-semibold text-white">
                {Math.round(mouseSpeed)} <span className="text-[10px] text-slate-400 font-normal">px/s</span>
              </p>
            </div>

            {/* Field Pause Time */}
            <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>pauseTime</span>
              </div>
              <p className="font-mono text-sm font-semibold text-white">
                {Math.round(pauseTime)} <span className="text-[10px] text-slate-400 font-normal">s</span>
              </p>
            </div>

            {/* Rage Clicks */}
            <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>rageClicks</span>
              </div>
              <p className="font-mono text-sm font-semibold text-white">
                {rageClicks} <span className="text-[10px] text-slate-400 font-normal">clicks</span>
              </p>
            </div>
          </div>

          {/* Active Target Field Info */}
          <div className="px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Focused Field:</span>
            <code className="text-cyan-300 font-mono font-medium">
              {activeFieldName ? activeFieldName : '(none - click a field)'}
            </code>
          </div>

          {/* Simulation & Test Controls - Using isSimulating (no permanent button hang!) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Contract Testing & Simulations
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSimulate('contract-exact')}
                isLoading={isSimulating}
                className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 text-xs py-1.5"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-400" />}
              >
                Send Contract Spec
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSimulate('rage-clicks')}
                isLoading={isSimulating}
                className="w-full bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs py-1.5"
                leftIcon={<Flame className="w-3.5 h-3.5 text-rose-400" />}
              >
                Simulate Rage Click
              </Button>
            </div>
          </div>

          {/* Backend Contract JSON Inspector Toggle */}
          <div className="pt-1">
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-[11px] text-slate-300"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                Contract Payload & Response
              </span>
              <span>{showJsonInspector ? 'Hide' : 'View JSON'}</span>
            </button>

            {showJsonInspector && (
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto text-[10px] font-mono rounded-lg bg-black/60 p-2.5 border border-slate-800">
                <div>
                  <p className="text-cyan-400 font-semibold mb-1">// Outgoing Telemetry Sample:</p>
                  <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(currentPayload, null, 2)}
                  </pre>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-emerald-400 font-semibold mb-1">
                    // Last Backend Response ({lastResponseTime || 'none'}):
                  </p>
                  {lastResponse ? (
                    <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(lastResponse, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-500 italic">No telemetry received yet</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Backend Target Settings & Reset */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
            <div className="flex items-center gap-1 text-slate-400">
              <Server className="w-3 h-3 text-slate-500" />
              <span>Target:</span>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => onBackendUrlChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 w-28 focus:outline-none focus:border-blue-500"
                title="API endpoint"
              />
            </div>
            <button
              onClick={onReset}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              title="Reset friction state"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
