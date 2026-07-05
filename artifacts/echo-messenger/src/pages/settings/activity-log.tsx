import { ArrowLeft, Shield, LogIn, LogOut, Key, Lock, MessageCircle, User, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useGetActivityLog } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type LogType = "login" | "logout" | "key_change" | "message_sent" | "session_revoked" | "profile_change" | "backup" | "other";

type LogEntry = {
  id: number;
  type: LogType;
  description: string;
  device?: string | null;
  timestamp: Date;
  risk: "none" | "low" | "medium" | "high";
};

const ACTION_LABELS: Record<string, { description: string; type: LogType; risk: LogEntry["risk"] }> = {
  login: { description: "Вход в систему", type: "login", risk: "none" },
  register: { description: "Регистрация аккаунта", type: "login", risk: "none" },
  logout: { description: "Выход из системы", type: "logout", risk: "none" },
  session_revoked: { description: "Сессия завершена", type: "session_revoked", risk: "none" },
  key_change: { description: "Обновлены одноразовые пре-ключи", type: "key_change", risk: "low" },
  profile_update: { description: "Изменён профиль", type: "profile_change", risk: "low" },
  backup_created: { description: "Создан зашифрованный бэкап", type: "backup", risk: "none" },
};

function mapEntry(row: { id: number; action: string; ipAddress?: string | null; userAgent?: string | null; createdAt: string }): LogEntry {
  const known = ACTION_LABELS[row.action];
  return {
    id: row.id,
    type: known?.type ?? "other",
    description: known?.description ?? row.action,
    device: row.userAgent ?? row.ipAddress ?? undefined,
    timestamp: new Date(row.createdAt),
    risk: known?.risk ?? "none",
  };
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
  other: <Shield className="h-4 w-4" />,
};

const RISK_COLOR: Record<LogEntry["risk"], string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-yellow-500/10 text-yellow-500",
  medium: "bg-orange-500/10 text-orange-500",
  high: "bg-red-500/10 text-red-500",
};

export function ActivityLog() {
  const [, navigate] = useLocation();
  const { data: rows, isLoading } = useGetActivityLog();
  const [filter, setFilter] = useState<"all" | "risk">("all");

  const entries: LogEntry[] = (rows ?? []).map(mapEntry);

  const displayed = filter === "risk"
    ? entries.filter(e => e.risk !== "none")
    : entries;

  const highRisk = entries.filter(e => e.risk === "high").length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass shrink-0">
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

          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-muted rounded w-2/5" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 opacity-40" />
              <div className="text-[14px]">
                {filter === "risk" ? "Нет подозрительных событий" : "Журнал пуст"}
              </div>
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
