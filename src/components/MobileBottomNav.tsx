import React from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  Map,
  Users,
  MessageSquare,
  Flag,
  ShieldAlert,
  BarChart3,
  Menu,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsMessagesModalOpen,
    setIsCheckpointsModalOpen,
    setIsAlertsModalOpen,
    activeAlert,
    messages,
  } = useSahyog();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-[600] flex items-center justify-around px-2 shadow-lg">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-500'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Map</span>
      </button>

      <button
        onClick={() => setActiveTab('team')}
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          activeTab === 'team' ? 'text-slate-900 font-bold' : 'text-slate-500'
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Team</span>
      </button>

      <button
        onClick={() => setIsMessagesModalOpen(true)}
        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 relative"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Chat</span>
        {messages.length > 0 && (
          <span className="absolute top-1 right-3 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center font-mono">
            {messages.length}
          </span>
        )}
      </button>

      <button
        onClick={() => setActiveTab('analytics')}
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          activeTab === 'analytics' ? 'text-slate-900 font-bold' : 'text-slate-500'
        }`}
      >
        <BarChart3 className="w-5 h-5 text-emerald-600" />
        <span className="text-[10px] mt-0.5">Analytics</span>
      </button>

      <button
        onClick={() => setIsAlertsModalOpen(true)}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative ${
          activeAlert ? 'text-red-600 font-bold' : 'text-slate-500'
        }`}
      >
        <ShieldAlert className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Alerts</span>
        {activeAlert && (
          <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
        )}
      </button>
    </nav>
  );
};
