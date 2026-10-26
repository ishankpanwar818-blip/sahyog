import { TeamMember, Checkpoint, MedicalAlert, TeamMessage, ActivityEvent } from '../types';

export const DEFAULT_PARTY_CODE = 'ALPHA-7';

// Default initial responder profile for current session (calibrated with live device GPS and battery)
export function createDefaultUserMember(
  partyCode: string,
  userId = 'operator-lead',
  name = 'Operator (You)',
  callsign = 'Alpha Lead',
  coords: { lat: number; lng: number } = { lat: 28.6139, lng: 77.2090 } // Default center until GPS locks
): TeamMember {
  return {
    id: userId,
    partyCode: partyCode.toUpperCase().trim(),
    name,
    callsign,
    role: 'Operations Coordinator',
    lat: coords.lat,
    lng: coords.lng,
    status: 'safe',
    battery: 98,
    lastSeen: new Date().toISOString(),
    lastSeenFormatted: 'Just now',
    note: 'Command terminal operative',
    isCurrentUser: true,
  };
}

// Clean baseline without synthetic dummy casualties or mock messages
export const INITIAL_MEMBERS: TeamMember[] = [
  createDefaultUserMember(DEFAULT_PARTY_CODE),
];

export const INITIAL_CHECKPOINT: Checkpoint | null = null;

export const INITIAL_MEDICAL_ALERT: MedicalAlert | null = null;

export const INITIAL_MESSAGES: TeamMessage[] = [];

export const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: `evt-${Date.now()}`,
    type: 'party_connected',
    actor: 'System',
    title: 'Tactical Network Initialized',
    description: `Real-time synchronization connected for Squad ${DEFAULT_PARTY_CODE}. Ready for live field deployment.`,
    timestamp: new Date().toISOString(),
    severity: 'normal',
  },
];
