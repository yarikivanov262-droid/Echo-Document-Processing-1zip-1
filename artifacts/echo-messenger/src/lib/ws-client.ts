type WsListener = (event: WsServerEvent) => void;

export type WsServerEvent =
  | { type: "connected"; userId: number }
  | { type: "new_message"; chatId: number; message: Record<string, unknown> }
  | { type: "delivery_ack"; messageId: number; chatId: number }
  | { type: "read_ack"; messageId: number; chatId: number; userId: number }
  | { type: "typing"; chatId: number; userId: number; username: string; isTyping: boolean }
  | { type: "delete_message"; messageId: number; chatId: number }
  | { type: "edit_message"; messageId: number; chatId: number; encryptedContent: string; editedAt: string }
  | { type: "reaction"; messageId: number; chatId: number; emoji: string; userId: number; delta: number }
  | { type: "status"; userId: number; online: boolean }
  | { type: "incoming_call"; callId: number; callUuid: string; callerId: number; callerUsername: string; callType: "audio" | "video" }
  | { type: "call_signal"; fromUserId: number; signal: Record<string, unknown> }
  | { type: "call_ended"; callId: number; status: "ended" | "declined" | "missed" };

class EchoWsClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private listeners = new Set<WsListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1500;
  private shouldReconnect = false;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectDelay = 1500;
    this.openSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  on(listener: WsListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private openSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${proto}://${host}/ws?token=${encodeURIComponent(this.token ?? "")}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1500;
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WsServerEvent;
        this.listeners.forEach((fn) => fn(data));
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.openSocket();
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      }
    }, this.reconnectDelay);
  }
}

export const echoWs = new EchoWsClient();
