'use client';

import React, { useState, useEffect } from 'react';
import { InfotactHeader } from '@/components/portal/InfotactHeader';
import { ComplexFinancialForm } from '@/components/portal/ComplexFinancialForm';
import { TelemetryMonitorHUD } from '@/components/telemetry/TelemetryMonitorHUD';
import { useCognitiveTelemetry } from '@/hooks/useCognitiveTelemetry';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  FileCode,
  Zap,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export default function AuraGenPortalPage() {
  const [isDebug, setIsDebug] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'portal' | 'contract'>('portal');
  const [backendUrl, setBackendUrl] = useState<string>('/api/telemetry');
  const [stuckField, setStuckField] = useState<string>('');
  const [savedValue, setSavedValue] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Check URL query param ?debug=true or NEXT_PUBLIC_SHOW_DEBUG=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const isDebugQuery = searchParams.get('debug') === 'true';
      const isDebugEnv = process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true';
      setIsDebug(isDebugQuery || isDebugEnv);
    }
  }, []);

  // Initialize Week 1 continuous telemetry tracker hook
  const {
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
    handleFieldFocus,
    handleFieldChange,
    handleFieldBlur,
    simulateFrictionScenario,
    resetTelemetry,
  } = useCognitiveTelemetry({
    backendUrl,
    enableWebSocket: true,
    streamingIntervalMs: 800,
    frictionThreshold: 70,
    onTriggerAI: (response) => {
      setStuckField(response.stuckField || 'annual_income');
      setSavedValue(response.savedValue || '');
      if (isDebug) {
        setNotification(
          `Friction Detected: Score ${response.score}/100. Field '${response.stuckField}' flagged with value '${response.savedValue}'.`
        );
        setTimeout(() => setNotification(null), 5000);
      }
    },
  });

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return { label: 'WebSocket Live', variant: 'success' as const };
      case 'reconnecting':
        return { label: 'Reconnecting...', variant: 'warning' as const };
      case 'http-fallback':
        return { label: 'HTTP Fallback Active', variant: 'warning' as const };
      case 'offline':
        return { label: 'Offline', variant: 'danger' as const };
    }
  };

  const connBadge = getConnectionBadge();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Infotact Header */}
      <InfotactHeader isDebug={isDebug} connectionStatus={connectionStatus} />

      {/* DEBUG-ONLY: Sub-Navigation Tabs */}
      {isDebug && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('portal')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'portal'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Interactive Application</span>
              </button>

              <button
                onClick={() => setActiveTab('contract')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'contract'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Backend Contract Inspector</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Single consistent connection badge */}
              <Badge variant={connBadge.variant} size="sm" dot>
                {connBadge.label}
              </Badge>

              {isTriggered && (
                <Badge variant="danger" size="sm" dot>
                  Friction Triggered
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEBUG-ONLY: Yellow Connection Fallback Banner */}
      {isDebug && connectionError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Connection Fallback:</strong> {connectionError}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 font-mono">Status: {connectionStatus}</span>
          </div>
        </div>
      )}

      {/* Floating System Notification in Debug Mode */}
      {isDebug && notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-9 md:py-11">
        {(!isDebug || activeTab === 'portal') && (
          <ComplexFinancialForm
            onFieldFocus={handleFieldFocus}
            onFieldChange={handleFieldChange}
            onFieldBlur={handleFieldBlur}
            isTriggered={isTriggered}
            stuckField={stuckField}
            savedValue={savedValue}
            cognitiveScore={cognitiveScore}
            onReset={resetTelemetry}
            isDebug={isDebug}
          />
        )}

        {/* DEBUG-ONLY: Contract Inspector Tab */}
        {isDebug && activeTab === 'contract' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Backend Telemetry Contract Verification
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The frontend streams interaction telemetry using the agreed key names.
                Any deviation in key names or types is strictly rejected with an HTTP 400 error.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Outgoing Specification */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      Outgoing Telemetry (Frontend → Backend)
                    </span>
                    <Badge variant="info" size="sm">
                      JSON
                    </Badge>
                  </div>
                  <pre className="text-xs font-mono bg-slate-900 text-cyan-300 p-3 rounded-lg overflow-x-auto">
{`{
  "mouseSpeed": 120,
  "pauseTime": 5,
  "rageClicks": 4,
  "fieldName": "annual_income",
  "userInput": "50000"
}`}
                  </pre>
                  <p className="text-[11px] text-slate-600">
                    Exact keys: <code>mouseSpeed</code>, <code>pauseTime</code>, <code>rageClicks</code>, <code>fieldName</code>, <code>userInput</code>.
                  </p>
                </div>

                {/* Incoming Specification */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Incoming Evaluation (Backend → Frontend)
                    </span>
                    <Badge variant="success" size="sm">
                      JSON 200 OK
                    </Badge>
                  </div>
                  <pre className="text-xs font-mono bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto">
{`{
  "success": true,
  "score": 85,
  "triggerAI": true,
  "stuckField": "annual_income",
  "savedValue": "50000"
}`}
                  </pre>
                  <p className="text-[11px] text-slate-600">
                    Exact keys: <code>success</code>, <code>score</code>, <code>triggerAI</code>, <code>stuckField</code>, <code>savedValue</code>.
                  </p>
                </div>
              </div>

              {/* Live Test Trigger */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Trigger immediate verification test with contract payload:
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => simulateFrictionScenario('contract-exact')}
                  isLoading={isSimulating}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Send Contract Spec Test
                </Button>
              </div>
            </div>

            {/* Last Received Response */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Last Backend Response Received ({lastResponseTime || 'None'})
              </h4>
              {lastResponse ? (
                <pre className="text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-slate-500 italic">No telemetry received yet</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* DEBUG-ONLY: Real-time Telemetry Monitor HUD (Floating Bottom Right / Left) */}
      {isDebug && (
        <TelemetryMonitorHUD
          mouseSpeed={mouseSpeed}
          pauseTime={pauseTime}
          rageClicks={rageClicks}
          activeFieldName={activeFieldName}
          activeUserInput={activeUserInput}
          cognitiveScore={cognitiveScore}
          isSimulating={isSimulating}
          isTriggered={isTriggered}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          lastResponse={lastResponse}
          lastResponseTime={lastResponseTime}
          onSimulate={simulateFrictionScenario}
          onReset={resetTelemetry}
          backendUrl={backendUrl}
          onBackendUrlChange={setBackendUrl}
        />
      )}
    </div>
  );
}
