import React, { useState } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  UserPlus,
  X,
  Shield,
  Radio,
  Battery,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { TeamStatus } from '../types';

interface DeployOperativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployOperativeModal: React.FC<DeployOperativeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { deployOperative, partyCode, members } = useSahyog();

  const you = members.find((m) => m.isCurrentUser) || members[0];

  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [role, setRole] = useState('Forward Scout');
  const [status, setStatus] = useState<TeamStatus>('safe');
  const [battery, setBattery] = useState<number>(95);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      // Offset slightly from commander position for realistic tactical dispersal
      const offsetLat = (Math.random() - 0.5) * 0.008;
      const offsetLng = (Math.random() - 0.5) * 0.008;
      const lat = Number(((you?.lat || 28.6139) + offsetLat).toFixed(5));
      const lng = Number(((you?.lng || 77.2090) + offsetLng).toFixed(5));

      await deployOperative({
        name: name.trim(),
        callsign: callsign.trim() || `SQ-${members.length + 1}`,
        role,
        status,
        battery,
        lat,
        lng,
        note: `Deployed to field grid for Squad ${partyCode}`,
      });

      setName('');
      setCallsign('');
      onClose();
    } catch (err) {
      console.error('Failed to deploy operative:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonRoles = [
    'Forward Scout',
    'Field Paramedic',
    'Communications Specialist',
    'Search & Rescue Lead',
    'Drone Reconnaissance',
    'Logistics & Support',
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Deploy Field Operative</h3>
              <p className="text-[11px] text-slate-300">
                Register real responder to Squad {partyCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Operative Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vikram Rathore or Rescue Unit 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Callsign / Tag
              </label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. Sierra-1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Battery Reserve (%)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={battery}
                onChange={(e) => setBattery(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Tactical Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
            >
              {commonRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Initial Operational Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('safe')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all text-center ${
                  status === 'safe'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Safe
              </button>
              <button
                type="button"
                onClick={() => setStatus('caution')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all text-center ${
                  status === 'caution'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Caution
              </button>
              <button
                type="button"
                onClick={() => setStatus('emergency')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all text-center ${
                  status === 'emergency'
                    ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Emergency
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Position deployed near command grid coords [{(you?.lat || 28.6139).toFixed(3)}, {(you?.lng || 77.2090).toFixed(3)}]. Saves to Cloud Firestore instantly.
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Deploying...' : 'Deploy to Squad'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
