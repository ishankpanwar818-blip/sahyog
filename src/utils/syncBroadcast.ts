/**
 * Inter-tab & multi-device broadcast channel for SAHYOG Party Code sync.
 * Allows multiple tabs or windows running the app with the same party code to sync in real time.
 */

export interface BroadcastPacket {
  partyCode: string;
  type: string;
  payload: any;
  senderTabId: string;
  timestamp: string;
}

export class PartySyncHub {
  private channel: BroadcastChannel | null = null;
  private currentPartyCode: string = '';
  private tabId: string;
  private listeners: ((packet: BroadcastPacket) => void)[] = [];

  constructor() {
    this.tabId = 'tab_' + Math.random().toString(36).substring(2, 9);
  }

  public connect(partyCode: string, onMessage?: (packet: BroadcastPacket) => void) {
    if (this.currentPartyCode === partyCode && this.channel) {
      if (onMessage) this.listeners.push(onMessage);
      return;
    }

    this.disconnect();
    this.currentPartyCode = partyCode;

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(`sahyog_party_${partyCode.toUpperCase()}`);
        this.channel.onmessage = (event) => {
          const packet = event.data as BroadcastPacket;
          if (packet && packet.senderTabId !== this.tabId) {
            this.listeners.forEach((fn) => fn(packet));
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel unavailable:', e);
    }

    if (onMessage) {
      this.listeners.push(onMessage);
    }
  }

  public subscribe(onMessage: (packet: BroadcastPacket) => void): () => void {
    this.listeners.push(onMessage);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== onMessage);
    };
  }

  public broadcast(type: string, payload: any) {
    if (!this.channel || !this.currentPartyCode) return;

    const packet: BroadcastPacket = {
      partyCode: this.currentPartyCode,
      type,
      payload,
      senderTabId: this.tabId,
      timestamp: new Date().toISOString(),
    };

    try {
      this.channel.postMessage(packet);
    } catch (e) {
      console.warn('Failed to broadcast packet:', e);
    }
  }

  public disconnect() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }
    this.listeners = [];
  }

  public getTabId(): string {
    return this.tabId;
  }
}

export const partyHub = new PartySyncHub();
