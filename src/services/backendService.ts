import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isConfigured, handleFirestoreError, OperationType } from './firebase';
import {
  TeamMember,
  TeamStatus,
  MedicalAlert,
  Checkpoint,
  TeamMessage,
  ActivityEvent,
} from '../types';
import { realtimeClient } from '../utils/realtimeClient';
import { partyHub } from '../utils/syncBroadcast';

export interface BackendService {
  isFirebaseActive: boolean;
  createOrJoinTeam: (teamId: string, teamName: string, objective?: string) => Promise<any>;
  registerMember: (teamId: string, member: TeamMember) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  updateMemberStatus: (teamId: string, memberId: string, status: TeamStatus, note?: string) => Promise<void>;
  updateMemberLocation: (teamId: string, memberId: string, lat: number, lng: number, battery?: number, accuracy?: number, heading?: number | null, speed?: number | null) => Promise<void>;
  subscribeToTeamMembers: (teamId: string, onUpdate: (members: TeamMember[]) => void) => () => void;
  createMedicalAlert: (teamId: string, memberId: string, memberName: string, callsign: string, lat: number, lng: number, details: string) => Promise<MedicalAlert>;
  acknowledgeMedicalAlert: (teamId: string, alertId: string, acknowledgedBy: string) => Promise<void>;
  resolveMedicalAlert: (teamId: string, alertId: string, resolvedBy: string) => Promise<void>;
  subscribeToTeamAlerts: (teamId: string, onUpdate: (activeAlert: MedicalAlert | null, resolved: MedicalAlert[]) => void) => () => void;
  sendMessage: (teamId: string, senderId: string, senderName: string, senderCallsign: string, content: string, isEmergency?: boolean) => Promise<TeamMessage>;
  subscribeToMessages: (teamId: string, onUpdate: (messages: TeamMessage[]) => void) => () => void;
  createCheckpoint: (teamId: string, name: string, lat: number, lng: number, createdBy: string) => Promise<Checkpoint>;
  deleteCheckpoint: (teamId: string, checkpointId: string) => Promise<void>;
  subscribeToCheckpoints: (teamId: string, onUpdate: (checkpoint: Checkpoint | null) => void) => () => void;
  createActivityEvent: (teamId: string, actorId: string, actor: string, eventType: string, title: string, description: string, severity?: 'normal' | 'caution' | 'emergency') => Promise<void>;
  subscribeToActivityEvents: (teamId: string, onUpdate: (events: ActivityEvent[]) => void) => () => void;
}

class UnifiedBackendServiceImpl implements BackendService {
  public isFirebaseActive: boolean = isConfigured && !!db;

  // Initialize or fetch team room in Cloud Firestore + Express
  async createOrJoinTeam(teamId: string, teamName: string, objective?: string): Promise<any> {
    const cleanTeamId = teamId.trim().toUpperCase();

    // 1. Cloud Firestore persistence
    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}`;
      try {
        const teamRef = doc(db, 'teams', cleanTeamId);
        const snap = await getDoc(teamRef);
        if (!snap.exists()) {
          await setDoc(teamRef, {
            teamId: cleanTeamId,
            teamName: teamName || `Squad ${cleanTeamId}`,
            missionObjective: objective || 'Tactical emergency coordination & disaster response',
            createdAt: new Date().toISOString(),
            createdBy: 'Command Operative',
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // 2. Also register in local Express backend
    try {
      await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode: cleanTeamId,
          missionName: teamName,
          missionObjective: objective,
        }),
      });
    } catch {}

    return { teamId: cleanTeamId, teamName };
  }

  // Register a new operative in the squad
  async registerMember(teamId: string, member: TeamMember): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/members/${member.id}`;
      try {
        const memberRef = doc(db, 'teams', cleanTeamId, 'members', member.id);
        await setDoc(
          memberRef,
          {
            memberId: member.id,
            teamId: cleanTeamId,
            displayName: member.name,
            callsign: member.callsign,
            role: member.role,
            simulatedLatitude: member.lat,
            simulatedLongitude: member.lng,
            simulatedBattery: member.battery,
            condition: member.status,
            note: member.note || '',
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Local server
    try {
      await fetch(`/api/parties/${cleanTeamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member }),
      });
    } catch {}

    realtimeClient.send('MEMBER_REGISTER', { member, partyCode: cleanTeamId });
    partyHub.broadcast('MEMBER_REGISTERED', { member, partyCode: cleanTeamId });
  }

  // Remove an operative from the squad
  async removeMember(teamId: string, memberId: string): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/members/${memberId}`;
      try {
        const memberRef = doc(db, 'teams', cleanTeamId, 'members', memberId);
        await deleteDoc(memberRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/members/${memberId}`, {
        method: 'DELETE',
      });
    } catch {}

    realtimeClient.send('MEMBER_REMOVE', { memberId, partyCode: cleanTeamId });
    partyHub.broadcast('MEMBER_REMOVED', { memberId, partyCode: cleanTeamId });
  }

  // Update member condition (Safe / Caution / Emergency)
  async updateMemberStatus(teamId: string, memberId: string, status: TeamStatus, note?: string): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/members/${memberId}`;
      try {
        const memberRef = doc(db, 'teams', cleanTeamId, 'members', memberId);
        await setDoc(
          memberRef,
          {
            condition: status,
            note: note || '',
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/members/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
    } catch {}

    realtimeClient.send('STATUS_CHANGE', { memberId, status, note, partyCode: cleanTeamId });
    partyHub.broadcast('STATUS_UPDATE', { memberId, status, note, partyCode: cleanTeamId });
  }

  // Update live position telemetry (GPS, Battery, Speed, Compass)
  async updateMemberLocation(
    teamId: string,
    memberId: string,
    lat: number,
    lng: number,
    battery?: number,
    accuracy?: number,
    heading?: number | null,
    speed?: number | null
  ): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/members/${memberId}`;
      try {
        const memberRef = doc(db, 'teams', cleanTeamId, 'members', memberId);
        await setDoc(
          memberRef,
          {
            simulatedLatitude: lat,
            simulatedLongitude: lng,
            simulatedBattery: battery ?? 95,
            accuracy: accuracy ?? 10,
            heading: heading ?? null,
            speed: speed ?? null,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/members/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, battery, accuracy, heading, speed }),
      });
    } catch {}

    realtimeClient.send('MEMBER_LOCATION_TRACKING', {
      memberId,
      lat,
      lng,
      battery,
      accuracy,
      heading,
      speed,
      partyCode: cleanTeamId,
    });
  }

  // Subscribe to real-time team members from Firestore
  subscribeToTeamMembers(teamId: string, onUpdate: (members: TeamMember[]) => void): () => void {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/members`;
      try {
        const q = collection(db, 'teams', cleanTeamId, 'members');
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const list: TeamMember[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                  id: data.memberId || d.id,
                  partyCode: cleanTeamId,
                  name: data.displayName || data.name || 'Field Responder',
                  callsign: data.callsign || `${cleanTeamId}-Unit`,
                  role: data.role || 'Operative',
                  lat: data.simulatedLatitude ?? data.lat ?? 28.6139,
                  lng: data.simulatedLongitude ?? data.lng ?? 77.2090,
                  status: (data.condition || data.status || 'safe') as TeamStatus,
                  battery: data.simulatedBattery ?? data.battery ?? 90,
                  lastSeen: data.lastUpdated || new Date().toISOString(),
                  lastSeenFormatted: 'Just now',
                  note: data.note,
                  accuracy: data.accuracy,
                  heading: data.heading,
                  speed: data.speed,
                  isCurrentUser: data.isCurrentUser || d.id.includes('lead'),
                };
              });
              onUpdate(list);
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, path);
          }
        );
        return unsub;
      } catch (e) {}
    }

    return () => {};
  }

  // Medical Alert beacon creation
  async createMedicalAlert(
    teamId: string,
    memberId: string,
    memberName: string,
    callsign: string,
    lat: number,
    lng: number,
    details: string
  ): Promise<MedicalAlert> {
    const cleanTeamId = teamId.trim().toUpperCase();
    const alertId = `alert-${cleanTeamId.toLowerCase()}-${Date.now()}`;

    const alert: MedicalAlert = {
      id: alertId,
      memberId,
      memberName,
      callsign,
      timestamp: new Date().toISOString(),
      lat,
      lng,
      acknowledged: false,
      resolved: false,
      details,
    };

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/alerts/${alertId}`;
      try {
        const alertRef = doc(db, 'teams', cleanTeamId, 'alerts', alertId);
        await setDoc(alertRef, {
          alertId,
          teamId: cleanTeamId,
          memberId,
          memberName,
          callsign,
          type: 'medical_emergency',
          severity: 'emergency',
          message: details,
          latitude: lat,
          longitude: lng,
          status: 'active',
          createdAt: alert.timestamp,
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    realtimeClient.send('EMERGENCY_TRIGGER', {
      memberId,
      memberName,
      callsign,
      lat,
      lng,
      details,
      partyCode: cleanTeamId,
    });
    partyHub.broadcast('MEDICAL_ALERT', { alert, partyCode: cleanTeamId });

    return alert;
  }

  // Acknowledge Medical Alert
  async acknowledgeMedicalAlert(teamId: string, alertId: string, acknowledgedBy: string): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/alerts/${alertId}`;
      try {
        const alertRef = doc(db, 'teams', cleanTeamId, 'alerts', alertId);
        await setDoc(
          alertRef,
          {
            status: 'acknowledged',
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy,
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    realtimeClient.send('EMERGENCY_ACK', { alertId, acknowledgedBy, partyCode: cleanTeamId });
    partyHub.broadcast('ALERT_ACK', { alertId, acknowledgedBy, partyCode: cleanTeamId });
  }

  // Resolve Medical Alert
  async resolveMedicalAlert(teamId: string, alertId: string, resolvedBy: string): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/alerts/${alertId}`;
      try {
        const alertRef = doc(db, 'teams', cleanTeamId, 'alerts', alertId);
        await setDoc(
          alertRef,
          {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            resolvedBy,
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    realtimeClient.send('EMERGENCY_RESOLVE', { alertId, resolvedBy, partyCode: cleanTeamId });
    partyHub.broadcast('ALERT_RESOLVED', { alertId, resolvedBy, partyCode: cleanTeamId });
  }

  // Subscribe to Medical Alerts
  subscribeToTeamAlerts(
    teamId: string,
    onUpdate: (activeAlert: MedicalAlert | null, resolved: MedicalAlert[]) => void
  ): () => void {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/alerts`;
      try {
        const alertsCol = collection(db, 'teams', cleanTeamId, 'alerts');
        const unsub = onSnapshot(
          alertsCol,
          (snapshot) => {
            let active: MedicalAlert | null = null;
            const resolved: MedicalAlert[] = [];

            snapshot.docs.forEach((d) => {
              const data = d.data();
              const item: MedicalAlert = {
                id: data.alertId || d.id,
                memberId: data.memberId,
                memberName: data.memberName || 'Operative',
                callsign: data.callsign || 'Unit',
                timestamp: data.createdAt || new Date().toISOString(),
                lat: data.latitude ?? 28.6139,
                lng: data.longitude ?? 77.2090,
                acknowledged: data.status === 'acknowledged',
                acknowledgedBy: data.acknowledgedBy,
                acknowledgedAt: data.acknowledgedAt,
                resolved: data.status === 'resolved',
                resolvedAt: data.resolvedAt,
                resolvedBy: data.resolvedBy,
                details: data.message || 'Distress signal',
              };

              if (item.resolved) {
                resolved.push(item);
              } else if (!active || new Date(item.timestamp) > new Date(active.timestamp)) {
                active = item;
              }
            });

            onUpdate(active, resolved);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, path);
          }
        );
        return unsub;
      } catch (e) {}
    }

    return () => {};
  }

  // Send squad radio message
  async sendMessage(
    teamId: string,
    senderId: string,
    senderName: string,
    senderCallsign: string,
    content: string,
    isEmergency = false
  ): Promise<TeamMessage> {
    const cleanTeamId = teamId.trim().toUpperCase();
    const messageId = `msg-${cleanTeamId.toLowerCase()}-${Date.now()}`;

    const msg: TeamMessage = {
      id: messageId,
      senderId,
      senderName,
      senderCallsign,
      timestamp: new Date().toISOString(),
      text: content,
      isEmergencyAlert: isEmergency,
      partyCode: cleanTeamId,
    };

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/messages/${messageId}`;
      try {
        const msgRef = doc(db, 'teams', cleanTeamId, 'messages', messageId);
        await setDoc(msgRef, {
          messageId,
          teamId: cleanTeamId,
          senderId,
          senderName,
          senderCallsign,
          content,
          isEmergency,
          deliveryState: 'delivered',
          createdAt: msg.timestamp,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch {}

    realtimeClient.send('CHAT_MESSAGE', {
      senderId,
      senderName,
      senderCallsign,
      text: content,
      isEmergencyAlert: isEmergency,
      partyCode: cleanTeamId,
    });
    partyHub.broadcast('MESSAGE_SENT', { message: msg });

    return msg;
  }

  // Subscribe to messages
  subscribeToMessages(teamId: string, onUpdate: (messages: TeamMessage[]) => void): () => void {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/messages`;
      try {
        const q = query(collection(db, 'teams', cleanTeamId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const msgs: TeamMessage[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                  id: data.messageId || d.id,
                  senderId: data.senderId,
                  senderName: data.senderName,
                  senderCallsign: data.senderCallsign,
                  timestamp: data.createdAt || new Date().toISOString(),
                  text: data.content || '',
                  isEmergencyAlert: data.isEmergency || false,
                  partyCode: cleanTeamId,
                };
              });
              onUpdate(msgs);
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, path);
          }
        );
        return unsub;
      } catch (e) {}
    }

    return () => {};
  }

  // Checkpoint management
  async createCheckpoint(teamId: string, name: string, lat: number, lng: number, createdBy: string): Promise<Checkpoint> {
    const cleanTeamId = teamId.trim().toUpperCase();
    const checkpointId = `ckpt-${cleanTeamId.toLowerCase()}-${Date.now()}`;

    const ckpt: Checkpoint = {
      id: checkpointId,
      name,
      lat,
      lng,
      createdAt: new Date().toISOString(),
      createdBy,
      description: `Rendezvous and assembly zone for Squad ${cleanTeamId}`,
    };

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/checkpoints/primary_checkpoint`;
      try {
        const ckptRef = doc(db, 'teams', cleanTeamId, 'checkpoints', 'primary_checkpoint');
        await setDoc(ckptRef, {
          checkpointId,
          teamId: cleanTeamId,
          name,
          latitude: lat,
          longitude: lng,
          createdBy,
          createdAt: ckpt.createdAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ckpt),
      });
    } catch {}

    realtimeClient.send('CHECKPOINT_SET', { checkpoint: ckpt, actor: createdBy, partyCode: cleanTeamId });
    partyHub.broadcast('CHECKPOINT_SET', { checkpoint: ckpt });

    return ckpt;
  }

  async deleteCheckpoint(teamId: string, checkpointId: string): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/checkpoints/primary_checkpoint`;
      try {
        const ckptRef = doc(db, 'teams', cleanTeamId, 'checkpoints', 'primary_checkpoint');
        await deleteDoc(ckptRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }

    try {
      await fetch(`/api/parties/${cleanTeamId}/checkpoints`, {
        method: 'DELETE',
      });
    } catch {}

    realtimeClient.send('CHECKPOINT_REMOVE', { partyCode: cleanTeamId });
    partyHub.broadcast('CHECKPOINT_REMOVED', {});
  }

  subscribeToCheckpoints(teamId: string, onUpdate: (checkpoint: Checkpoint | null) => void): () => void {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/checkpoints/primary_checkpoint`;
      try {
        const ckptRef = doc(db, 'teams', cleanTeamId, 'checkpoints', 'primary_checkpoint');
        const unsub = onSnapshot(
          ckptRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              onUpdate({
                id: data.checkpointId || docSnap.id,
                name: data.name,
                lat: data.latitude,
                lng: data.longitude,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
                description: `Primary checkpoint for Squad ${cleanTeamId}`,
              });
            } else {
              onUpdate(null);
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, path);
          }
        );
        return unsub;
      } catch (e) {}
    }

    return () => {};
  }

  // Activity events
  async createActivityEvent(
    teamId: string,
    actorId: string,
    actor: string,
    eventType: string,
    title: string,
    description: string,
    severity: 'normal' | 'caution' | 'emergency' = 'normal'
  ): Promise<void> {
    const cleanTeamId = teamId.trim().toUpperCase();
    const eventId = `evt-${Date.now()}`;

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/activityEvents/${eventId}`;
      try {
        const evtRef = doc(db, 'teams', cleanTeamId, 'activityEvents', eventId);
        await setDoc(evtRef, {
          eventId,
          teamId: cleanTeamId,
          actorId,
          actor,
          eventType,
          title,
          description,
          severity,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  subscribeToActivityEvents(teamId: string, onUpdate: (events: ActivityEvent[]) => void): () => void {
    const cleanTeamId = teamId.trim().toUpperCase();

    if (this.isFirebaseActive && db) {
      const path = `teams/${cleanTeamId}/activityEvents`;
      try {
        const q = query(
          collection(db, 'teams', cleanTeamId, 'activityEvents'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const list: ActivityEvent[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                  id: data.eventId || d.id,
                  type: data.eventType || 'status_change',
                  actor: data.actor || 'Operative',
                  title: data.title || '',
                  description: data.description || '',
                  timestamp: data.createdAt || new Date().toISOString(),
                  severity: data.severity || 'normal',
                };
              });
              onUpdate(list);
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, path);
          }
        );
        return unsub;
      } catch (e) {}
    }

    return () => {};
  }
}

export const backendService = new UnifiedBackendServiceImpl();
