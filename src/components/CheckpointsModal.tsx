import React, { useState } from 'react';
import { useSahyog } from '../context/SahyogContext';
import { calculateHaversineDistance, formatDistance } from '../utils/haversine';
import {
  Flag,
  MapPin,
  Trash2,
  Edit2,
  Check,
  X,
  Compass,
  Navigation,
  Plus,
} from 'lucide-react';

export const CheckpointsModal: React.FC = () => {
  const {
    checkpoint,
    removeCheckpoint,
    setCheckpoint,
    isCheckpointsModalOpen,
    setIsCheckpointsModalOpen,
    setIsSettingCheckpoint,
    members,
    setFlyToLocation,
  } = useSahyog();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(checkpoint?.name || '');

  if (!isCheckpointsModalOpen) return null;

  const handleStartPlacement = () => {
    setIsCheckpointsModalOpen(false);
    setIsSettingCheckpoint(true);
  };

  const handleSaveRename = () => {
    if (!checkpoint || !editName.trim()) return;
    setCheckpoint(checkpoint.lat, checkpoint.lng, editName.trim());
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assembly Checkpoints</h3>
              <p className="text-[11px] text-slate-500">
                Designated team rendezvous & evacuation markers
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckpointsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {checkpoint ? (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              {/* Checkpoint Name & Edit */}
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xs font-bold px-2 py-1 border border-slate-300 rounded bg-white w-full"
                    />
                    <button
                      onClick={handleSaveRename}
                      className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-900 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{checkpoint.name}</h4>
                    <button
                      onClick={() => {
                        setEditName(checkpoint.name);
                        setIsEditing(true);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFlyToLocation({ lat: checkpoint.lat, lng: checkpoint.lng });
                      setIsCheckpointsModalOpen(false);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 text-[11px] font-medium text-slate-700 rounded hover:bg-slate-50"
                  >
                    View on Map
                  </button>
                  <button
                    onClick={removeCheckpoint}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Remove Checkpoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Coordinates */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">
                  {checkpoint.lat.toFixed(5)}, {checkpoint.lng.toFixed(5)}
                </span>
                <span>·</span>
                <span>Set by {checkpoint.createdBy}</span>
              </div>

              {/* Distances from all team members table */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <span>Squad Distances to Assembly Point</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (approx straight-line)
                  </span>
                </div>
                <div className="space-y-1.5">
                  {members.map((m) => {
                    const distKm = calculateHaversineDistance(m, checkpoint);
                    const distStr = formatDistance(distKm);

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              m.status === 'emergency'
                                ? 'bg-red-600'
                                : m.status === 'caution'
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                          />
                          <span className="font-semibold text-slate-800">{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({m.callsign})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-slate-700 font-bold">
                          <span>{distStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <Flag className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Checkpoint Set</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Setting a rendezvous checkpoint gives the entire squad a shared meeting point and calculates distances instantly.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={handleStartPlacement}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{checkpoint ? 'Reposition on Map' : 'Set Assembly Point on Map'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center italic">
            Note: Straight-line Euclidean/Haversine calculations are approximate indicators for coordination, not tactical navigation routes.
          </p>
        </div>
      </div>
    </div>
  );
};
