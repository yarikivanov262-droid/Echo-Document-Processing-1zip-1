import { useState } from "react";
import { useLocation } from "wouter";
import { PhoneOutgoing, PhoneIncoming, PhoneMissed, Phone, Info } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

type CallType = "outgoing" | "incoming" | "missed";

interface Call {
  id: number;
  name: string;
  type: CallType;
  date: string;
  duration?: string;
}

const allCalls: Call[] = [
  { id: 1, name: "Мамулечка ❤️", type: "outgoing", date: "17/04" },
  { id: 2, name: "Воздухан брат", type: "missed", date: "21/03" },
  { id: 3, name: "Любимая ❤️", type: "missed", date: "03/03" },
  { id: 4, name: "Артем бро", type: "outgoing", date: "14/02" },
  { id: 5, name: "Богдан", type: "outgoing", date: "12/02" },
  { id: 6, name: "Надя", type: "missed", date: "06/02" },
  { id: 7, name: "Надя", type: "incoming", date: "06/02", duration: "20 сек." },
  { id: 8, name: "Рустам", type: "missed", date: "05/02" },
  { id: 9, name: "Артем бро", type: "outgoing", date: "24/01" },
];

const missedCalls = allCalls.filter(c => c.type === "missed");

function CallIcon({ type }: { type: CallType }) {
  if (type === "outgoing") return <PhoneOutgoing className="h-4 w-4 text-primary" />;
  if (type === "missed") return <PhoneMissed className="h-4 w-4 text-[#ff3b30]" />;
  return <PhoneIncoming className="h-4 w-4 text-[#34c759]" />;
}

function callLabel(call: Call) {
  if (call.type === "outgoing") return "Исходящий";
  if (call.type === "missed") return "Пропущенный";
  return call.duration ? `Входящий · ${call.duration}` : "Входящий";
}

export function Calls() {
  const [tab, setTab] = useState<"all" | "missed">("all");
  const [, navigate] = useLocation();
  const displayed = tab === "all" ? allCalls : missedCalls;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal">Изм.</button>
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

      {/* New Call */}
      <div className="mx-4 mt-1 mb-4 rounded-[12px] overflow-hidden bg-card">
        <button
          onClick={() => navigate("/chat/new")}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
        >
          <div className="h-[34px] w-[34px] rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Phone className="h-[18px] w-[18px] text-primary" />
          </div>
          <span className="text-[16px] text-primary">Новый звонок</span>
        </button>
      </div>

      {/* Section header */}
      <div className="px-4 pb-2 shrink-0">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Недавние</span>
      </div>

      {/* Calls list */}
      <div className="flex-1 overflow-y-auto mx-4 rounded-[12px] bg-card overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <PhoneMissed className="h-10 w-10 opacity-30" />
            <div className="text-[15px]">Нет пропущенных звонков</div>
          </div>
        ) : (
          displayed.map((call, i) => (
            <div
              key={call.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer transition-colors",
                i < displayed.length - 1 && "border-b border-border/40"
              )}
            >
              <Avatar className="h-[54px] w-[54px] shrink-0">
                <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(call.name))}>
                  {call.name.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 py-1">
                <div className={cn(
                  "text-[16px] font-semibold truncate",
                  call.type === "missed" ? "text-[#ff3b30]" : "text-foreground"
                )}>
                  {call.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CallIcon type={call.type} />
                  <span className="text-[13px] text-muted-foreground">{callLabel(call)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[14px] text-muted-foreground">{call.date}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${call.id}`); }}
                  className="h-8 w-8 flex items-center justify-center text-primary hover:bg-muted rounded-full"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-4 shrink-0" />
    </div>
  );
}
