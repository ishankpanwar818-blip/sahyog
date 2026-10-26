/**
 * SAHYOG Real-time WebSocket Client with automatic reconnection and event dispatching.
 */

export type RealtimeEventHandler = (data: { type: string; payload: any }) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private partyCode: string = '';
  private memberId: string = '';
  private memberName: string = '';
  private listeners: Set<RealtimeEventHandler> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed: boolean = false;
  private isConnectedState: boolean = false;

  public connect(partyCode: string, memberId: string, memberName: string) {
    this.isExplicitlyClosed = false;
    this.partyCode = partyCode.toUpperCase().trim();
    this.memberId = memberId;
    this.memberName = memberName;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?partyCode=${this.partyCode}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnectedState = true;
        this.send('JOIN_PARTY', {
          partyCode: this.partyCode,
          memberId: this.memberId,
          memberName: this.memberName,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.listeners.forEach((handler) => handler(parsed));
        } catch (err) {
          console.warn('Realtime message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnectedState = false;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        // Will close and attempt reconnect
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.partyCode) {
        this.connect(this.partyCode, this.memberId, this.memberName);
      }
    }, 2500);
  }

  public subscribe(handler: RealtimeEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          payload: {
            ...payload,
            partyCode: this.partyCode,
          },
        })
      );
      return true;
    }
    return false;
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnectedState = false;
  }

  public isConnected(): boolean {
    return this.isConnectedState && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const realtimeClient = new RealtimeClient();
