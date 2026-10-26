import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  ShieldAlert,
  CheckCircle2,
  MapPin,
  X,
  Radio,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const {
    activeAlert,
    acknowledgeAlert,
    resolveAlert,
    setSelectedMemberId,
    setFlyToLocation,
    isEmergencyBannerDismissed,
    setIsEmergencyBannerDismissed,
  } = useSahyog();

  if (!activeAlert || isEmergencyBannerDismissed) {
    return null;
  }

  const handleFocus = () => {
    setSelectedMemberId(activeAlert.memberId);
    setFlyToLocation({ lat: activeAlert.lat, lng: activeAlert.lng });
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 z-20 shrink-0 border-b border-red-700 animate-fadeIn">
      {/* Alert Info */}
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-red-700 rounded-lg animate-pulse">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-red-800 px-2 py-0.5 rounded text-red-100">
              Active Medical Emergency
            </span>
            <span className="text-xs font-bold text-white">
              {activeAlert.memberName} ({activeAlert.callsign})
            </span>
            {activeAlert.acknowledged && (
              <span className="text-[11px] bg-emerald-500/30 text-emerald-100 border border-emerald-400 px-2 py-0.2 rounded font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Acknowledged by {activeAlert.acknowledgedBy}
              </span>
            )}
          </div>
          <p className="text-xs text-red-100 line-clamp-1 max-w-2xl mt-0.5">
            {activeAlert.details} · Coords: [{activeAlert.lat.toFixed(4)}, {activeAlert.lng.toFixed(4)}]
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFocus}
          className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-medium transition-colors flex items-center gap-1 border border-red-500"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Locate on Map</span>
        </button>

        {!activeAlert.acknowledged ? (
          <button
            onClick={() => acknowledgeAlert(activeAlert.id)}
            className="px-3 py-1 bg-white hover:bg-red-50 text-red-700 rounded text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Acknowledge Alert</span>
          </button>
        ) : (
          <button
            onClick={() => resolveAlert(activeAlert.id)}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded text-xs font-bold transition-colors shadow-xs"
          >
            Resolve Emergency
          </button>
        )}

        <button
          onClick={() => setIsEmergencyBannerDismissed(true)}
          title="Minimize banner"
          className="p-1 text-red-200 hover:text-white rounded hover:bg-red-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
