import { useLocation } from "wouter";
import { Lock, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetChats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function SecretChatList() {
  const [, navigate] = useLocation();
  const { data: chats, isLoading } = useGetChats({ query: { refetchInterval: 5000 } as never });

  const displayChats = (chats ?? []).filter((c) => c.type === 4);

  return (
    <div className="flex flex-col h-full bg-background w-full md:w-80 lg:w-96 shrink-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-[17px] font-semibold text-primary">Секретные</span>
        </div>
        <button
          onClick={() => navigate("/chat/new")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"
        >
          <Plus className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-muted-foreground text-[15px]">Поиск</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
              <div className="w-[54px] h-[54px] rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-2/5" />
                <div className="h-3 bg-muted rounded w-3/5" />
              </div>
            </div>
          ))
        ) : displayChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground px-8 text-center">
            <Lock className="h-10 w-10 text-primary/40" />
            <div className="text-[15px]">Нет секретных чатов</div>
          </div>
        ) : (
          displayChats.map((chat) => {
          const time = (chat as { time?: string }).time;
          const lastMsg = (chat as { lastMessage?: string; description?: string }).lastMessage || (chat as { description?: string }).description || "";
          return (
            <button
              key={chat.id}
              onClick={() => navigate(`/secret-chat/${chat.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-primary/5 active:bg-primary/10"
            >
              <div className="relative shrink-0">
                <Avatar className="h-[54px] w-[54px]">
                  <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(chat.title))}>
                    {chat.title.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Lock className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 border-b border-primary/10 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[16px] truncate text-primary">{chat.title}</span>
                  <span className="text-muted-foreground text-[13px] shrink-0">{time || ""}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5 gap-2">
                  <span className="text-muted-foreground text-[14px] truncate">{lastMsg}</span>
                  {(chat.unreadCount || 0) > 0 && (
                    <span className="flex items-center justify-center bg-primary text-white text-[12px] font-bold h-5 min-w-5 px-1.5 rounded-full shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
          })
        )}
      </div>

      {/* Create secret chat CTA */}
      <div className="p-4 shrink-0">
        <button
          onClick={() => navigate("/chat/new")}
          className="w-full py-3 rounded-2xl border border-primary/30 text-primary text-[15px] font-medium hover:bg-primary/5"
        >
          + Новый секретный чат
        </button>
      </div>
    </div>
  );
}
