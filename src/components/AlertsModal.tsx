import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  ShieldAlert,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  MapPin,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const AlertsModal: React.FC = () => {
  const {
    activeAlert,
    resolvedAlerts,
    acknowledgeAlert,
    resolveAlert,
    triggerDemoEmergency,
    isAlertsModalOpen,
    setIsAlertsModalOpen,
    setFlyToLocation,
  } = useSahyog();

  if (!isAlertsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Emergency Logs</h3>
              <p className="text-[11px] text-slate-500">
                Distress signals & casualty response telemetry
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAlertsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Active Emergency Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Emergencies
              </span>
              {activeAlert && (
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  1 Urgent
                </span>
              )}
            </div>

            {activeAlert ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                      SOS
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-red-950">
                        {activeAlert.memberName} ({activeAlert.callsign})
                      </h4>
                      <p className="text-[11px] text-red-700 font-mono">
                        Coords: {activeAlert.lat.toFixed(4)}, {activeAlert.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFlyToLocation({ lat: activeAlert.lat, lng: activeAlert.lng });
                      setIsAlertsModalOpen(false);
                    }}
                    className="text-[11px] font-semibold text-red-800 hover:underline"
                  >
                    View Map
                  </button>
                </div>

                <p className="text-xs text-red-900 bg-white/70 p-2.5 rounded border border-red-100">
                  {activeAlert.details}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-red-600 font-mono">
                    Logged: {new Date(activeAlert.timestamp).toLocaleTimeString()}
                  </span>

                  <div className="flex gap-2">
                    {!activeAlert.acknowledged ? (
                      <button
                        onClick={() => acknowledgeAlert(activeAlert.id)}
                        className="py-1.5 px-3 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ACK'd: {activeAlert.acknowledgedBy}
                      </span>
                    )}

                    <button
                      onClick={() => resolveAlert(activeAlert.id)}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-medium transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-lg text-center text-xs text-emerald-800 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>All personnel safe. No active emergency beacons.</span>
              </div>
            )}
          </div>

          {/* Trigger Demo SOS Button */}
          {!activeAlert && (
            <button
              onClick={() => {
                triggerDemoEmergency();
                setIsAlertsModalOpen(false);
              }}
              className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Broadcast Emergency SOS Beacon</span>
            </button>
          )}

          {/* Resolved History */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Resolved Distress Incidents ({resolvedAlerts.length})
            </span>

            {resolvedAlerts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No historical alerts recorded in this session.</p>
            ) : (
              <div className="space-y-2">
                {resolvedAlerts.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>{res.memberName} ({res.callsign})</span>
                      <span className="text-emerald-700 font-mono text-[10px]">RESOLVED</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{res.details}</p>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Closed at: {res.resolvedAt ? new Date(res.resolvedAt).toLocaleTimeString() : 'N/A'} by {res.resolvedBy || 'Operator'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Defense hackathon simulation disclaimer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 leading-normal">
            <strong>Training Notice:</strong> SAHYOG is a browser-based tactical coordination prototype designed for authorized training exercises and disaster simulations. It does not contact external civilian 911/112 emergency services.
          </div>
        </div>
      </div>
    </div>
  );
};
