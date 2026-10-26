import React, { useState } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  RotateCcw,
  X,
  Compass,
  WifiOff,
  Wifi,
  ShieldAlert,
  Flag,
  MessageSquare,
} from 'lucide-react';

interface TourStep {
  step: number;
  title: string;
  instruction: string;
  actionText: string;
  run: () => void;
}

export const DemoTourGuide: React.FC = () => {
  const {
    isDemoTourOpen,
    setIsDemoTourOpen,
    members,
    setSelectedMemberId,
    setFlyToLocation,
    triggerDemoEmergency,
    acknowledgeAlert,
    activeAlert,
    setCheckpoint,
    checkpoint,
    setIsOfflineDemo,
    isOfflineDemo,
    sendMessage,
    updateMemberStatus,
    processDemoQueue,
    resetDemo,
  } = useSahyog();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isDemoTourOpen) return null;

  const steps: TourStep[] = [
    {
      step: 1,
      title: 'Squad Overview on Map',
      instruction:
        'Display five fictional team members around the simulated mountain training area with telemetry badges.',
      actionText: 'View All Members',
      run: () => {
        setSelectedMemberId(null);
        setFlyToLocation({ lat: 30.308, lng: 78.042 });
      },
    },
    {
      step: 2,
      title: 'Select Member Telemetry',
      instruction:
        'Inspect Rohit Sharma (Alpha 3) in the right panel to examine battery %, status, and coordinate telemetry.',
      actionText: 'Select Rohit Sharma',
      run: () => {
        setSelectedMemberId('member-rohit');
        setFlyToLocation({ lat: 30.3165, lng: 78.0521 });
      },
    },
    {
      step: 3,
      title: 'Trigger Medical Emergency',
      instruction:
        'Trigger a distress beacon for Rohit Sharma. Notice marker updates to red pulsing medical cross.',
      actionText: 'Trigger SOS Alert',
      run: () => {
        triggerDemoEmergency();
      },
    },
    {
      step: 4,
      title: 'Inspect Emergency Banner & Timeline',
      instruction:
        'Observe the high-priority top emergency banner, updated team counter (1 Emergency), and activity log.',
      actionText: 'Focus Emergency Alert',
      run: () => {
        setSelectedMemberId('member-rohit');
      },
    },
    {
      step: 5,
      title: 'Acknowledge Emergency Alert',
      instruction:
        'Acknowledge the alert as coordinator. Notice banner status updates to Acknowledged without resolving.',
      actionText: 'Acknowledge Signal',
      run: () => {
        if (activeAlert) {
          acknowledgeAlert(activeAlert.id);
        }
      },
    },
    {
      step: 6,
      title: 'Designate Assembly Checkpoint',
      instruction:
        'Set Checkpoint Alpha at optimal high ground for helicopter evacuation and team rendezvous.',
      actionText: 'Place Checkpoint Alpha',
      run: () => {
        setCheckpoint(30.3052, 78.0378, 'Checkpoint Alpha (Rendezvous A)');
        setFlyToLocation({ lat: 30.3052, lng: 78.0378 });
      },
    },
    {
      step: 7,
      title: 'Inspect Approximate Route & Distance',
      instruction:
        'View the dashed straight-line route polyline and Haversine distance badge (~2.4 km) from You to casualty.',
      actionText: 'Measure Distance',
      run: () => {
        setSelectedMemberId('member-rohit');
      },
    },
    {
      step: 8,
      title: 'Switch to Offline Demo Mode',
      instruction:
        'Simulate complete network loss in remote valley terrain. Network broadcast switches to local persistence queue.',
      actionText: 'Engage Offline Mode',
      run: () => {
        setIsOfflineDemo(true);
      },
    },
    {
      step: 9,
      title: 'Send Offline Message & Update Status',
      instruction:
        'Dispatch a tactical radio message and update Karan to Caution while operating disconnected.',
      actionText: 'Send Offline Update',
      run: () => {
        sendMessage('FIELD UPDATE: Mountain trail compromised. Proceeding with caution.');
        updateMemberStatus('member-karan', 'caution', 'Damaged antenna during climb');
      },
    },
    {
      step: 10,
      title: 'Inspect Pending Local Queue',
      instruction:
        'Verify that pending events and messages are stored safely in localStorage with pending badges.',
      actionText: 'Inspect Pending Count',
      run: () => {
        // Keeps user in offline state to observe pending items
      },
    },
    {
      step: 11,
      title: 'Demonstrate Persistence (Refresh)',
      instruction:
        'All coordinates, checkpoints, alerts, and messages persist across browser reloads via localStorage.',
      actionText: 'Simulate Reload Verification',
      run: () => {
        // Visual indicator that localStorage matches state
      },
    },
    {
      step: 12,
      title: 'Reconnect & Flush Queue',
      instruction:
        'Toggle back online. The local demonstration queue flushes and synchronizes all records across the squad.',
      actionText: 'Reconnect & Flush Queue',
      run: () => {
        setIsOfflineDemo(false);
      },
    },
  ];

  const current = steps[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Hackathon 90-Second Demo Guide
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  Step {current.step} of 12
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Interactive step-by-step evaluator walk-through
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDemoTourOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-emerald-600 h-1.5 transition-all duration-300"
            style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-5 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Step {current.step}:
            </span>
            <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
              {current.title}
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {current.instruction}
            </p>
          </div>

          {/* Action Runner Button */}
          <button
            onClick={current.run}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Execute: {current.actionText}</span>
          </button>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pt-2">
            {steps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStepIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStepIdx
                    ? 'w-6 bg-emerald-600'
                    : idx < currentStepIdx
                    ? 'bg-slate-400'
                    : 'bg-slate-200'
                }`}
                title={`Step ${s.step}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:text-slate-900 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={resetDemo}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            Reset Demo Baseline
          </button>

          {currentStepIdx < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsDemoTourOpen(false)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              Finish Tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
