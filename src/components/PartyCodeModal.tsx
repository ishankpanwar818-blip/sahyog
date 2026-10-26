import React, { useState, useEffect } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  Users,
  Copy,
  Check,
  Shield,
  Plus,
  Radio,
  ExternalLink,
  X,
  Share2,
  AlertTriangle,
  Compass,
  Layers,
} from 'lucide-react';

export const PartyCodeModal: React.FC = () => {
  const {
    partyCode,
    setPartyCode,
    missionName,
    missionObjective,
    createNewParty,
    allParties,
    fetchAllParties,
    connectedTabsCount,
    isPartyModalOpen,
    setIsPartyModalOpen,
    addEvent,
    isBackendConnected,
  } = useSahyog();

  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [joinInputCode, setJoinInputCode] = useState(partyCode);
  const [newCode, setNewCode] = useState('');
  const [newMissionName, setNewMissionName] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isPartyModalOpen) {
      fetchAllParties();
    }
  }, [isPartyModalOpen, fetchAllParties]);

  if (!isPartyModalOpen) return null;

  const handleJoin = (codeToJoin: string) => {
    const cleaned = codeToJoin.trim().toUpperCase();
    if (!cleaned) return;
    setPartyCode(cleaned);
    addEvent({
      type: 'party_connected',
      actor: 'Commander (You)',
      title: `Connected to Squad ${cleaned}`,
      description: `Switching tactical frequency and squad telemetry to Party Code ${cleaned}.`,
      severity: 'normal',
    });
    setIsPartyModalOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setIsSubmitting(true);
    const clean = newCode.trim().toUpperCase();
    await createNewParty(
      clean,
      newMissionName.trim() || `Operation ${clean}`,
      newObjective.trim() || 'Tactical search and disaster coordinate tracking'
    );
    setIsSubmitting(false);
    setIsPartyModalOpen(false);
    addEvent({
      type: 'party_connected',
      actor: 'Commander (You)',
      title: `Created New Squad ${clean}`,
      description: `Initialized shared mission network for squad ${clean}.`,
      severity: 'normal',
    });
  };

  const copyInviteLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?code=${partyCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-800 text-emerald-300 shadow-2xs">
              <Shield className="w-5 h-5 fill-emerald-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Squad Party Code Network</h3>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                  {isBackendConnected ? 'Realtime Backend' : 'Local Channel'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Synchronize multiple field units under a common tactical frequency
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPartyModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Join Existing vs Create New */}
        <div className="flex border-b border-slate-200 px-5 pt-3 bg-white">
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'join'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Join or Switch Squad</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Party Code</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Current Mission Context Banner */}
          <div className="p-3.5 rounded-lg bg-slate-900 text-white shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Active Mission Party
                </span>
                <span className="text-xl font-black font-mono tracking-wider text-emerald-400">
                  {partyCode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Connected Links</span>
                <span className="text-xs font-semibold bg-slate-800 text-emerald-300 px-2.5 py-0.5 rounded font-mono border border-slate-700 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {connectedTabsCount} active device/tab
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800 text-xs">
              <p className="font-semibold text-slate-200">{missionName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{missionObjective}</p>
            </div>
          </div>

          {/* Quick Invite Link */}
          <button
            onClick={copyInviteLink}
            className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Team Invite URL Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy Shareable Team Link (with Party Code)</span>
              </>
            )}
          </button>

          {activeTab === 'join' ? (
            <div className="space-y-4">
              {/* Direct Party Code Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Enter Party Code to Connect:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinInputCode}
                    onChange={(e) => setJoinInputCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BRAVO-2 or RESCUE-1"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    onClick={() => handleJoin(joinInputCode)}
                    disabled={!joinInputCode.trim()}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Available Active Squads List from Backend */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Active Mission Squads
                  </span>
                  <button
                    onClick={() => fetchAllParties()}
                    className="text-[11px] text-emerald-700 hover:underline font-medium"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-2">
                  {allParties.length === 0 ? (
                    ['ALPHA-7', 'BRAVO-2', 'DELTA-9'].map((code) => (
                      <button
                        key={code}
                        onClick={() => handleJoin(code)}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          partyCode === code
                            ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-slate-900">
                              {code}
                            </span>
                            {partyCode === code && (
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {code === 'ALPHA-7'
                              ? 'Operation Himalayan Shield (Casualty Extraction)'
                              : code === 'BRAVO-2'
                              ? 'Operation Valley Storm (Flash Flood Recon)'
                              : 'Operation Mountain Beacon (Perimeter Watch)'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">Join →</span>
                      </button>
                    ))
                  ) : (
                    allParties.map((p) => (
                      <button
                        key={p.partyCode}
                        onClick={() => handleJoin(p.partyCode)}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          partyCode === p.partyCode
                            ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-slate-900">
                              {p.partyCode}
                            </span>
                            {partyCode === p.partyCode && (
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 rounded">
                                Active Squad
                              </span>
                            )}
                            {p.activeEmergencies > 0 && (
                              <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {p.activeEmergencies} Alert
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-700 font-medium line-clamp-1">
                            {p.missionName}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {p.missionObjective}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {p.memberCount} units
                          </span>
                          <span className="text-xs font-bold text-emerald-700">Connect →</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Create New Party Code Form */
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Squad Party Code Identifier:
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ECHO-3 or CHARLIE-5"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Short uppercase alphanumeric tag used by team members to connect.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mission Operation Title:
                </label>
                <input
                  type="text"
                  value={newMissionName}
                  onChange={(e) => setNewMissionName(e.target.value)}
                  placeholder="e.g. Operation Northern Ridge Extraction"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tactical Mission Objective:
                </label>
                <textarea
                  rows={2}
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="e.g. Triage casualty extraction at sector 4, coordinate helicopter extraction at Checkpoint Alpha."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newCode.trim()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Provisioning Party Network...' : 'Create & Connect Squad'}</span>
              </button>
            </form>
          )}

          {/* Educational Note */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              Shared Tactical Connection:
            </span>
            <p className="leading-relaxed">
              Every member in the party shares the same live coordinates, tactical checkpoint, emergency state, and instant messages in real-time across devices via WebSockets and local offline queues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
