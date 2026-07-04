export type ConnectionMode = "direct" | "alt-domain" | "cf-worker" | "custom-proxy" | "tor";

export type ConnectionConfig = {
  mode: ConnectionMode;
  proxyUrl?: string;
  cfWorkerUrl?: string;
  altDomains: string[];
  timeout: number;
  autoDetect: boolean;
  dohEnabled: boolean;
  dohProvider: "cloudflare" | "google" | "adguard" | "system";
  obfuscate: boolean;
};

const DEFAULT_CONFIG: ConnectionConfig = {
  mode: "direct",
  altDomains: [],
  timeout: 5000,
  autoDetect: false,
  dohEnabled: false,
  dohProvider: "cloudflare",
  obfuscate: false,
};

class ConnectionManager {
  private config: ConnectionConfig;
  private activeMode: ConnectionMode = "direct";
  private activeBaseUrl: string = typeof window !== "undefined" ? window.location.origin : "";
  private listeners: Array<(mode: ConnectionMode) => void> = [];

  constructor() {
    try {
      const saved = localStorage.getItem("echo_connection_config");
      this.config = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  async autoDetectMode(): Promise<ConnectionMode> {
    if (await this.testConnection(window.location.origin)) {
      this.setMode("direct", window.location.origin);
      return "direct";
    }
    for (const domain of this.config.altDomains) {
      if (await this.testConnection(domain)) {
        this.setMode("alt-domain", domain);
        return "alt-domain";
      }
    }
    if (this.config.cfWorkerUrl && await this.testConnection(this.config.cfWorkerUrl)) {
      this.setMode("cf-worker", this.config.cfWorkerUrl);
      return "cf-worker";
    }
    if (this.config.proxyUrl) {
      this.setMode("custom-proxy", window.location.origin);
      return "custom-proxy";
    }
    return "direct";
  }

  private async testConnection(baseUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.config.timeout);
      const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal, cache: "no-store" });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  private setMode(mode: ConnectionMode, baseUrl: string) {
    this.activeMode = mode;
    this.activeBaseUrl = baseUrl;
    this.listeners.forEach(cb => cb(mode));
  }

  onModeChange(cb: (mode: ConnectionMode) => void) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  getMode(): ConnectionMode { return this.activeMode; }
  getBaseUrl(): string { return this.activeBaseUrl; }
  getConfig(): ConnectionConfig { return { ...this.config }; }

  saveConfig(patch: Partial<ConnectionConfig>) {
    this.config = { ...this.config, ...patch };
    try { localStorage.setItem("echo_connection_config", JSON.stringify(this.config)); } catch {}
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    try { localStorage.removeItem("echo_connection_config"); } catch {}
  }
}

export const connectionManager = new ConnectionManager();
