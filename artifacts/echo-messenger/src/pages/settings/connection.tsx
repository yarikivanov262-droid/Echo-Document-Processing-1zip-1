import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, ChevronRight, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { connectionManager, type ConnectionConfig, type ConnectionMode } from "@/lib/connection-manager";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-[#34c759]" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform duration-200",
          on ? "translate-x-[24px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

const MODE_LABELS: Record<ConnectionMode, string> = {
  direct: "Прямое соединение",
  "alt-domain": "Резервный сервер",
  "cf-worker": "Cloudflare прокси",
  "custom-proxy": "HTTP прокси",
  tor: "Tor",
};

const MODE_COLORS: Record<ConnectionMode, string> = {
  direct: "text-[#34c759]",
  "alt-domain": "text-[#007AFF]",
  "cf-worker": "text-[#007AFF]",
  "custom-proxy": "text-[#ff9500]",
  tor: "text-[#af52de]",
};

export function ConnectionSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cfg, setCfg] = useState<ConnectionConfig>(connectionManager.getConfig());
  const [mode, setMode] = useState<ConnectionMode>(connectionManager.getMode());
  const [checking, setChecking] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    const unsub = connectionManager.onModeChange(setMode);
    return unsub;
  }, []);

  const save = (patch: Partial<ConnectionConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    connectionManager.saveConfig(patch);
  };

  const handleCheck = async () => {
    setChecking(true);
    const detected = await connectionManager.autoDetectMode();
    setMode(detected);
    setChecking(false);
    toast({ title: `Режим: ${MODE_LABELS[detected]}` });
  };

  const addDomain = () => {
    const d = newDomain.trim();
    if (!d) return;
    save({ altDomains: [...cfg.altDomains, d] });
    setNewDomain("");
  };

  const removeDomain = (i: number) => {
    save({ altDomains: cfg.altDomains.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button onClick={() => setLocation("/settings")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">Прокси и соединение</span>
        <div className="w-5" />
      </div>

      <div className="p-4 space-y-5 pb-10">
        {/* Status */}
        <div className="glass rounded-[12px] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Wifi className={cn("h-5 w-5", MODE_COLORS[mode])} />
            <div className="flex-1">
              <div className="text-[15px] font-medium">{MODE_LABELS[mode]}</div>
              <div className="text-[12px] text-muted-foreground">Текущий режим соединения</div>
            </div>
          </div>
          <button
            onClick={() => void handleCheck()}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-[10px] bg-primary/10 text-primary text-[14px]"
          >
            <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
            {checking ? "Проверка…" : "Проверить соединение"}
          </button>
        </div>

        {/* Auto detect */}
        <div className="glass rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[15px]">Автообнаружение</div>
              <div className="text-[12px] text-muted-foreground">Автоматически выбирать лучший канал</div>
            </div>
            <Toggle on={cfg.autoDetect} onChange={(v) => save({ autoDetect: v })} />
          </div>
        </div>

        {/* Alt domains */}
        <div className="glass rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-[13px] text-muted-foreground font-medium uppercase tracking-wide">Резервные домены</div>
          </div>
          {cfg.altDomains.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-[14px] font-mono">{d}</span>
              <button
                onClick={() => removeDomain(i)}
                className="text-destructive text-[13px] hover:opacity-70"
              >
                Удалить
              </button>
            </div>
          ))}
          <div className="flex gap-2 px-4 py-3">
            <input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="https://echo2.example.com"
              className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") addDomain(); }}
            />
            <button onClick={addDomain} className="text-primary text-[14px]">+ Добавить</button>
          </div>
        </div>

        {/* Cloudflare Worker */}
        <div className="glass rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-[13px] text-muted-foreground font-medium uppercase tracking-wide">Cloudflare Worker</div>
          </div>
          <div className="px-4 py-3">
            <input
              value={cfg.cfWorkerUrl ?? ""}
              onChange={(e) => save({ cfWorkerUrl: e.target.value || undefined })}
              placeholder="https://myproxy.workers.dev"
              className="w-full bg-transparent outline-none text-[14px] font-mono text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* DNS over HTTPS */}
        <div className="glass rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div>
              <div className="text-[15px]">DNS over HTTPS</div>
              <div className="text-[12px] text-muted-foreground">Обход блокировки DNS</div>
            </div>
            <Toggle on={cfg.dohEnabled} onChange={(v) => save({ dohEnabled: v })} />
          </div>
          {cfg.dohEnabled && (
            <div className="px-4 py-3 space-y-2">
              {(["cloudflare", "google", "adguard", "system"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => save({ dohProvider: p })}
                  className={cn(
                    "w-full flex items-center gap-2 py-2 px-3 rounded-[8px] text-[14px]",
                    cfg.dohProvider === p ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full border-2", cfg.dohProvider === p ? "border-primary bg-primary" : "border-muted-foreground")} />
                  {{ cloudflare: "Cloudflare (1.1.1.1)", google: "Google (8.8.8.8)", adguard: "AdGuard", system: "Системный DNS" }[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Obfuscation */}
        <div className="glass rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[15px]">Обфускация трафика</div>
              <div className="text-[12px] text-muted-foreground">Маскирует ECHO-трафик. Требует поддержки сервера.</div>
            </div>
            <Toggle on={cfg.obfuscate} onChange={(v) => save({ obfuscate: v })} />
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            connectionManager.reset();
            setCfg(connectionManager.getConfig());
            toast({ title: "Настройки соединения сброшены" });
          }}
          className="w-full py-3 rounded-[12px] bg-destructive/10 text-destructive text-[15px] font-medium"
        >
          Сбросить настройки соединения
        </button>
      </div>
    </div>
  );
}
