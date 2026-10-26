import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  TeamMember,
  TeamStatus,
  MedicalAlert,
  Checkpoint,
  TeamMessage,
  ActivityEvent,
  QueuedEvent,
  SimulationState,
  ActiveTab,
  Coordinates,
  PartySummary,
} from '../types';
import {
  DEFAULT_PARTY_CODE,
  INITIAL_MEMBERS,
  INITIAL_CHECKPOINT,
  INITIAL_MEDICAL_ALERT,
  INITIAL_MESSAGES,
  INITIAL_EVENTS,
} from '../data/initialData';
import {
  loadPartyState,
  savePartyState,
  clearPartyState,
  getOfflineQueue,
  saveOfflineQueue,
  clearOfflineQueue,
} from '../utils/storage';
import { partyHub, BroadcastPacket } from '../utils/syncBroadcast';
import { realtimeClient } from '../utils/realtimeClient';
import { backendService } from '../services/backendService';

interface SahyogContextValue {
  // Party Code & Mission Context
  partyCode: string;
  setPartyCode: (code: string) => void;
  missionName: string;
  missionObjective: string;
  createNewParty: (code: string, missionName?: string, objective?: string) => Promise<boolean>;
  allParties: PartySummary[];
  fetchAllParties: () => Promise<void>;
  connectedTabsCount: number;
  isBackendConnected: boolean;
  isFirebaseConnected: boolean;

  // Members & Selection
  members: TeamMember[];
  selectedMemberId: string | null;
  selectedMember: TeamMember | null;
  setSelectedMemberId: (id: string | null) => void;
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  activeMember: TeamMember;
  updateMemberStatus: (memberId: string, status: TeamStatus, note?: string) => void;

  // Real-time Map Tracking
  isLiveTracking: boolean;
  toggleLiveTracking: () => void;

  // Medical Alert
  activeAlert: MedicalAlert | null;
  resolvedAlerts: MedicalAlert[];
  createMedicalAlert: (memberId: string, details?: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;

  // Checkpoint
  checkpoint: Checkpoint | null;
  isSettingCheckpoint: boolean;
  setIsSettingCheckpoint: (val: boolean) => void;
  setCheckpoint: (lat: number, lng: number, name?: string) => void;
  removeCheckpoint: () => void;

  // Messaging (Real-time Chat)
  messages: TeamMessage[];
  sendMessage: (text: string, isEmergency?: boolean) => void;

  // Activity Events
  events: ActivityEvent[];
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;

  // Offline Mode & Queue
  isOfflineDemo: boolean;
  setIsOfflineDemo: (val: boolean) => void;
  offlineQueue: QueuedEvent[];
  processDemoQueue: () => void;
  lastSavedAt: string;

  // Simulation
  simulation: SimulationState;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stepSimulation: () => void;
  triggerDemoEmergency: () => void;
  resetDemo: () => void;

  // Map & Geo
  mapMode: 'osm' | 'satellite';
  setMapMode: (mode: 'osm' | 'satellite') => void;
  userLocation: Coordinates | null;
  requestUserLocation: () => Promise<boolean>;
  flyToLocation: Coordinates | null;
  setFlyToLocation: (coord: Coordinates | null) => void;

  // Navigation & Modals
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDemoTourOpen: boolean;
  setIsDemoTourOpen: (val: boolean) => void;
  isDiagnosticsOpen: boolean;
  setIsDiagnosticsOpen: (val: boolean) => void;
  isPartyModalOpen: boolean;
  setIsPartyModalOpen: (val: boolean) => void;
  isCheckpointsModalOpen: boolean;
  setIsCheckpointsModalOpen: (val: boolean) => void;
  isMessagesModalOpen: boolean;
  setIsMessagesModalOpen: (val: boolean) => void;
  isAlertsModalOpen: boolean;
  setIsAlertsModalOpen: (val: boolean) => void;
  isAnalyticsOverlayOpen: boolean;
  setIsAnalyticsOverlayOpen: (val: boolean) => void;
  isEmergencyBannerDismissed: boolean;
  setIsEmergencyBannerDismissed: (val: boolean) => void;

  // Real Live GPS & Data Source Mode
  dataSourceMode: 'live_gps' | 'training_scenario';
  setDataSourceMode: (mode: 'live_gps' | 'training_scenario') => void;
  liveTelemetry: {
    accuracy: number;
    heading: number | null;
    speed: number | null;
    altitude: number | null;
    battery: number;
  } | null;
  isLiveGPSActive: boolean;

  // Real database operative deployment
  deployOperative: (member: Partial<TeamMember> & { name: string; role: string }) => Promise<void>;
  removeOperative: (memberId: string) => Promise<void>;
  resetPartyData: () => Promise<void>;
  isDeployModalOpen: boolean;
  setIsDeployModalOpen: (val: boolean) => void;
}

const SahyogContext = createContext<SahyogContextValue | null>(null);

export const SahyogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Read party code from URL search param if present e.g. ?code=BRAVO-2
  const initialCode = (() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code') || urlParams.get('party');
      if (code) return code.trim().toUpperCase();
    }
    return DEFAULT_PARTY_CODE;
  })();

  const [partyCode, setPartyCodeState] = useState<string>(initialCode);
  const [missionName, setMissionName] = useState<string>(`Operation ${initialCode}`);
  const [missionObjective, setMissionObjective] = useState<string>(
    'Real-time tactical casualty extraction & squad perimeter safety'
  );
  const [allParties, setAllParties] = useState<PartySummary[]>([]);
  const [connectedTabsCount, setConnectedTabsCount] = useState<number>(1);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Generate or retrieve persistent operator profile for this session
  const [operatorProfile] = useState(() => {
    if (typeof window === 'undefined') {
      return { id: 'operator-lead', name: 'Operator (You)', callsign: 'Alpha Lead' };
    }
    try {
      const stored = sessionStorage.getItem('sahyog_operator_identity');
      if (stored) return JSON.parse(stored);
      const randomCode = Math.floor(10 + Math.random() * 90);
      const newIdentity = {
        id: `op-${Math.random().toString(36).substring(2, 7)}`,
        name: 'Operator (You)',
        callsign: `Lead-${randomCode}`,
      };
      sessionStorage.setItem('sahyog_operator_identity', JSON.stringify(newIdentity));
      return newIdentity;
    } catch {
      return { id: 'operator-lead', name: 'Operator (You)', callsign: 'Alpha Lead' };
    }
  });

  // Core domain state - clean real data
  const [members, setMembers] = useState<TeamMember[]>(() => [
    {
      id: operatorProfile.id,
      partyCode: initialCode,
      name: operatorProfile.name,
      callsign: operatorProfile.callsign,
      role: 'Operations Coordinator',
      lat: 28.6139,
      lng: 77.2090,
      status: 'safe',
      battery: 98,
      lastSeen: new Date().toISOString(),
      lastSeenFormatted: 'Just now',
      note: 'Command terminal operative',
      isCurrentUser: true,
    },
  ]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(operatorProfile.id);
  const [activeMemberId, setActiveMemberId] = useState<string>(operatorProfile.id);
  const [activeAlert, setActiveAlert] = useState<MedicalAlert | null>(null);
  const [resolvedAlerts, setResolvedAlerts] = useState<MedicalAlert[]>([]);
  const [checkpoint, setCheckpointState] = useState<Checkpoint | null>(null);
  const [isSettingCheckpoint, setIsSettingCheckpoint] = useState<boolean>(false);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>(INITIAL_EVENTS);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  // Live tracking
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  // Offline demo & queue
  const [isOfflineDemo, setIsOfflineDemoState] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedEvent[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string>('Just now');

  // Simulation
  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    speed: 1,
    stepCount: 0,
    lastTickTime: null,
  });

  // Map & Geo
  const [mapMode, setMapMode] = useState<'osm' | 'satellite'>('osm');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Coordinates | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);
  const [isCheckpointsModalOpen, setIsCheckpointsModalOpen] = useState<boolean>(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState<boolean>(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [isAnalyticsOverlayOpen, setIsAnalyticsOverlayOpen] = useState<boolean>(false);
  const [isEmergencyBannerDismissed, setIsEmergencyBannerDismissed] = useState<boolean>(false);

  // Data Source Mode & Live GPS Telemetry
  const [dataSourceMode, setDataSourceMode] = useState<'live_gps' | 'training_scenario'>('live_gps');
  const [liveTelemetry, setLiveTelemetry] = useState<{
    accuracy: number;
    heading: number | null;
    speed: number | null;
    altitude: number | null;
    battery: number;
  } | null>(null);
  const [isLiveGPSActive, setIsLiveGPSActive] = useState<boolean>(false);

  // Auto-initiate real device GPS tracking and Battery API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Live Geolocation Watcher
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setUserLocation({ lat, lng });
          setIsLiveGPSActive(true);
          setLiveTelemetry((prev) => ({
            accuracy: pos.coords.accuracy || 10,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            altitude: pos.coords.altitude ?? null,
            battery: prev?.battery || 95,
          }));

          setMembers((prev) =>
            prev.map((m) =>
              m.isCurrentUser
                ? {
                    ...m,
                    lat,
                    lng,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    isLiveGPS: true,
                    lastSeen: new Date().toISOString(),
                    lastSeenFormatted: 'Just now',
                  }
                : m
            )
          );

          // Update backend & Firestore
          backendService.updateMemberLocation(partyCode, operatorProfile.id, lat, lng, undefined, pos.coords.accuracy, pos.coords.heading, pos.coords.speed);
        },
        (err) => {
          console.log('GPS watch initial note:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
      watchIdRef.current = id;
    }

    // 2. Real Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const lvl = Math.round(battery.level * 100);
        setLiveTelemetry((prev) =>
          prev ? { ...prev, battery: lvl } : { accuracy: 10, heading: null, speed: null, altitude: null, battery: lvl }
        );
        setMembers((prev) =>
          prev.map((m) => (m.isCurrentUser ? { ...m, battery: lvl } : m))
        );
        battery.addEventListener('levelchange', () => {
          const updated = Math.round(battery.level * 100);
          setMembers((prev) =>
            prev.map((m) => (m.isCurrentUser ? { ...m, battery: updated } : m))
          );
        });
      });
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [partyCode]);

  // Keep ref for offline state
  const isOfflineRef = useRef(isOfflineDemo);
  isOfflineRef.current = isOfflineDemo;

  // Add event helper
  const addEvent = useCallback(
    (eventData: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
      const newEvent: ActivityEvent = {
        ...eventData,
        id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    },
    []
  );

  // Fetch all parties from backend
  const fetchAllParties = useCallback(async () => {
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const data = await res.json();
        if (data.parties) {
          setAllParties(data.parties);
        }
      }
    } catch (e) {
      // Backend not yet available or offline
    }
  }, []);

  // Create a new party
  const createNewParty = useCallback(
    async (code: string, name?: string, objective?: string): Promise<boolean> => {
      const clean = code.trim().toUpperCase();
      try {
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partyCode: clean,
            missionName: name || `Operation ${clean}`,
            missionObjective: objective || 'Tactical emergency coordination',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.party) {
            setPartyCodeState(clean);
            setMissionName(data.party.missionName);
            setMissionObjective(data.party.missionObjective);
            setMembers(data.party.members);
            setCheckpointState(data.party.checkpoint);
            setActiveAlert(data.party.activeAlert);
            setMessages(data.party.messages);
            setEvents(data.party.events);
            fetchAllParties();
            return true;
          }
        }
      } catch (err) {
        console.warn('Backend party creation failed, using client fallback:', err);
      }

      // Fallback: local initialization
      setPartyCodeState(clean);
      setMissionName(name || `Operation ${clean}`);
      setMissionObjective(objective || 'Tactical squad operations');
      return true;
    },
    [fetchAllParties]
  );

  // Connect to backend WebSocket and BroadcastChannel when partyCode changes
  useEffect(() => {
    // 1. Fetch backend state for this party
    fetch(`/api/parties/${partyCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.party) {
          const p = data.party;
          setMissionName(p.missionName || `Operation ${partyCode}`);
          setMissionObjective(p.missionObjective || 'Tactical response & coordination');
          if (p.members?.length) setMembers(p.members);
          if (p.checkpoint !== undefined) setCheckpointState(p.checkpoint);
          if (p.activeAlert !== undefined) setActiveAlert(p.activeAlert);
          if (p.messages?.length) setMessages(p.messages);
          if (p.events?.length) setEvents(p.events);
          if (p.members?.[0]) {
            setActiveMemberId(p.members[0].id);
            const emergencyMem = p.members.find((m: any) => m.status === 'emergency');
            setSelectedMemberId(emergencyMem ? emergencyMem.id : p.members[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback to localStorage if offline
        const saved = loadPartyState(partyCode);
        if (saved) {
          setMembers(saved.members || INITIAL_MEMBERS);
          setCheckpointState(saved.checkpoint || null);
          setActiveAlert(saved.activeAlert || null);
          setResolvedAlerts(saved.resolvedAlerts || []);
          setMessages(saved.messages || []);
          setEvents(saved.events || []);
        }
      });

    // 2. Connect to Realtime WebSocket
    const activePersona = members.find((m) => m.id === activeMemberId) || members[0];
    realtimeClient.connect(partyCode, activePersona.id, activePersona.name);
    setIsBackendConnected(true);

    const unsubscribeWs = realtimeClient.subscribe((packet) => {
      if (isOfflineRef.current) return;

      switch (packet.type) {
        case 'INIT_STATE':
          if (packet.payload?.party) {
            const p = packet.payload.party;
            if (p.missionName) setMissionName(p.missionName);
            if (p.missionObjective) setMissionObjective(p.missionObjective);
            if (p.members) setMembers(p.members);
            if (p.checkpoint !== undefined) setCheckpointState(p.checkpoint);
            if (p.activeAlert !== undefined) setActiveAlert(p.activeAlert);
            if (p.messages) setMessages(p.messages);
            if (p.events) setEvents(p.events);
          }
          if (packet.payload?.connectedCount) {
            setConnectedTabsCount(packet.payload.connectedCount);
          }
          break;

        case 'CHAT_MESSAGE':
          if (packet.payload?.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === packet.payload.message.id)) return prev;
              return [...prev, packet.payload.message];
            });
          }
          break;

        case 'MEMBER_UPDATE':
          if (packet.payload?.member) {
            const updated = packet.payload.member;
            setMembers((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          }
          break;

        case 'MEMBERS_SYNC':
          if (packet.payload?.members) {
            setMembers(packet.payload.members);
          }
          break;

        case 'STATUS_CHANGE':
          if (packet.payload?.member) {
            const mem = packet.payload.member;
            setMembers((prev) =>
              prev.map((m) => (m.id === mem.id ? { ...m, ...mem } : m))
            );
          }
          if (packet.payload?.event) {
            setEvents((prev) => [packet.payload.event, ...prev.slice(0, 49)]);
          }
          break;

        case 'EMERGENCY_TRIGGER':
          if (packet.payload?.alert) {
            setActiveAlert(packet.payload.alert);
            setIsEmergencyBannerDismissed(false);
          }
          if (packet.payload?.member) {
            const mem = packet.payload.member;
            setMembers((prev) =>
              prev.map((m) => (m.id === mem.id ? { ...m, ...mem } : m))
            );
          }
          if (packet.payload?.event) {
            setEvents((prev) => [packet.payload.event, ...prev.slice(0, 49)]);
          }
          break;

        case 'EMERGENCY_ACK':
          if (packet.payload?.alert) {
            setActiveAlert(packet.payload.alert);
          }
          if (packet.payload?.event) {
            setEvents((prev) => [packet.payload.event, ...prev.slice(0, 49)]);
          }
          break;

        case 'EMERGENCY_RESOLVE':
          setActiveAlert(null);
          if (packet.payload?.resolved) {
            setResolvedAlerts((prev) => [packet.payload.resolved, ...prev]);
          }
          if (packet.payload?.casualty) {
            const cas = packet.payload.casualty;
            setMembers((prev) =>
              prev.map((m) => (m.id === cas.id ? { ...m, ...cas } : m))
            );
          }
          if (packet.payload?.event) {
            setEvents((prev) => [packet.payload.event, ...prev.slice(0, 49)]);
          }
          break;

        case 'CHECKPOINT_SET':
          if (packet.payload?.checkpoint) {
            setCheckpointState(packet.payload.checkpoint);
          }
          if (packet.payload?.event) {
            setEvents((prev) => [packet.payload.event, ...prev.slice(0, 49)]);
          }
          break;

        case 'CHECKPOINT_REMOVE':
          setCheckpointState(null);
          break;

        case 'PRESENCE_UPDATE':
          if (packet.payload?.connectedCount) {
            setConnectedTabsCount(packet.payload.connectedCount);
          }
          break;
      }
    });

    // 3. Connect BroadcastChannel for instant inter-tab IPC
    partyHub.connect(partyCode);
    const unsubscribeBroadcast = partyHub.subscribe((packet: BroadcastPacket) => {
      if (isOfflineRef.current) return;
      if (packet.type === 'STATUS_UPDATE') {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === packet.payload.memberId
              ? { ...m, status: packet.payload.status, note: packet.payload.note ?? m.note }
              : m
          )
        );
      }
    });

    // 4. Firestore real-time cloud subscriptions
    backendService.createOrJoinTeam(partyCode, missionName, missionObjective);
    const unsubFirestoreMembers = backendService.subscribeToTeamMembers(partyCode, (updated) => {
      if (updated.length > 0) setMembers(updated);
    });
    const unsubFirestoreAlerts = backendService.subscribeToTeamAlerts(partyCode, (act, res) => {
      if (act) setActiveAlert(act);
      if (res.length > 0) setResolvedAlerts(res);
    });
    const unsubFirestoreMsgs = backendService.subscribeToMessages(partyCode, (msgs) => {
      if (msgs.length > 0) setMessages(msgs);
    });
    const unsubFirestoreCkpt = backendService.subscribeToCheckpoints(partyCode, (ckpt) => {
      if (ckpt) setCheckpointState(ckpt);
    });

    fetchAllParties();

    return () => {
      unsubscribeWs();
      unsubscribeBroadcast();
      unsubFirestoreMembers();
      unsubFirestoreAlerts();
      unsubFirestoreMsgs();
      unsubFirestoreCkpt();
      realtimeClient.disconnect();
    };
  }, [partyCode, fetchAllParties, missionName, missionObjective]);

  // Save to localStorage when key values change
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      savePartyState(partyCode, {
        members,
        checkpoint,
        activeAlert,
        resolvedAlerts,
        messages,
        events,
        lastSavedAt: new Date().toISOString(),
      });
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 300);

    return () => clearTimeout(saveTimer);
  }, [members, checkpoint, activeAlert, resolvedAlerts, messages, events, partyCode]);

  // Switch party code
  const setPartyCode = useCallback((newCode: string) => {
    const cleaned = newCode.trim().toUpperCase() || DEFAULT_PARTY_CODE;
    setPartyCodeState(cleaned);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('code', cleaned);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Update member condition
  const updateMemberStatus = useCallback(
    (memberId: string, status: TeamStatus, note?: string) => {
      const target = members.find((m) => m.id === memberId);
      const memberName = target ? target.name : 'Team Member';
      const callsign = target ? target.callsign : '';

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                status,
                note: note ?? m.note,
                lastSeen: new Date().toISOString(),
                lastSeenFormatted: 'Just now',
              }
            : m
        )
      );

      const statusLabels: Record<TeamStatus, string> = {
        safe: 'Safe',
        caution: 'Needs Assistance',
        emergency: 'Medical Emergency',
      };

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'status_change',
        actor: `${memberName} (${callsign})`,
        title: `Status set to ${statusLabels[status]}`,
        description: note || `Member marked as ${statusLabels[status].toLowerCase()}.`,
        timestamp: new Date().toISOString(),
        severity: status === 'emergency' ? 'emergency' : status === 'caution' ? 'caution' : 'normal',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (isOfflineDemo) {
        const queuedItem: QueuedEvent = {
          id: 'q-' + Date.now(),
          type: 'status_update',
          payload: { memberId, status, note, event },
          queuedAt: new Date().toISOString(),
        };
        const nextQueue = [...offlineQueue, queuedItem];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(partyCode, nextQueue);
      } else {
        // Send to backend WebSocket & BroadcastChannel
        realtimeClient.send('STATUS_CHANGE', { memberId, status, note, event });
        partyHub.broadcast('STATUS_UPDATE', { memberId, status, note, event });
      }

      if (status === 'emergency' && (!activeAlert || activeAlert.memberId !== memberId)) {
        createMedicalAlert(memberId, note || 'Immediate field emergency flagged');
      } else if (status === 'safe' && activeAlert && activeAlert.memberId === memberId) {
        resolveAlert(activeAlert.id);
      }
    },
    [members, isOfflineDemo, offlineQueue, partyCode, activeAlert]
  );

  // Live GPS tracking toggle
  const toggleLiveTracking = useCallback(() => {
    if (isLiveTracking) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
      addEvent({
        type: 'status_change',
        actor: 'Commander (You)',
        title: 'Real-time GPS Tracking Paused',
        description: 'Command unit live tracking feed stopped.',
        severity: 'normal',
      });
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      setIsLiveTracking(true);
      const you = members.find((m) => m.isCurrentUser) || members[0];

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setUserLocation({ lat, lng });

          setMembers((prev) =>
            prev.map((m) => (m.id === you.id ? { ...m, lat, lng, lastSeenFormatted: 'Just now' } : m))
          );

          if (!isOfflineDemo) {
            realtimeClient.send('MEMBER_LOCATION_TRACKING', {
              memberId: you.id,
              lat,
              lng,
              battery: you.battery,
            });
          }
        },
        (err) => {
          console.warn('Geolocation tracking error:', err);
          setIsLiveTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );

      addEvent({
        type: 'status_change',
        actor: 'Commander (You)',
        title: 'Real-time GPS Tracking Activated',
        description: 'Broadcasting live position telemetry to party network.',
        severity: 'normal',
      });
    }
  }, [isLiveTracking, members, isOfflineDemo, addEvent]);

  // Create Medical Alert
  const createMedicalAlert = useCallback(
    (memberId: string, details?: string) => {
      const target = members.find((m) => m.id === memberId);
      if (!target) return;

      const newAlert: MedicalAlert = {
        id: 'alert-' + Date.now(),
        memberId: target.id,
        memberName: target.name,
        callsign: target.callsign,
        timestamp: new Date().toISOString(),
        lat: target.lat,
        lng: target.lng,
        acknowledged: false,
        resolved: false,
        details: details || `Urgent medical emergency reported for ${target.name} at coordinates [${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}].`,
      };

      setActiveAlert(newAlert);
      setIsEmergencyBannerDismissed(false);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, status: 'emergency', battery: Math.min(m.battery, 25) } : m
        )
      );

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'medical_alert',
        actor: `${target.name} (${target.callsign})`,
        title: 'MEDICAL EMERGENCY BROADCAST',
        description: details || 'Medical assistance requested via emergency beacon.',
        timestamp: new Date().toISOString(),
        severity: 'emergency',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      const alertMsg: TeamMessage = {
        id: 'msg-alert-' + Date.now(),
        senderId: target.id,
        senderName: target.name,
        senderCallsign: target.callsign,
        timestamp: new Date().toISOString(),
        text: `🚨 EMERGENCY BEACON: Medical assistance requested! Position: [${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}]`,
        isEmergencyAlert: true,
        partyCode,
      };
      setMessages((prev) => [...prev, alertMsg]);

      if (isOfflineDemo) {
        const queuedItem: QueuedEvent = {
          id: 'q-' + Date.now(),
          type: 'medical_alert',
          payload: { alert: newAlert, event },
          queuedAt: new Date().toISOString(),
        };
        const nextQueue = [...offlineQueue, queuedItem];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(partyCode, nextQueue);
      } else {
        realtimeClient.send('EMERGENCY_TRIGGER', { memberId, details });
        partyHub.broadcast('MEDICAL_ALERT', { alert: newAlert, event });
      }
    },
    [members, isOfflineDemo, offlineQueue, partyCode]
  );

  // Acknowledge Alert
  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      if (!activeAlert || activeAlert.id !== alertId) return;

      const updatedAlert: MedicalAlert = {
        ...activeAlert,
        acknowledged: true,
        acknowledgedBy: 'Commander (You)',
        acknowledgedAt: new Date().toISOString(),
      };

      setActiveAlert(updatedAlert);

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'alert_acknowledged',
        actor: 'Commander (You)',
        title: 'Emergency Alert Acknowledged',
        description: `Acknowledged distress signal from ${activeAlert.memberName}. Rescue unit en route.`,
        timestamp: new Date().toISOString(),
        severity: 'caution',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (!isOfflineDemo) {
        realtimeClient.send('EMERGENCY_ACK', {
          alertId,
          acknowledgedBy: 'Commander (You)',
        });
        partyHub.broadcast('ALERT_ACK', {
          alertId,
          acknowledgedBy: 'Commander (You)',
          event,
        });
      }
    },
    [activeAlert, isOfflineDemo]
  );

  // Resolve Alert
  const resolveAlert = useCallback(
    (alertId: string) => {
      if (!activeAlert || activeAlert.id !== alertId) return;

      const resolved: MedicalAlert = {
        ...activeAlert,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Commander (You)',
      };

      setActiveAlert(null);
      setResolvedAlerts((prev) => [resolved, ...prev]);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === resolved.memberId ? { ...m, status: 'safe', note: 'Medical event resolved.' } : m
        )
      );

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'alert_resolved',
        actor: 'Commander (You)',
        title: 'Emergency Alert Resolved',
        description: `Distress incident for ${resolved.memberName} closed. Patient secured.`,
        timestamp: new Date().toISOString(),
        severity: 'normal',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (!isOfflineDemo) {
        realtimeClient.send('EMERGENCY_RESOLVE', {
          alertId,
          resolvedBy: 'Commander (You)',
        });
        partyHub.broadcast('ALERT_RESOLVED', { alert: resolved, event });
      }
    },
    [activeAlert, isOfflineDemo]
  );

  // Set Checkpoint
  const setCheckpoint = useCallback(
    (lat: number, lng: number, name?: string) => {
      const newCkpt: Checkpoint = {
        id: 'ckpt-' + Date.now(),
        name: name || `Checkpoint ${partyCode} (Rendezvous)`,
        lat,
        lng,
        createdAt: new Date().toISOString(),
        createdBy: 'Commander (You)',
        description: `Designated team assembly and tactical extraction area for Squad ${partyCode}`,
      };

      setCheckpointState(newCkpt);
      setIsSettingCheckpoint(false);

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'checkpoint_created',
        actor: 'Commander (You)',
        title: 'Assembly Checkpoint Designated',
        description: `${newCkpt.name} placed at [${lat.toFixed(4)}, ${lng.toFixed(4)}].`,
        timestamp: new Date().toISOString(),
        severity: 'normal',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (isOfflineDemo) {
        const queuedItem: QueuedEvent = {
          id: 'q-' + Date.now(),
          type: 'checkpoint',
          payload: { checkpoint: newCkpt, event },
          queuedAt: new Date().toISOString(),
        };
        const nextQueue = [...offlineQueue, queuedItem];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(partyCode, nextQueue);
      } else {
        realtimeClient.send('CHECKPOINT_SET', { checkpoint: newCkpt, actor: 'Commander (You)' });
        partyHub.broadcast('CHECKPOINT_SET', { checkpoint: newCkpt, event });
      }
    },
    [isOfflineDemo, offlineQueue, partyCode]
  );

  // Remove Checkpoint
  const removeCheckpoint = useCallback(() => {
    if (!checkpoint) return;
    const oldName = checkpoint.name;
    setCheckpointState(null);

    const event: ActivityEvent = {
      id: 'evt-' + Date.now(),
      type: 'checkpoint_removed',
      actor: 'Commander (You)',
      title: 'Checkpoint Cleared',
      description: `${oldName} cleared from tactical grid.`,
      timestamp: new Date().toISOString(),
      severity: 'normal',
    };

    setEvents((prev) => [event, ...prev.slice(0, 49)]);

    if (!isOfflineDemo) {
      realtimeClient.send('CHECKPOINT_REMOVE', {});
      partyHub.broadcast('CHECKPOINT_REMOVED', { event });
    }
  }, [checkpoint, isOfflineDemo]);

  // Send message (Real-time squad chat)
  const sendMessage = useCallback(
    (text: string, isEmergency = false) => {
      if (!text.trim()) return;

      const sender = members.find((m) => m.id === activeMemberId) || members[0];

      const newMsg: TeamMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        senderId: sender.id,
        senderName: sender.name,
        senderCallsign: sender.callsign,
        timestamp: new Date().toISOString(),
        text: text.trim(),
        isEmergencyAlert: isEmergency,
        isQueued: isOfflineDemo,
        partyCode,
      };

      setMessages((prev) => [...prev, newMsg]);

      const event: ActivityEvent = {
        id: 'evt-' + Date.now(),
        type: 'message_sent',
        actor: `${sender.name} (${sender.callsign})`,
        title: 'Team Message Dispatched',
        description: text.length > 50 ? text.substring(0, 47) + '...' : text,
        timestamp: new Date().toISOString(),
        severity: isEmergency ? 'emergency' : 'normal',
      };

      setEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (isOfflineDemo) {
        const queuedItem: QueuedEvent = {
          id: 'q-' + Date.now(),
          type: 'message',
          payload: { message: newMsg },
          queuedAt: new Date().toISOString(),
        };
        const nextQueue = [...offlineQueue, queuedItem];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(partyCode, nextQueue);
      } else {
        // Persist directly to Cloud Firestore & broadcast to real-time engine
        backendService.sendMessage(
          partyCode,
          sender.id,
          sender.name,
          sender.callsign,
          text.trim(),
          isEmergency
        ).then(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === newMsg.id ? { ...m, deliveryState: 'delivered' } : m))
          );
        }).catch((err) => {
          console.warn('Firestore message sync note:', err);
        });

        realtimeClient.send('CHAT_MESSAGE', {
          senderId: sender.id,
          senderName: sender.name,
          senderCallsign: sender.callsign,
          text: text.trim(),
          isEmergencyAlert: isEmergency,
        });
        partyHub.broadcast('MESSAGE_SENT', { message: newMsg });
      }
    },
    [activeMemberId, members, isOfflineDemo, offlineQueue, partyCode]
  );

  // Offline Mode toggle handler
  const setIsOfflineDemo = useCallback(
    (offline: boolean) => {
      setIsOfflineDemoState(offline);
      if (!offline) {
        processDemoQueue();
      } else {
        addEvent({
          type: 'offline_queue_synced',
          actor: 'System',
          title: 'Offline Demo Mode Engaged',
          description: 'Network communication paused. Updates queued locally for persistence.',
          severity: 'caution',
        });
      }
    },
    [addEvent]
  );

  // Process offline demo queue
  const processDemoQueue = useCallback(() => {
    const queue = getOfflineQueue(partyCode);
    if (queue.length === 0) return;

    queue.forEach((item) => {
      if (item.type === 'status_update') {
        realtimeClient.send('STATUS_CHANGE', item.payload);
        partyHub.broadcast('STATUS_UPDATE', item.payload);
      } else if (item.type === 'message') {
        realtimeClient.send('CHAT_MESSAGE', item.payload.message);
        partyHub.broadcast('MESSAGE_SENT', item.payload);
      } else if (item.type === 'medical_alert') {
        realtimeClient.send('EMERGENCY_TRIGGER', { memberId: item.payload.alert.memberId });
        partyHub.broadcast('MEDICAL_ALERT', item.payload);
      } else if (item.type === 'checkpoint') {
        realtimeClient.send('CHECKPOINT_SET', item.payload);
        partyHub.broadcast('CHECKPOINT_SET', item.payload);
      }
    });

    setMessages((prev) =>
      prev.map((m) => (m.isQueued ? { ...m, isQueued: false } : m))
    );

    addEvent({
      type: 'offline_queue_synced',
      actor: 'System Sync Engine',
      title: 'Local Queue Synchronized',
      description: `Flushed and synchronized ${queue.length} pending records with party ${partyCode}.`,
      severity: 'normal',
    });

    clearOfflineQueue(partyCode);
    setOfflineQueue([]);
  }, [partyCode, addEvent]);

  // Simulation controls
  const stepSimulation = useCallback(() => {
    // In live GPS mode, do NOT inject synthetic movements or dummy jitter
    if (dataSourceMode === 'live_gps') {
      return;
    }

    if (!isOfflineDemo) {
      realtimeClient.send('SIMULATION_STEP', {});
    }

    setMembers((prev) =>
      prev.map((m) => {
        if (m.isCurrentUser) {
          return {
            ...m,
            battery: Math.max(1, m.battery - (Math.random() < 0.2 ? 1 : 0)),
            lastSeen: new Date().toISOString(),
            lastSeenFormatted: 'Just now',
          };
        }

        const deltaLat = Math.sin(Date.now() / 8000 + m.lat * 100) * 0.0003;
        const deltaLng = Math.cos(Date.now() / 8000 + m.lng * 100) * 0.0003;

        return {
          ...m,
          lat: Number((m.lat + deltaLat).toFixed(5)),
          lng: Number((m.lng + deltaLng).toFixed(5)),
          battery: Math.max(1, m.battery - (Math.random() < 0.25 ? 1 : 0)),
          lastSeen: new Date().toISOString(),
          lastSeenFormatted: 'Just now',
        };
      })
    );

    setSimulation((prev) => ({
      ...prev,
      stepCount: prev.stepCount + 1,
      lastTickTime: Date.now(),
    }));
  }, [isOfflineDemo]);

  const startSimulation = useCallback(() => {
    setSimulation((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const pauseSimulation = useCallback(() => {
    setSimulation((prev) => ({ ...prev, isRunning: false }));
  }, []);

  useEffect(() => {
    if (!simulation.isRunning) return;
    const interval = setInterval(() => {
      stepSimulation();
    }, 4000);
    return () => clearInterval(interval);
  }, [simulation.isRunning, stepSimulation]);

  // Trigger real SOS emergency beacon for current operator or selected member
  const triggerDemoEmergency = useCallback(() => {
    const you = members.find((m) => m.isCurrentUser) || members[0];
    createMedicalAlert(
      you.id,
      `DISTRESS BEACON: Urgent field assistance requested by ${you.name} (${you.callsign}) at coordinates [${you.lat.toFixed(4)}, ${you.lng.toFixed(4)}].`
    );
    setSelectedMemberId(you.id);
    setFlyToLocation({ lat: you.lat, lng: you.lng });
  }, [members, createMedicalAlert]);

  // Deploy real operative to squad in database
  const deployOperative = useCallback(
    async (operativeData: Partial<TeamMember> & { name: string; role: string }) => {
      const you = members.find((m) => m.isCurrentUser) || members[0];
      const newId = `op-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newMember: TeamMember = {
        id: newId,
        partyCode,
        name: operativeData.name,
        callsign: operativeData.callsign || `Unit-${members.length + 1}`,
        role: operativeData.role,
        lat: operativeData.lat ?? you?.lat ?? 28.6139,
        lng: operativeData.lng ?? you?.lng ?? 77.2090,
        status: operativeData.status || 'safe',
        battery: operativeData.battery ?? 95,
        lastSeen: new Date().toISOString(),
        lastSeenFormatted: 'Just now',
        note: operativeData.note || 'Deployed field operative',
        isCurrentUser: false,
      };

      setMembers((prev) => [...prev, newMember]);
      await backendService.registerMember(partyCode, newMember);

      addEvent({
        type: 'status_change',
        actor: `${newMember.name} (${newMember.callsign})`,
        title: 'Operative Deployed to Grid',
        description: `${newMember.name} registered as ${newMember.role} in Squad ${partyCode}.`,
        severity: 'normal',
      });
    },
    [members, partyCode, addEvent]
  );

  // Remove operative from squad in database
  const removeOperative = useCallback(
    async (memberId: string) => {
      const target = members.find((m) => m.id === memberId);
      if (!target) return;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      await backendService.removeMember(partyCode, memberId);

      addEvent({
        type: 'status_change',
        actor: `${target.name} (${target.callsign})`,
        title: 'Operative Decommissioned',
        description: `${target.name} removed from Squad ${partyCode} grid.`,
        severity: 'normal',
      });
    },
    [members, partyCode, addEvent]
  );

  // Reset database & squad state to clean room
  const resetPartyData = useCallback(async () => {
    try {
      await fetch(`/api/parties/${partyCode}/reset`, { method: 'POST' });
    } catch {}
    clearPartyState(partyCode);
    const you: TeamMember = {
      id: operatorProfile.id,
      partyCode,
      name: operatorProfile.name,
      callsign: operatorProfile.callsign,
      role: 'Operations Coordinator',
      lat: userLocation?.lat || 28.6139,
      lng: userLocation?.lng || 77.2090,
      status: 'safe',
      battery: 98,
      lastSeen: new Date().toISOString(),
      lastSeenFormatted: 'Just now',
      note: 'Command terminal operative',
      isCurrentUser: true,
    };
    setMembers([you]);
    setCheckpointState(null);
    setActiveAlert(null);
    setResolvedAlerts([]);
    setMessages([]);
    setEvents([
      {
        id: `evt-${Date.now()}`,
        type: 'party_connected',
        actor: 'System',
        title: 'Tactical Grid Reset',
        description: `Squad ${partyCode} database initialized to clean state. Ready for deployment.`,
        timestamp: new Date().toISOString(),
        severity: 'normal',
      },
    ]);
    setSelectedMemberId(you.id);
    setActiveMemberId(you.id);
    setIsEmergencyBannerDismissed(false);
  }, [partyCode, operatorProfile, userLocation]);

  const resetDemo = resetPartyData;

  // User location request
  const requestUserLocation = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);

          setMembers((prev) =>
            prev.map((m) =>
              m.isCurrentUser
                ? {
                    ...m,
                    lat: Number(coords.lat.toFixed(5)),
                    lng: Number(coords.lng.toFixed(5)),
                    note: 'Live GPS position calibrated with browser permission',
                  }
                : m
            )
          );

          setFlyToLocation(coords);

          if (!isOfflineDemo) {
            const you = members.find((m) => m.isCurrentUser) || members[0];
            realtimeClient.send('MEMBER_LOCATION_TRACKING', {
              memberId: you.id,
              lat: coords.lat,
              lng: coords.lng,
              battery: you.battery,
            });
          }

          addEvent({
            type: 'status_change',
            actor: 'Commander (You)',
            title: 'GPS Position Locked',
            description: `Calibrated command unit to [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}].`,
            severity: 'normal',
          });

          resolve(true);
        },
        (err) => {
          console.warn('Geolocation failed:', err);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }, [members, isOfflineDemo, addEvent]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;
  const activeMember = members.find((m) => m.id === activeMemberId) || members[0];

  const value: SahyogContextValue = {
    partyCode,
    setPartyCode,
    missionName,
    missionObjective,
    createNewParty,
    allParties,
    fetchAllParties,
    connectedTabsCount,
    isBackendConnected,
    isFirebaseConnected: backendService.isFirebaseActive,
    members,
    selectedMemberId,
    selectedMember,
    setSelectedMemberId,
    activeMemberId,
    setActiveMemberId,
    activeMember,
    updateMemberStatus,
    isLiveTracking,
    toggleLiveTracking,
    activeAlert,
    resolvedAlerts,
    createMedicalAlert,
    acknowledgeAlert,
    resolveAlert,
    checkpoint,
    isSettingCheckpoint,
    setIsSettingCheckpoint,
    setCheckpoint,
    removeCheckpoint,
    messages,
    sendMessage,
    events,
    addEvent,
    isOfflineDemo,
    setIsOfflineDemo,
    offlineQueue,
    processDemoQueue,
    lastSavedAt,
    simulation,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    triggerDemoEmergency,
    resetDemo,
    mapMode,
    setMapMode,
    userLocation,
    requestUserLocation,
    flyToLocation,
    setFlyToLocation,
    activeTab,
    setActiveTab,
    isDemoTourOpen,
    setIsDemoTourOpen,
    isDiagnosticsOpen,
    setIsDiagnosticsOpen,
    isPartyModalOpen,
    setIsPartyModalOpen,
    isCheckpointsModalOpen,
    setIsCheckpointsModalOpen,
    isMessagesModalOpen,
    setIsMessagesModalOpen,
    isAlertsModalOpen,
    setIsAlertsModalOpen,
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
    isEmergencyBannerDismissed,
    setIsEmergencyBannerDismissed,
    dataSourceMode,
    setDataSourceMode,
    liveTelemetry,
    isLiveGPSActive,
    deployOperative,
    removeOperative,
    resetPartyData,
    isDeployModalOpen,
    setIsDeployModalOpen,
  };

  return <SahyogContext.Provider value={value}>{children}</SahyogContext.Provider>;
};

export const useSahyog = () => {
  const context = useContext(SahyogContext);
  if (!context) {
    throw new Error('useSahyog must be used within a SahyogProvider');
  }
  return context;
};
