/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { SahyogProvider, useSahyog } from './context/SahyogContext';
import { Navbar } from './components/Navbar';
import { EmergencyBanner } from './components/EmergencyBanner';
import { Sidebar } from './components/Sidebar';
import { TacticalMap } from './components/Map';
import { MemberDetailPanel } from './components/MemberDetailPanel';
import { PartyCodeModal } from './components/PartyCodeModal';
import { TeamChatModal } from './components/TeamChatModal';
import { CheckpointsModal } from './components/CheckpointsModal';
import { AlertsModal } from './components/AlertsModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { DemoTourGuide } from './components/DemoTourGuide';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DeployOperativeModal } from './components/DeployOperativeModal';
import { ChevronRight, ChevronLeft, User, X } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const {
    activeTab,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    isDeployModalOpen,
    setIsDeployModalOpen,
  } = useSahyog();

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // When a member is selected on mobile, auto-open the detail bottom sheet
  useEffect(() => {
    if (selectedMemberId) {
      setIsMobileDetailOpen(true);
    }
  }, [selectedMemberId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Mandatory GMP In-App Quota Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar />

      {/* Emergency Alert Priority Banner */}
      <EmergencyBanner />

      {/* Main 3-Column Tactical Workspace */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Operational Sidebar (Hidden on small mobile, visible on md+) */}
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>

        {/* Center: Large Interactive Map Canvas */}
        <main className="flex-1 relative h-full w-full">
          <TacticalMap />

          {/* Desktop Right Panel Collapse/Expand Toggle Button */}
          <button
            onClick={() => setIsRightPanelOpen((prev) => !prev)}
            title={isRightPanelOpen ? 'Collapse Details' : 'Expand Details'}
            className="hidden lg:flex absolute top-4 right-0 z-[450] bg-white border-y border-l border-slate-300 rounded-l-md p-1.5 shadow-md text-slate-600 hover:text-slate-900 transition-colors"
            style={{
              right: isRightPanelOpen ? '20rem' : '0rem',
              transition: 'right 0.2s ease-in-out',
            }}
          >
            {isRightPanelOpen ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </main>

        {/* Right Panel: Selected Member Diagnostics (Desktop) */}
        {isRightPanelOpen && (
          <aside className="hidden lg:block w-80 h-full shrink-0 z-10 transition-all duration-200">
            <MemberDetailPanel />
          </aside>
        )}

        {/* Mobile Member Detail Bottom Sheet */}
        {isMobileDetailOpen && selectedMember && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 max-h-[70vh] bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 z-[550] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-2 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Member Telemetry</span>
              <button
                onClick={() => setIsMobileDetailOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              <MemberDetailPanel />
            </div>
          </div>
        )}

        {/* Mobile View Team/Analytics Drawer (when activeTab is 'team' or 'analytics') */}
        {(activeTab === 'team' || activeTab === 'analytics') && (
          <div className="md:hidden fixed inset-0 top-14 bottom-16 bg-white z-[500] overflow-y-auto">
            <Sidebar />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Floating Modals */}
      <PartyCodeModal />
      <TeamChatModal />
      <CheckpointsModal />
      <AlertsModal />
      <DiagnosticsModal />
      <DemoTourGuide />
      <DeployOperativeModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  // Register Service Worker for offline PWA caching if available
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('SW registration error:', err));
    }
  }, []);

  return (
    <SahyogProvider>
      <DashboardContent />
    </SahyogProvider>
  );
}
