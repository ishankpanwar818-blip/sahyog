import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = http.createServer(app);

app.use(express.json());

// In-Memory Database for Mission Parties (Clean real data store synced with Firestore)
interface PartyData {
  partyCode: string;
  missionName: string;
  missionObjective: string;
  createdAt: string;
  members: any[];
  checkpoint: any | null;
  activeAlert: any | null;
  resolvedAlerts: any[];
  messages: any[];
  events: any[];
}

const parties = new Map<string, PartyData>();

// Clean party factory - NO dummy casualties or mock canned messages
function createCleanParty(code: string, missionName?: string, objective?: string): PartyData {
  const cleanCode = code.toUpperCase().trim();
  return {
    partyCode: cleanCode,
    missionName: missionName || `Operation ${cleanCode}`,
    missionObjective: objective || 'Tactical emergency coordination & disaster response',
    createdAt: new Date().toISOString(),
    members: [],
    checkpoint: null,
    activeAlert: null,
    resolvedAlerts: [],
    messages: [],
    events: [
      {
        id: `evt-${Date.now()}`,
        type: 'party_connected',
        actor: 'System',
        title: 'Tactical Channel Synchronized',
        description: `Squad ${cleanCode} live operations room online and synchronized with cloud database.`,
        timestamp: new Date().toISOString(),
        severity: 'normal',
      },
    ],
  };
}

// Default clean party room
parties.set('ALPHA-7', createCleanParty('ALPHA-7', 'Operation Sentinel Alpha', 'High-readiness tactical casualty extraction'));

// ==========================================
// REST API ENDPOINTS
// ==========================================

// List all active party squads
app.get('/api/parties', (_req: Request, res: Response) => {
  const list = Array.from(parties.values()).map((p) => ({
    partyCode: p.partyCode,
    missionName: p.missionName,
    missionObjective: p.missionObjective,
    createdAt: p.createdAt,
    memberCount: p.members.length,
    activeEmergencies: p.members.filter((m) => m.status === 'emergency').length,
    hasCheckpoint: !!p.checkpoint,
  }));
  res.json({ success: true, parties: list });
});

// Create or join party
app.post('/api/parties', (req: Request, res: Response) => {
  const { partyCode, missionName, missionObjective } = req.body;
  if (!partyCode) {
    return res.status(400).json({ error: 'Party code is required' });
  }

  const clean = partyCode.trim().toUpperCase();
  if (!parties.has(clean)) {
    parties.set(clean, createCleanParty(clean, missionName, missionObjective));
  }

  const party = parties.get(clean)!;
  if (missionName && !party.missionName) party.missionName = missionName;
  if (missionObjective && !party.missionObjective) party.missionObjective = missionObjective;

  res.json({ success: true, party });
});

// Get authoritative party state
app.get('/api/parties/:partyCode', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    parties.set(code, createCleanParty(code));
  }
  res.json({ success: true, party: parties.get(code) });
});

// Register or add a real team member to squad
app.post('/api/parties/:partyCode/members', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    parties.set(code, createCleanParty(code));
  }
  const party = parties.get(code)!;
  const memberData = req.body.member;

  if (!memberData || !memberData.id) {
    return res.status(400).json({ error: 'Member data with ID is required' });
  }

  const existingIdx = party.members.findIndex((m) => m.id === memberData.id);
  const memberObj = {
    ...memberData,
    partyCode: code,
    lastSeen: new Date().toISOString(),
    lastSeenFormatted: 'Just now',
  };

  if (existingIdx >= 0) {
    party.members[existingIdx] = { ...party.members[existingIdx], ...memberObj };
  } else {
    party.members.push(memberObj);
  }

  const evt = {
    id: `evt-${Date.now()}`,
    type: 'status_change',
    actor: `${memberObj.name} (${memberObj.callsign || 'Unit'})`,
    title: 'Operator Deployed to Squad',
    description: `${memberObj.name} entered squad ${code} grid.`,
    timestamp: new Date().toISOString(),
    severity: 'normal',
  };
  party.events.unshift(evt);

  broadcastToParty(code, {
    type: 'MEMBER_UPDATE',
    payload: { member: memberObj, event: evt },
  });

  res.json({ success: true, member: memberObj });
});

// Remove / Decommission a member
app.delete('/api/parties/:partyCode/members/:memberId', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    return res.status(404).json({ error: 'Party not found' });
  }
  const party = parties.get(code)!;
  const memberId = req.params.memberId;
  const target = party.members.find((m) => m.id === memberId);

  party.members = party.members.filter((m) => m.id !== memberId);

  if (target) {
    const evt = {
      id: `evt-${Date.now()}`,
      type: 'status_change',
      actor: `${target.name} (${target.callsign || 'Unit'})`,
      title: 'Operator Decommissioned',
      description: `${target.name} removed from active deployment.`,
      timestamp: new Date().toISOString(),
      severity: 'normal',
    };
    party.events.unshift(evt);

    broadcastToParty(code, {
      type: 'MEMBER_REMOVE',
      payload: { memberId, event: evt },
    });
  }

  res.json({ success: true, removed: memberId });
});

// Update member status or position (Tracking)
app.post('/api/parties/:partyCode/members/:memberId', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    parties.set(code, createCleanParty(code));
  }
  const party = parties.get(code)!;
  const { status, lat, lng, battery, note, name, callsign, role, accuracy, heading, speed } = req.body;

  let member = party.members.find((m) => m.id === req.params.memberId);
  if (!member) {
    // If not found, dynamically register this responder
    member = {
      id: req.params.memberId,
      partyCode: code,
      name: name || 'Operator',
      callsign: callsign || `${code}-Unit`,
      role: role || 'Field Responder',
      lat: typeof lat === 'number' ? lat : 28.6139,
      lng: typeof lng === 'number' ? lng : 77.2090,
      status: status || 'safe',
      battery: typeof battery === 'number' ? battery : 95,
      lastSeen: new Date().toISOString(),
      lastSeenFormatted: 'Just now',
    };
    party.members.push(member);
  } else {
    if (status) member.status = status;
    if (typeof lat === 'number') member.lat = lat;
    if (typeof lng === 'number') member.lng = lng;
    if (typeof battery === 'number') member.battery = battery;
    if (note !== undefined) member.note = note;
    if (name) member.name = name;
    if (callsign) member.callsign = callsign;
    if (role) member.role = role;
    if (typeof accuracy === 'number') member.accuracy = accuracy;
    if (heading !== undefined) member.heading = heading;
    if (speed !== undefined) member.speed = speed;
    member.lastSeen = new Date().toISOString();
    member.lastSeenFormatted = 'Just now';
  }

  broadcastToParty(code, {
    type: 'MEMBER_UPDATE',
    payload: { member },
  });

  res.json({ success: true, member });
});

// Send squad chat message
app.post('/api/parties/:partyCode/messages', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    parties.set(code, createCleanParty(code));
  }
  const party = parties.get(code)!;
  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: req.body.senderId,
    senderName: req.body.senderName,
    senderCallsign: req.body.senderCallsign,
    timestamp: new Date().toISOString(),
    text: req.body.text,
    isEmergencyAlert: req.body.isEmergencyAlert || false,
    partyCode: code,
  };

  party.messages.push(msg);

  broadcastToParty(code, {
    type: 'CHAT_MESSAGE',
    payload: { message: msg },
  });

  res.json({ success: true, message: msg });
});

// Set Checkpoint
app.post('/api/parties/:partyCode/checkpoints', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    parties.set(code, createCleanParty(code));
  }
  const party = parties.get(code)!;
  const ckpt = {
    id: req.body.id || `ckpt-${Date.now()}`,
    name: req.body.name || `Checkpoint ${code}`,
    lat: req.body.lat,
    lng: req.body.lng,
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'Command',
    description: req.body.description || `Tactical assembly point for Squad ${code}`,
  };

  party.checkpoint = ckpt;

  const evt = {
    id: `evt-${Date.now()}`,
    type: 'checkpoint_created',
    actor: ckpt.createdBy,
    title: 'Assembly Checkpoint Set',
    description: `${ckpt.name} placed at [${ckpt.lat.toFixed(4)}, ${ckpt.lng.toFixed(4)}].`,
    timestamp: new Date().toISOString(),
    severity: 'normal',
  };
  party.events.unshift(evt);

  broadcastToParty(code, {
    type: 'CHECKPOINT_SET',
    payload: { checkpoint: ckpt, event: evt },
  });

  res.json({ success: true, checkpoint: ckpt });
});

// Remove Checkpoint
app.delete('/api/parties/:partyCode/checkpoints', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  if (!parties.has(code)) {
    return res.status(404).json({ error: 'Party not found' });
  }
  const party = parties.get(code)!;
  party.checkpoint = null;

  broadcastToParty(code, {
    type: 'CHECKPOINT_REMOVE',
    payload: {},
  });

  res.json({ success: true, checkpoint: null });
});

// Clear / Reset Party to Clean State
app.post('/api/parties/:partyCode/reset', (req: Request, res: Response) => {
  const code = req.params.partyCode.trim().toUpperCase();
  parties.set(code, createCleanParty(code));
  const fresh = parties.get(code)!;

  broadcastToParty(code, {
    type: 'INIT_STATE',
    payload: { party: fresh, connectedCount: getPartyClientCount(code) },
  });

  res.json({ success: true, party: fresh });
});

// ==========================================
// WEBSOCKET REAL-TIME SYNC ENGINE
// ==========================================

interface ExtendedWebSocket extends WebSocket {
  partyCode?: string;
  memberId?: string;
  memberName?: string;
  isAlive?: boolean;
}

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToParty(partyCode: string, data: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const ext = client as ExtendedWebSocket;
    if (
      ext !== excludeWs &&
      ext.readyState === WebSocket.OPEN &&
      ext.partyCode?.toUpperCase() === partyCode.toUpperCase()
    ) {
      ext.send(payload);
    }
  });
}

function getPartyClientCount(partyCode: string): number {
  let count = 0;
  wss.clients.forEach((client) => {
    const ext = client as ExtendedWebSocket;
    if (ext.readyState === WebSocket.OPEN && ext.partyCode?.toUpperCase() === partyCode.toUpperCase()) {
      count++;
    }
  });
  return Math.max(1, count);
}

wss.on('connection', (ws: ExtendedWebSocket, req) => {
  ws.isAlive = true;

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const code = url.searchParams.get('partyCode');
    if (code) {
      ws.partyCode = code.toUpperCase().trim();
    }
  } catch (err) {}

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, payload } = data;
      const targetParty = (payload?.partyCode || ws.partyCode || 'ALPHA-7').toUpperCase().trim();

      if (!parties.has(targetParty)) {
        parties.set(targetParty, createCleanParty(targetParty));
      }
      const party = parties.get(targetParty)!;

      switch (type) {
        case 'JOIN_PARTY': {
          ws.partyCode = targetParty;
          ws.memberId = payload.memberId;
          ws.memberName = payload.memberName;

          // If connecting client passes their real operative data, update or add to members list
          if (payload.member) {
            const m = payload.member;
            const idx = party.members.findIndex((existing) => existing.id === m.id);
            if (idx >= 0) {
              party.members[idx] = { ...party.members[idx], ...m };
            } else {
              party.members.push(m);
            }
          }

          // Send current authoritative party state to newly connected client
          ws.send(
            JSON.stringify({
              type: 'INIT_STATE',
              payload: {
                party,
                connectedCount: getPartyClientCount(targetParty),
              },
            })
          );

          // Broadcast presence update
          broadcastToParty(targetParty, {
            type: 'PRESENCE_UPDATE',
            payload: {
              connectedCount: getPartyClientCount(targetParty),
              user: payload.memberName || 'Tactical Operator',
            },
          });
          break;
        }

        case 'MEMBER_REGISTER': {
          if (payload.member) {
            const m = payload.member;
            const idx = party.members.findIndex((existing) => existing.id === m.id);
            if (idx >= 0) {
              party.members[idx] = { ...party.members[idx], ...m };
            } else {
              party.members.push(m);
            }

            broadcastToParty(targetParty, {
              type: 'MEMBER_UPDATE',
              payload: { member: m },
            });
          }
          break;
        }

        case 'MEMBER_REMOVE': {
          if (payload.memberId) {
            party.members = party.members.filter((m) => m.id !== payload.memberId);
            broadcastToParty(targetParty, {
              type: 'MEMBER_REMOVE',
              payload: { memberId: payload.memberId },
            });
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          const newMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderCallsign: payload.senderCallsign,
            timestamp: new Date().toISOString(),
            text: payload.text,
            isEmergencyAlert: payload.isEmergencyAlert || false,
            partyCode: targetParty,
          };
          party.messages.push(newMsg);

          broadcastToParty(targetParty, {
            type: 'CHAT_MESSAGE',
            payload: { message: newMsg },
          });
          break;
        }

        case 'MEMBER_LOCATION_TRACKING': {
          const target = party.members.find((m) => m.id === payload.memberId);
          if (target) {
            target.lat = payload.lat;
            target.lng = payload.lng;
            if (payload.battery !== undefined) target.battery = payload.battery;
            if (payload.accuracy !== undefined) target.accuracy = payload.accuracy;
            if (payload.heading !== undefined) target.heading = payload.heading;
            if (payload.speed !== undefined) target.speed = payload.speed;
            target.lastSeen = new Date().toISOString();
            target.lastSeenFormatted = 'Just now';

            broadcastToParty(targetParty, {
              type: 'MEMBER_UPDATE',
              payload: { member: target },
            });
          }
          break;
        }

        case 'STATUS_CHANGE': {
          const target = party.members.find((m) => m.id === payload.memberId);
          if (target) {
            target.status = payload.status;
            if (payload.note !== undefined) target.note = payload.note;
            target.lastSeen = new Date().toISOString();
            target.lastSeenFormatted = 'Just now';

            const evt = {
              id: `evt-${Date.now()}`,
              type: 'status_change',
              actor: `${target.name} (${target.callsign || 'Unit'})`,
              title: `Status set to ${payload.status.toUpperCase()}`,
              description: payload.note || `Member status updated in live operations.`,
              timestamp: new Date().toISOString(),
              severity: payload.status === 'emergency' ? 'emergency' : payload.status === 'caution' ? 'caution' : 'normal',
            };
            party.events.unshift(evt);

            broadcastToParty(targetParty, {
              type: 'STATUS_CHANGE',
              payload: { member: target, event: evt },
            });
          }
          break;
        }

        case 'EMERGENCY_TRIGGER': {
          const target = party.members.find((m) => m.id === payload.memberId);
          const memberName = target ? target.name : payload.memberName || 'Tactical Operator';
          const callsign = target ? target.callsign : payload.callsign || `${targetParty}-SOS`;
          const lat = target ? target.lat : payload.lat || 28.6139;
          const lng = target ? target.lng : payload.lng || 77.2090;

          if (target) {
            target.status = 'emergency';
            target.battery = Math.min(target.battery, 25);
          }

          const alertObj = {
            id: `alert-${Date.now()}`,
            memberId: payload.memberId,
            memberName,
            callsign,
            timestamp: new Date().toISOString(),
            lat,
            lng,
            acknowledged: false,
            resolved: false,
            details: payload.details || `DISTRESS BEACON: Urgent medical/field emergency flagged for ${memberName}`,
          };
          party.activeAlert = alertObj;

          const evt = {
            id: `evt-${Date.now()}`,
            type: 'medical_alert',
            actor: `${memberName} (${callsign})`,
            title: 'DISTRESS BEACON BROADCAST',
            description: alertObj.details,
            timestamp: new Date().toISOString(),
            severity: 'emergency',
          };
          party.events.unshift(evt);

          broadcastToParty(targetParty, {
            type: 'EMERGENCY_TRIGGER',
            payload: { alert: alertObj, member: target, event: evt },
          });
          break;
        }

        case 'EMERGENCY_ACK': {
          if (party.activeAlert && party.activeAlert.id === payload.alertId) {
            party.activeAlert.acknowledged = true;
            party.activeAlert.acknowledgedBy = payload.acknowledgedBy || 'Command';
            party.activeAlert.acknowledgedAt = new Date().toISOString();

            const evt = {
              id: `evt-${Date.now()}`,
              type: 'alert_acknowledged',
              actor: payload.acknowledgedBy || 'Command',
              title: 'Emergency Signal Acknowledged',
              description: `Distress beacon acknowledged. Rescue coordination active.`,
              timestamp: new Date().toISOString(),
              severity: 'caution',
            };
            party.events.unshift(evt);

            broadcastToParty(targetParty, {
              type: 'EMERGENCY_ACK',
              payload: { alert: party.activeAlert, event: evt },
            });
          }
          break;
        }

        case 'EMERGENCY_RESOLVE': {
          if (party.activeAlert && party.activeAlert.id === payload.alertId) {
            const resolved = {
              ...party.activeAlert,
              resolved: true,
              resolvedAt: new Date().toISOString(),
              resolvedBy: payload.resolvedBy || 'Command',
            };
            party.resolvedAlerts.unshift(resolved);
            const casualty = party.members.find((m) => m.id === resolved.memberId);
            if (casualty) casualty.status = 'safe';
            party.activeAlert = null;

            const evt = {
              id: `evt-${Date.now()}`,
              type: 'alert_resolved',
              actor: payload.resolvedBy || 'Command',
              title: 'Emergency Signal Resolved',
              description: `Distress incident for ${resolved.memberName} closed. Patient secured.`,
              timestamp: new Date().toISOString(),
              severity: 'normal',
            };
            party.events.unshift(evt);

            broadcastToParty(targetParty, {
              type: 'EMERGENCY_RESOLVE',
              payload: { resolved, casualty, event: evt },
            });
          }
          break;
        }

        case 'CHECKPOINT_SET': {
          party.checkpoint = payload.checkpoint;
          const evt = {
            id: `evt-${Date.now()}`,
            type: 'checkpoint_created',
            actor: payload.actor || 'Command',
            title: 'Assembly Checkpoint Placed',
            description: `${payload.checkpoint.name} designated on tactical grid.`,
            timestamp: new Date().toISOString(),
            severity: 'normal',
          };
          party.events.unshift(evt);

          broadcastToParty(targetParty, {
            type: 'CHECKPOINT_SET',
            payload: { checkpoint: payload.checkpoint, event: evt },
          });
          break;
        }

        case 'CHECKPOINT_REMOVE': {
          party.checkpoint = null;
          broadcastToParty(targetParty, {
            type: 'CHECKPOINT_REMOVE',
            payload: {},
          });
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (ws.partyCode) {
      broadcastToParty(ws.partyCode, {
        type: 'PRESENCE_UPDATE',
        payload: {
          connectedCount: getPartyClientCount(ws.partyCode),
        },
      });
    }
  });
});

// Periodic heartbeat
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ext = client as ExtendedWebSocket;
    if (ext.isAlive === false) return ext.terminate();
    ext.isAlive = false;
    ext.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

// ==========================================
// VITE INTEGRATION & STATIC SERVING
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SAHYOG Tactical Backend & WebSocket Server active on http://0.0.0.0:${PORT}`);
  });
}

start();
