import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import { calculateHaversineDistance, formatDistance } from '../utils/haversine';
import {
  Battery,
  MapPin,
  Clock,
  Navigation,
  Shield,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  UserCheck,
} from 'lucide-react';

export const MemberDetailPanel: React.FC = () => {
  const {
    partyCode,
    missionName,
    selectedMember,
    members,
    activeMemberId,
    setActiveMemberId,
    updateMemberStatus,
    activeAlert,
    acknowledgeAlert,
    resolveAlert,
    createMedicalAlert,
    setFlyToLocation,
    setIsMessagesModalOpen,
  } = useSahyog();

  if (!selectedMember) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white border-l border-slate-200">
        <MapPin className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No Member Selected</p>
        <p className="text-xs text-slate-400 mt-1">
          Click any team marker on the map or select from the team list to view real-time diagnostics.
        </p>
      </div>
    );
  }

  // Operator / You coordinates
  const youMember = members.find((m) => m.isCurrentUser) || members[0];
  const distanceKm = calculateHaversineDistance(youMember, selectedMember);
  const distanceStr = formatDistance(distanceKm);

  const isEmergency = selectedMember.status === 'emergency';
  const isCaution = selectedMember.status === 'caution';
  const isSafe = selectedMember.status === 'safe';
  const isYou = selectedMember.isCurrentUser;

  // Check if there is an active alert for this member
  const memberAlert = activeAlert && activeAlert.memberId === selectedMember.id ? activeAlert : null;

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-xs overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Selected Member</h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span>{selectedMember.callsign}</span>
            <span>·</span>
            <span>{selectedMember.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Live Link</span>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Shared Mission Context Tag */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs shadow-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Squad {partyCode}</span>
          </div>
          <span className="text-[11px] text-slate-300 truncate max-w-[150px] font-medium">
            {missionName}
          </span>
        </div>

        {/* Profile Card */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                isEmergency
                  ? 'bg-red-600 ring-2 ring-red-200'
                  : isCaution
                  ? 'bg-amber-500'
                  : isYou
                  ? 'bg-blue-600'
                  : 'bg-emerald-700'
              }`}
            >
              {selectedMember.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{selectedMember.name}</span>
                {isYou && (
                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                    YOU
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{selectedMember.callsign} · {selectedMember.role}</p>
            </div>
          </div>

          {/* Battery */}
          <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <Battery
              className={`w-4 h-4 ${
                selectedMember.battery < 30
                  ? 'text-red-500'
                  : selectedMember.battery < 60
                  ? 'text-amber-500'
                  : 'text-emerald-600'
              }`}
            />
            <span>{selectedMember.battery}%</span>
          </div>
        </div>

        {/* Note / Telemetry status description */}
        {selectedMember.note && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 italic">
            "{selectedMember.note}"
          </div>
        )}

        {/* Emergency Alert Box (If in emergency) */}
        {isEmergency && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight uppercase tracking-wide">
                  Medical Emergency Active
                </p>
                <p className="text-[11px] text-red-700">
                  {memberAlert ? (memberAlert.acknowledged ? 'Acknowledged · Help Dispatched' : 'Urgent Assistance Needed') : 'Distress beacon active'}
                </p>
              </div>
            </div>

            {memberAlert?.details && (
              <p className="text-[11px] text-red-900 bg-white/70 p-2 rounded border border-red-100">
                {memberAlert.details}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {memberAlert && !memberAlert.acknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(memberAlert.id)}
                  className="flex-1 py-1.5 px-3 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Acknowledge Alert
                </button>
              ) : memberAlert && memberAlert.acknowledged ? (
                <div className="flex-1 py-1 px-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACK: {memberAlert.acknowledgedBy}
                </div>
              ) : null}

              {memberAlert && (
                <button
                  onClick={() => resolveAlert(memberAlert.id)}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors"
                >
                  Resolve Alert
                </button>
              )}
            </div>
          </div>
        )}

        {/* Location & Distance Grid */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Location
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-800 font-medium">
                {selectedMember.lat.toFixed(4)}, {selectedMember.lng.toFixed(4)}
              </span>
              <button
                onClick={() => setFlyToLocation({ lat: selectedMember.lat, lng: selectedMember.lng })}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-0.5 underline"
              >
                View on Map
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last Update
            </span>
            <span className="text-slate-800">{selectedMember.lastSeenFormatted || '1 min ago'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              Distance from You
            </span>
            <div className="text-right">
              <span className="font-mono text-slate-900 font-bold">{distanceStr}</span>
              <span className="text-[10px] text-slate-400 ml-1">(approx straight-line)</span>
            </div>
          </div>
        </div>

        {/* Condition / Status System */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Update Condition Status:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => updateMemberStatus(selectedMember.id, 'safe')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                isSafe
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${isSafe ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Safe</span>
            </button>

            <button
              onClick={() => updateMemberStatus(selectedMember.id, 'caution')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                isCaution
                  ? 'bg-amber-50 text-amber-800 border-amber-400 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isCaution ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Caution</span>
            </button>

            <button
              onClick={() => updateMemberStatus(selectedMember.id, 'emergency')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                isEmergency
                  ? 'bg-red-50 text-red-800 border-red-400 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${isEmergency ? 'text-red-600' : 'text-slate-400'}`} />
              <span>Emergency</span>
            </button>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-2 pt-2">
          {!isEmergency && (
            <button
              onClick={() => createMedicalAlert(selectedMember.id)}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              REQUEST MEDICAL ASSISTANCE
            </button>
          )}

          <button
            onClick={() => setIsMessagesModalOpen(true)}
            className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            Send Direct Message to Team
          </button>

          {/* Switch Active Role in Demo */}
          <button
            onClick={() => setActiveMemberId(selectedMember.id)}
            className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 border ${
              activeMemberId === selectedMember.id
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {activeMemberId === selectedMember.id
              ? 'Currently Acting as this Member'
              : `Switch Active Persona to ${selectedMember.name}`}
          </button>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
        Training Simulation Environment · Authorised Personnel Only
      </div>
    </div>
  );
};
