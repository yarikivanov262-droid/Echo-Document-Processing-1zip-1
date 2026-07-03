import { useState } from "react";
import { ArrowLeft, Shield, LogIn, LogOut, Key, Trash2, Lock, MessageCircle, User, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type LogEntry = {
  id: number;
  type: "login" | "logout" | "key_change" | "message_sent" | "session_revoked" | "profile_change" | "backup";
  description: string;
  device?: string;
  timestamp: Date;
  risk: "none" | "low" | "medium" | "high";
};

function makeEntries(): LogEntry[] {
  const now = new Date();
  return [
    { id: 1, type: "login", description: "Вход в систему", device: "Chrome · Linux", timestamp: new Date(now.getTime() - 2 * 60000), risk: "none" },
    { id: 2, type: "message_sent", description: "Отправлено 12 сообщений", device: undefined, timestamp: new Date(now.getTime() - 15 * 60000), risk: "none" },
    { id: 3, type: "key_change", description: "Обновлены одноразовые пре-ключи", device: undefined, timestamp: new Date(now.getTime() - 60 * 60000), risk: "low" },
    { id: 4, type: "login", description: "Вход в систему", device: "Firefox · Android", timestamp: new Date(now.getTime() - 3 * 3600000), risk: "none" },
    { id: 5, type: "session_revoked", description: "Сессия завершена", device: "Safari · iPhone", timestamp: new Date(now.getTime() - 5 * 3600000), risk: "none" },
    { id: 6, type: "backup", description: "Создан зашифрованный бэкап", device: undefined, timestamp: new Date(now.getTime() - 24 * 3600000), risk: "none" },
    { id: 7, type: "profile_change", description: "Изменены настройки приватности", device: undefined, timestamp: new Date(now.getTime() - 2 * 24 * 3600000), risk: "low" },
    { id: 8, type: "login", description: "Попытка входа с неизвестного устройства", device: "Unknown · Windows", timestamp: new Date(now.getTime() - 3 * 24 * 3600000), risk: "high" },
    { id: 9, type: "message_sent", description: "Отправлено 47 сообщений", device: undefined, timestamp: new Date(now.getTime() - 4 * 24 * 3600000), risk: "none" },
    { id: 10, type: "logout", description: "Выход из системы", device: "Chrome · Linux", timestamp: new Date(now.getTime() - 5 * 24 * 3600000), risk: "none" },
  ];
}

function formatTime(d: Date): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
  return `${Math.floor(diff / 86400000)} дн назад`;
}

const TYPE_ICON: Record<LogEntry["type"], React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  key_change: <Key className="h-4 w-4" />,
  message_sent: <MessageCircle className="h-4 w-4" />,
  session_revoked: <Lock className="h-4 w-4" />,
  profile_change: <User className="h-4 w-4" />,
  backup: <Shield className="h-4 w-4" />,
};

const RISK_COLOR: Record<LogEntry["risk"], string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-yellow-500/10 text-yellow-500",
  medium: "bg-orange-500/10 text-orange-500",
  high: "bg-red-500/10 text-red-500",
};

export function ActivityLog() {
  const [, navigate] = useLocation();
  const [entries] = useState<LogEntry[]>(makeEntries);
  const [filter, setFilter] = useState<"all" | "risk">("all");

  const displayed = filter === "risk"
    ? entries.filter(e => e.risk !== "none")
    : entries;

  const highRisk = entries.filter(e => e.risk === "high").length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={() => navigate("/settings/security")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold flex-1">Журнал активности</h1>
        <button
          onClick={() => setFilter(f => f === "all" ? "risk" : "all")}
          className={cn("h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted", filter === "risk" ? "text-primary" : "text-muted-foreground")}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {highRisk > 0 && (
          <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] font-semibold text-red-500">Внимание</div>
              <div className="text-[13px] text-muted-foreground">
                {highRisk} подозрительных событий в журнале. Проверьте активные сессии.
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-2">
          <div className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {filter === "all" ? `Все события (${displayed.length})` : `Подозрительные (${displayed.length})`}
          </div>

          {displayed.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 opacity-40" />
              <div className="text-[14px]">Нет подозрительных событий</div>
            </div>
          ) : (
            <div className="space-y-1">
              {displayed.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", RISK_COLOR[entry.risk])}>
                    {TYPE_ICON[entry.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">{entry.description}</span>
                      {entry.risk !== "none" && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", RISK_COLOR[entry.risk])}>
                          {entry.risk === "high" ? "⚠️ Риск" : "Внимание"}
                        </span>
                      )}
                    </div>
                    {entry.device && (
                      <div className="text-[12px] text-muted-foreground">{entry.device}</div>
                    )}
                    <div className="text-[12px] text-muted-foreground/70">{formatTime(entry.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 text-center">
          <p className="text-[12px] text-muted-foreground">
            Журнал хранится только локально и не передаётся на сервер
          </p>
        </div>
      </div>
    </div>
  );
}
