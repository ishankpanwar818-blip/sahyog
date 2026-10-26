import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import { SidebarAnalyticsTab } from './SidebarAnalyticsTab';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Flag,
  ShieldAlert,
  History,
  Activity,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  PlusCircle,
  Clock,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Radio,
  BarChart3,
  Trash2,
  UserPlus,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    partyCode,
    missionName,
    setIsPartyModalOpen,
    members,
    selectedMemberId,
    setSelectedMemberId,
    activeTab,
    setActiveTab,
    events,
    checkpoint,
    isSettingCheckpoint,
    setIsSettingCheckpoint,
    simulation,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    triggerDemoEmergency,
    resetDemo,
    setIsCheckpointsModalOpen,
    setIsMessagesModalOpen,
    setIsAlertsModalOpen,
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
    messages,
    activeAlert,
    setIsDeployModalOpen,
    removeOperative,
  } = useSahyog();

  // Status counts
  const totalMembers = members.length;
  const safeCount = members.filter((m) => m.status === 'safe').length;
  const cautionCount = members.filter((m) => m.status === 'caution').length;
  const emergencyCount = members.filter((m) => m.status === 'emergency').length;

  return (
    <aside className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Squad Mission Header */}
      <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 font-mono font-black text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SQUAD {partyCode}</span>
          </div>
          <span className="text-[10px] text-slate-300 truncate max-w-[190px] block font-medium">
            {missionName}
          </span>
        </div>
        <button
          onClick={() => setIsPartyModalOpen(true)}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium border border-slate-700 transition-colors"
        >
          Party Code
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-2 border-b border-slate-100 flex flex-col gap-0.5">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'team'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4" />
            <span>Team Members</span>
          </div>
          <span className="text-[11px] font-mono opacity-80">{totalMembers}</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>Analytics</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono">
            Recharts
          </span>
        </button>

        <button
          onClick={() => setIsMessagesModalOpen(true)}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
          </div>
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-full font-mono font-bold">
            {messages.length}
          </span>
        </button>

        <button
          onClick={() => setIsCheckpointsModalOpen(true)}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Flag className="w-4 h-4" />
            <span>Checkpoints</span>
          </div>
          {checkpoint && (
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          )}
        </button>

        <button
          onClick={() => setIsAlertsModalOpen(true)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            emergencyCount > 0
              ? 'bg-red-50 text-red-700 hover:bg-red-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Emergency Alerts</span>
          </div>
          {emergencyCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] rounded-full font-mono font-bold animate-pulse">
              {emergencyCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsAnalyticsOverlayOpen(!isAnalyticsOverlayOpen)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isAnalyticsOverlayOpen
              ? 'bg-slate-900 text-emerald-400 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Map HUD Overlay</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded font-mono">
            HUD
          </span>
        </button>
      </div>

      {/* Team Status Counters Widget (Matches mockup) */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Team Status
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-base font-extrabold text-slate-900 font-mono">{totalMembers}</div>
            <div className="text-[10px] text-slate-500">Total</div>
          </div>
          <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
            <div className="text-base font-extrabold text-emerald-700 font-mono">{safeCount}</div>
            <div className="text-[10px] text-emerald-800 font-medium">Safe</div>
          </div>
          <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 shadow-2xs">
            <div className="text-base font-extrabold text-amber-700 font-mono">{cautionCount}</div>
            <div className="text-[10px] text-amber-800 font-medium">Caution</div>
          </div>
          <div className="bg-red-50/60 p-2 rounded-lg border border-red-200/60 shadow-2xs">
            <div className="text-base font-extrabold text-red-700 font-mono">{emergencyCount}</div>
            <div className="text-[10px] text-red-800 font-medium">Alerts</div>
          </div>
        </div>
      </div>

      {/* Checkpoint Action Quick Button */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={() => setIsSettingCheckpoint(!isSettingCheckpoint)}
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
            isSettingCheckpoint
              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : checkpoint
              ? 'bg-slate-900 hover:bg-slate-800 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>{isSettingCheckpoint ? 'Click on Map to Place Flag' : checkpoint ? 'Relocate Checkpoint' : 'SET ASSEMBLY POINT'}</span>
        </button>
      </div>

      {/* Tab Content: Team Members List OR Activity Timeline */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'team' ? (
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Squad Personnel ({totalMembers})
              </span>
              <button
                onClick={() => setIsDeployModalOpen(true)}
                className="px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                title="Deploy real responder to squad database"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Deploy</span>
              </button>
            </div>
            {members.map((m) => {
              const isSelected = selectedMemberId === m.id;
              const isEmergency = m.status === 'emergency';
              const isCaution = m.status === 'caution';

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100/80 border-slate-400 shadow-xs'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        isEmergency
                          ? 'bg-red-600'
                          : isCaution
                          ? 'bg-amber-500'
                          : m.isCurrentUser
                          ? 'bg-blue-600'
                          : 'bg-emerald-700'
                      }`}
                    >
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {m.name}
                        </span>
                        {m.isCurrentUser && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {m.callsign} · {m.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isEmergency
                          ? 'bg-red-100 text-red-800'
                          : isCaution
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isEmergency ? 'Emergency' : isCaution ? 'Caution' : 'Safe'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {m.battery}%
                    </span>
                    {!m.isCurrentUser && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Decommission ${m.name} from squad database?`)) {
                            removeOperative(m.id);
                          }
                        }}
                        title="Decommission operative from database"
                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeTab === 'analytics' ? (
          <SidebarAnalyticsTab />
        ) : (
          /* Recent Activity Timeline */
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recent Activity
              </span>
              <span className="text-[10px] text-slate-400">{events.length} logs</span>
            </div>
            <div className="space-y-2">
              {events.slice(0, 15).map((evt) => {
                const isEmergency = evt.severity === 'emergency';
                const isCaution = evt.severity === 'caution';

                return (
                  <div
                    key={evt.id}
                    className={`p-2 rounded-lg border text-xs transition-colors ${
                      isEmergency
                        ? 'bg-red-50/70 border-red-200'
                        : isCaution
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50/60 border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {evt.actor}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className={`font-medium ${isEmergency ? 'text-red-900 font-bold' : 'text-slate-800'}`}>
                      {evt.title}
                    </p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                      {evt.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tactical Field Operations & SOS Emergency Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600" />
            Squad Telemetry & SOS
          </span>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
            Cloud Live
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
            title="Deploy real responder to squad database"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deploy</span>
          </button>

          <button
            onClick={triggerDemoEmergency}
            title="Broadcast Immediate Field SOS Distress Beacon"
            className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SOS BEACON</span>
          </button>

          <button
            onClick={resetDemo}
            title="Reset squad records in database to clean baseline"
            className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
