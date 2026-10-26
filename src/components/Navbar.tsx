import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  Shield,
  Wifi,
  WifiOff,
  Users,
  Settings,
  HelpCircle,
  Activity,
  Copy,
  Check,
  RotateCcw,
  BarChart3,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    partyCode,
    connectedTabsCount,
    isOfflineDemo,
    setIsOfflineDemo,
    lastSavedAt,
    offlineQueue,
    setIsDemoTourOpen,
    setIsDiagnosticsOpen,
    setIsPartyModalOpen,
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
    isFirebaseConnected,
    resetDemo,
  } = useSahyog();

  const [copied, setCopied] = React.useState(false);

  const copyPartyCode = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?code=${partyCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* SAHYOG Shield Logo */}
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-emerald-300 fill-emerald-400/20" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-slate-900">
                SAHYOG
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Simulation Mode
              </span>
            </div>
            <span className="text-[10px] text-slate-500 hidden md:inline leading-none font-medium">
              Connected Teams · Safer Missions
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Party Code & Connection Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Common Party Code Button */}
        <button
          onClick={() => setIsPartyModalOpen(true)}
          title="Team Party Code - Click to invite or switch squads"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline text-slate-500">Party:</span>
          <span className="font-mono font-bold text-slate-900">{partyCode}</span>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-mono">
            {connectedTabsCount} link{connectedTabsCount > 1 ? 's' : ''}
          </span>
        </button>

        {/* Quick Link Share */}
        <button
          onClick={copyPartyCode}
          title="Copy direct invite link with this Party Code"
          className="hidden md:flex items-center gap-1 p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 text-xs transition-colors"
        >
          {copied ? (
            <span className="text-emerald-600 flex items-center gap-1 text-[11px] font-medium">
              <Check className="w-3.5 h-3.5" /> Copied!
            </span>
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Connectivity Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs">
          {isOfflineDemo ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
              <WifiOff className="w-3 h-3 text-amber-600" />
              <span>Offline Demo</span>
              {offlineQueue.length > 0 && (
                <span className="bg-amber-600 text-white text-[9px] px-1 rounded-full font-mono">
                  {offlineQueue.length}
                </span>
              )}
            </div>
          ) : isFirebaseConnected ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firestore Cloud Sync</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected</span>
            </div>
          )}
        </div>

        {/* Last Saved Stamp */}
        <div className="hidden xl:flex items-center text-[11px] text-slate-400 font-mono">
          Last Saved: {lastSavedAt}
        </div>
      </div>

      {/* Right Controls: Offline Toggle, Tour, Diagnostics, Reset */}
      <div className="flex items-center gap-2">
        {/* Offline Demo Toggle */}
        <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <label
            htmlFor="offline-toggle"
            className="text-xs font-semibold text-slate-700 cursor-pointer select-none flex items-center gap-1.5"
          >
            {isOfflineDemo ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">Offline Mode</span>
          </label>
          <input
            id="offline-toggle"
            type="checkbox"
            checked={isOfflineDemo}
            onChange={(e) => setIsOfflineDemo(e.target.checked)}
            className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
          />
        </div>

        {/* 90-Sec Demo Guide Button */}
        <button
          onClick={() => setIsDemoTourOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Demo Guide (90s)</span>
          <span className="sm:hidden">Demo</span>
        </button>

        {/* Analytics Overlay Button */}
        <button
          onClick={() => setIsAnalyticsOverlayOpen(!isAnalyticsOverlayOpen)}
          title="Open Map Analytical Telemetry Overlay (Recharts)"
          className={`p-1.5 rounded-md transition-colors ${
            isAnalyticsOverlayOpen
              ? 'bg-slate-900 text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Diagnostics Button */}
        <button
          onClick={() => setIsDiagnosticsOpen(true)}
          title="Run system integrity diagnostics"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Reset Demo Button */}
        <button
          onClick={resetDemo}
          title="Reset demonstration state"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
