import { useState } from "react";
import { useLocation } from "wouter";
import { PhoneOutgoing, PhoneIncoming, PhoneMissed, Phone, Info, Video } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { useGetCalls } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";

function formatCallDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Вчера";
  return format(d, "dd.MM", { locale: ru });
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

type TabType = "all" | "missed";

export function Calls() {
  const [tab, setTab] = useState<TabType>("all");
  const [, navigate] = useLocation();
  const { userId } = useEchoAuth();
  const { data: calls = [], isLoading } = useGetCalls();

  const allCalls = calls;
  const missedCalls = calls.filter((c) => c.status === "missed");
  const displayed = tab === "all" ? allCalls : missedCalls;

  function getCallDirection(call: (typeof calls)[0]) {
    if (call.callerId === userId) return "outgoing";
    if (call.status === "missed") return "missed";
    return "incoming";
  }

  function CallIcon({ call }: { call: (typeof calls)[0] }) {
    const dir = getCallDirection(call);
    const isVideo = call.type === "video";
    const Icon = isVideo ? Video : Phone;
    if (dir === "outgoing") return <Icon className="h-4 w-4 text-primary" />;
    if (dir === "missed") return <PhoneMissed className="h-4 w-4 text-[#ff3b30]" />;
    return <PhoneIncoming className="h-4 w-4 text-[#34c759]" />;
  }

  function callLabel(call: (typeof calls)[0]) {
    const dir = getCallDirection(call);
    const typeLabel = call.type === "video" ? "Видео" : "Голосовой";
    if (dir === "outgoing") return `Исходящий · ${typeLabel}`;
    if (dir === "missed") return `Пропущенный · ${typeLabel}`;
    const dur = formatDuration(call.durationSeconds);
    return dur ? `Входящий · ${typeLabel} · ${dur}` : `Входящий · ${typeLabel}`;
  }

  function getCallName(call: (typeof calls)[0]) {
    const dir = getCallDirection(call);
    if (dir === "outgoing") return `Пользователь ${call.calleeId}`;
    return `Пользователь ${call.callerId}`;
  }

  function handleCallBack(call: (typeof calls)[0], type: "audio" | "video") {
    const dir = getCallDirection(call);
    const calleeId = dir === "outgoing" ? call.calleeId : call.callerId;
    navigate(`/call?calleeId=${calleeId}&type=${type}&initiator=true` as never);
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal opacity-0 pointer-events-none">Изм.</button>
        <div className="flex items-center gap-1 bg-muted rounded-[10px] p-0.5">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "px-5 py-1 rounded-[8px] text-[14px] font-medium transition-colors",
              tab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Все
          </button>
          <button
            onClick={() => setTab("missed")}
            className={cn(
              "px-5 py-1 rounded-[8px] text-[14px] font-medium transition-colors",
              tab === "missed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Пропущ.
          </button>
        </div>
        <div className="w-14" />
      </div>

      <div className="mx-4 mt-1 mb-4 rounded-[12px] overflow-hidden bg-card">
        <button
          onClick={() => navigate("/contacts" as never)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
        >
          <div className="h-[34px] w-[34px] rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Phone className="h-[18px] w-[18px] text-primary" />
          </div>
          <span className="text-[16px] text-primary">Новый звонок</span>
        </button>
      </div>

      <div className="px-4 pb-2 shrink-0">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Недавние</span>
      </div>

      <div className="flex-1 overflow-y-auto mx-4 rounded-[12px] bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <PhoneMissed className="h-10 w-10 opacity-30" />
            <div className="text-[15px]">
              {tab === "missed" ? "Нет пропущенных звонков" : "Нет звонков"}
            </div>
          </div>
        ) : (
          displayed.map((call, i) => {
            const name = getCallName(call);
            const dir = getCallDirection(call);
            return (
              <div
                key={call.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer transition-colors",
                  i < displayed.length - 1 && "border-b border-border/40"
                )}
              >
                <UserAvatar name={name} size="md" />

                <div className="flex-1 min-w-0 py-1">
                  <div className={cn(
                    "text-[16px] font-semibold truncate",
                    dir === "missed" ? "text-[#ff3b30]" : "text-foreground"
                  )}>
                    {name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CallIcon call={call} />
                    <span className="text-[13px] text-muted-foreground">{callLabel(call)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] text-muted-foreground">{formatCallDate(call.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCallBack(call, "audio"); }}
                      className="h-8 w-8 flex items-center justify-center text-primary hover:bg-muted rounded-full"
                      title="Голосовой звонок"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCallBack(call, "video"); }}
                      className="h-8 w-8 flex items-center justify-center text-primary hover:bg-muted rounded-full"
                      title="Видеозвонок"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="h-4 shrink-0" />
    </div>
  );
}
