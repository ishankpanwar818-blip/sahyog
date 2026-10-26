import React, { useState, useRef, useEffect } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  MessageSquare,
  Send,
  X,
  ShieldAlert,
  Clock,
  WifiOff,
  User,
  Zap,
} from 'lucide-react';

export const TeamChatModal: React.FC = () => {
  const {
    messages,
    sendMessage,
    isMessagesModalOpen,
    setIsMessagesModalOpen,
    activeMember,
    members,
    setActiveMemberId,
    isOfflineDemo,
    partyCode,
  } = useSahyog();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMessagesModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMessagesModalOpen]);

  if (!isMessagesModalOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const quickPings = [
    'En route to Checkpoint Alpha.',
    'Status update: Area clear, all green.',
    'Caution: Rough terrain and low visibility.',
    'Urgent: Medical supplies requested at coordinates.',
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg h-[620px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Tactical Squad Comms</h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                  {partyCode}
                </span>
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Squad communications channel · Stored and synced in real-time
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMessagesModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Persona Banner */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Sending as:</span>
            <span className="font-bold text-slate-900">{activeMember.name}</span>
            <span className="text-slate-500 font-mono">({activeMember.callsign})</span>
          </div>

          <select
            value={activeMember.id}
            onChange={(e) => setActiveMemberId(e.target.value)}
            className="text-[11px] bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-medium focus:outline-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Switch: {m.name} ({m.callsign})
              </option>
            ))}
          </select>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <span>No communications yet. Send a radio update below.</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === activeMember.id;
              const isEmergency = msg.isEmergencyAlert;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-700">{msg.senderName}</span>
                    <span className="font-mono">· {msg.senderCallsign}</span>
                    <span>·</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-2xs ${
                      isEmergency
                        ? 'bg-red-600 text-white font-medium border border-red-700'
                        : isMe
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.isQueued && (
                      <div className="flex items-center gap-1 text-[9px] text-amber-300 mt-1">
                        <WifiOff className="w-2.5 h-2.5" />
                        <span>Queued locally (Offline)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Tactical Pings */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-nowrap">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">
            Pings:
          </span>
          {quickPings.map((ping, i) => (
            <button
              key={i}
              onClick={() => {
                sendMessage(ping);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
            >
              {ping}
            </button>
          ))}
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isOfflineDemo
                ? 'Type message (will queue locally in Offline Mode)...'
                : 'Transmit tactical update to squad...'
            }
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
