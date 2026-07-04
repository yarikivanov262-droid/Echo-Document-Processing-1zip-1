const OBFUSCATION_KEY = 0x5a;

function xorBytes(data: Uint8Array, key: number): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i]! ^ key;
  return out;
}

type WsListener = (event: MessageEvent) => void;

export class ObfuscatedWebSocket extends EventTarget {
  private ws: WebSocket;
  private enabled: boolean;

  constructor(url: string, obfuscate = false) {
    super();
    this.enabled = obfuscate;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => this.dispatchEvent(new Event("open"));
    this.ws.onclose = (e) =>
      this.dispatchEvent(new CloseEvent("close", { code: e.code, reason: e.reason, wasClean: e.wasClean }));
    this.ws.onerror = () => this.dispatchEvent(new Event("error"));

    this.ws.onmessage = (e) => {
      let data: string;
      if (this.enabled && e.data instanceof ArrayBuffer) {
        const decoded = xorBytes(new Uint8Array(e.data), OBFUSCATION_KEY);
        data = new TextDecoder().decode(decoded);
      } else {
        data = typeof e.data === "string" ? e.data : new TextDecoder().decode(new Uint8Array(e.data as ArrayBuffer));
      }
      this.dispatchEvent(new MessageEvent("message", { data }));
    };
  }

  send(data: string) {
    if (this.enabled) {
      const encoded = xorBytes(new TextEncoder().encode(data), OBFUSCATION_KEY);
      this.ws.send(encoded.buffer);
    } else {
      this.ws.send(data);
    }
  }

  close(code?: number, reason?: string) {
    this.ws.close(code, reason);
  }

  get readyState() {
    return this.ws.readyState;
  }
}

export function addWsObfuscationListener(ws: ObfuscatedWebSocket, listener: WsListener) {
  ws.addEventListener("message", listener as EventListener);
  return () => ws.removeEventListener("message", listener as EventListener);
}
