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
    <header className="border-b border-slate-200 bg-white shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Official Infotact Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 text-white shadow-sm font-black text-lg">
            IS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                INFOTACT SOLUTIONS
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                Enterprise Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Commercial Financing</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-600 font-medium">Underwriting Gateway</span>
            </p>
          </div>
        </div>

        {/* Right: Security & (Debug-only) Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
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
