/**
 * SAHYOG - Connected Teams. Safer Missions.
 * Core domain types for tactical emergency coordination
 */

export type TeamStatus = 'safe' | 'caution' | 'emergency';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TeamMember {
  id: string;
  partyCode?: string;
  name: string;
  callsign: string;
  role: string;
  lat: number;
  lng: number;
  status: TeamStatus;
  battery: number; // 0 - 100
  lastSeen: string; // ISO timestamp
  lastSeenFormatted?: string;
  note?: string;
  isCurrentUser?: boolean;
  accuracy?: number; // GPS horizontal accuracy in meters
  heading?: number | null; // Compass heading in degrees
  speed?: number | null; // Speed in m/s
  isLiveGPS?: boolean;
}

export interface PartySummary {
  partyCode: string;
  missionName: string;
  missionObjective: string;
  createdAt: string;
  memberCount: number;
  activeEmergencies: number;
  hasCheckpoint: boolean;
}

export interface MedicalAlert {
  id: string;
  memberId: string;
  memberName: string;
  callsign: string;
  timestamp: string;
  lat: number;
  lng: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  details: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: string;
  createdBy: string;
  description?: string;
}

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderCallsign: string;
  timestamp: string;
  text: string;
  isEmergencyAlert?: boolean;
  isQueued?: boolean;
  deliveryState?: 'pending' | 'sent' | 'delivered' | 'failed';
  partyCode: string;
}

export type EventType =
  | 'status_change'
  | 'medical_alert'
  | 'alert_acknowledged'
  | 'alert_resolved'
  | 'checkpoint_created'
  | 'checkpoint_removed'
  | 'message_sent'
  | 'offline_queue_synced'
  | 'simulation_tick'
  | 'party_connected';

export interface ActivityEvent {
  id: string;
  type: EventType;
  actor: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'normal' | 'caution' | 'emergency';
}

export interface QueuedEvent {
  id: string;
  type: 'status_update' | 'message' | 'medical_alert' | 'checkpoint';
  payload: any;
  queuedAt: string;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number; // 1x, 2x, 5x
  stepCount: number;
  lastTickTime: number | null;
}

export interface DiagnosticResult {
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  output: string;
}

export type ActiveTab = 'dashboard' | 'team' | 'analytics' | 'messages' | 'checkpoints' | 'alerts' | 'history' | 'settings';
