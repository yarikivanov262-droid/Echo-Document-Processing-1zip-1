import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectionManager } from "@/lib/connection-manager";

interface ScoreItem {
  label: string;
  description: string;
  points: number;
  earned: boolean;
}

function computeScore(): { items: ScoreItem[]; total: number } {
  const mode = connectionManager.getMode();
  const cfg = connectionManager.getConfig();

  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(localStorage.getItem("echo_settings") ?? "{}") as Record<string, unknown>; } catch {}

  const items: ScoreItem[] = [
    {
      label: "E2EE шифрование",
      description: "Сообщения хранятся зашифрованными",
      points: 20,
      earned: true,
    },
    {
      label: "Анонимная регистрация",
      description: "Нет телефона или email",
      points: 15,
      earned: true,
    },
    {
      label: "Обфускация трафика",
      description: "DPI не может определить ECHO",
      points: 10,
      earned: cfg.obfuscate,
    },
    {
      label: "Нестандартный канал связи",
      description: "CF Worker, прокси или Tor активен",
      points: 10,
      earned: mode !== "direct",
    },
    {
      label: "DNS over HTTPS",
      description: "DNS-запросы зашифрованы",
      points: 8,
      earned: cfg.dohEnabled,
    },
    {
      label: "Резервные домены настроены",
      description: "Есть запасные серверы при блокировке",
      points: 7,
      earned: cfg.altDomains.length > 0,
    },
    {
      label: "Режим инкогнито",
      description: "Онлайн-статус скрыт",
      points: 5,
      earned: settings["incognito"] === true,
    },
    {
      label: "Автоопределение соединения",
      description: "Автоматический выбор лучшего канала",
      points: 5,
      earned: cfg.autoDetect,
    },
  ];

  const total = items.reduce((sum, i) => sum + (i.earned ? i.points : 0), 0);
  return { items, total };
}

function ScoreCircle({ score }: { score: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "#34c759" : score >= 40 ? "#ff9500" : "#ff3b30";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="80" y="75" textAnchor="middle" fill={color} fontSize="32" fontWeight="bold">{score}</text>
        <text x="80" y="95" textAnchor="middle" fill="currentColor" fontSize="11" className="text-muted-foreground">/100</text>
      </svg>
      <div className="text-[15px] font-semibold" style={{ color }}>
        {score >= 70 ? "Высокая защита" : score >= 40 ? "Средняя защита" : "Низкая защита"}
      </div>
    </div>
  );
}

export function PrivacyScore() {
  const [, setLocation] = useLocation();
  const { items, total } = computeScore();

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button onClick={() => setLocation("/settings")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">Анализ приватности</span>
        <div className="w-5" />
      </div>

      <div className="p-4 space-y-5 pb-10">
        <div className="flex justify-center pt-4">
          <ScoreCircle score={total} />
        </div>

        <div className="glass rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-[13px] text-muted-foreground font-medium uppercase tracking-wide">Параметры защиты</div>
          </div>
          {items.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i < items.length - 1 && "border-b border-border/30"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[16px]",
                item.earned ? "bg-[#34c759]/10 text-[#34c759]" : "bg-muted text-muted-foreground"
              )}>
                {item.earned ? "✓" : "○"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium">{item.label}</div>
                <div className="text-[12px] text-muted-foreground truncate">{item.description}</div>
              </div>
              <span className={cn(
                "text-[13px] font-semibold shrink-0",
                item.earned ? "text-[#34c759]" : "text-muted-foreground"
              )}>
                +{item.points}
              </span>
            </div>
          ))}
        </div>

        <div className="glass rounded-[12px] p-4">
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            Оценка рассчитывается на основе ваших текущих настроек. Для максимальной защиты включите все пункты в разделе «Прокси и соединение».
          </div>
        </div>
      </div>
    </div>
  );
}
