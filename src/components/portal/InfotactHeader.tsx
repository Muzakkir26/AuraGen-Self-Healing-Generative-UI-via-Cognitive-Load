'use client';

import React from 'react';
import { ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConnectionStatus } from '@/hooks/useCognitiveTelemetry';

interface InfotactHeaderProps {
  isDebug?: boolean;
  connectionStatus?: ConnectionStatus;
}

export function InfotactHeader({ isDebug = false, connectionStatus = 'connected' }: InfotactHeaderProps) {
  const getConnectionBadge = (conn: ConnectionStatus) => {
    switch (conn) {
      case 'connected':
        return { label: 'WebSocket Live', variant: 'success' as const, icon: <Wifi className="w-3 h-3 mr-1" /> };
      case 'reconnecting':
        return { label: 'WS Reconnecting', variant: 'warning' as const, icon: <WifiOff className="w-3 h-3 mr-1" /> };
      case 'http-fallback':
        return { label: 'HTTP Stream Fallback', variant: 'warning' as const, icon: <Wifi className="w-3 h-3 mr-1" /> };
      case 'offline':
        return { label: 'Telemetry Offline', variant: 'danger' as const, icon: <WifiOff className="w-3 h-3 mr-1" /> };
    }
  };

  const badge = getConnectionBadge(connectionStatus);

  return (
    <header className="aura-header sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Official Infotact Brand */}
        <div className="flex items-center gap-3">
          <div className="aura-brand-mark flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-500 text-white font-black text-lg tracking-tight">
            A<span className="text-cyan-200">.</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                AuraGen <span className="font-semibold text-slate-400">/</span> <span className="text-slate-600">Infotact</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-1 rounded-full text-[9px] font-extrabold tracking-wider bg-violet-50 text-violet-700 border border-violet-100 uppercase">
                Smart Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Adaptive experience</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-semibold">Cognitive-aware workflow</span>
            </p>
          </div>
        </div>

        {/* Right: Security & (Debug-only) Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-white/80 px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit Encrypted Underwriting</span>
          </div>

          {/* Show single consistent connection state ONLY in debug mode */}
          {isDebug && (
            <Badge variant={badge.variant} size="md" dot>
              {badge.icon}
              <span>{badge.label}</span>
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
