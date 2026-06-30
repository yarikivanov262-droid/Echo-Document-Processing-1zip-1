import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { SquarePen, Pin, Check, CheckCheck, Users, Radio } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetChats } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatChatTime(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (msgDay.getTime() === yesterday.getTime()) return "Вчера";
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays < 7) {
    return d.toLocaleDateString("ru-RU", { weekday: "short" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ChatTypeIcon({ type }: { type?: number }) {
  if (type === 2) return <Users className="h-3.5 w-3.5 text-muted-foreground mr-0.5 shrink-0" />;
  if (type === 3) return <Radio className="h-3.5 w-3.5 text-muted-foreground mr-0.5 shrink-0" />;
  return null;
}

export function ChatList() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups">("all");
  const [, navigate] = useLocation();
  const [isInChat] = useRoute("/chat/:id");
  const { userId } = useEchoAuth();

  const { data: chats, isLoading } = useGetChats({ query: { refetchInterval: 3000 } as never });

  const allChats = chats ?? [];

  const filteredChats = allChats.filter(chat => {
    if (activeTab === "unread") return (chat.unreadCount ?? 0) > 0;
    if (activeTab === "groups") return chat.type === 2 || chat.type === 3;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background w-full md:w-80 lg:w-96 shrink-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button
          onClick={() => navigate("/settings")}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80"
        >
          <svg className="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
        <span className="text-[17px] font-semibold">Чаты</span>
        <button
          onClick={() => navigate("/chat/new")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80"
        >
          <SquarePen className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2 shrink-0">
        <button
          onClick={() => navigate("/search")}
          className="w-full flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9 text-muted-foreground text-[15px]"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          Поиск
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none shrink-0">
        {([
          { id: "all", label: "Все" },
          { id: "unread", label: "Непрочитанные" },
          { id: "groups", label: "Группы" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-4 h-8 rounded-full text-[14px] font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
              <div className="w-[54px] h-[54px] rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-2/5" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground px-8 text-center">
            <div className="text-4xl">
              {activeTab === "unread" ? "✅" : activeTab === "groups" ? "👥" : "💬"}
            </div>
            <div className="text-[15px]">
              {activeTab === "unread" ? "Нет непрочитанных" :
               activeTab === "groups" ? "Нет групп" :
               "Нет чатов. Нажмите ✏️ чтобы начать"}
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const lastMsg = (chat as { lastMessage?: string | null }).lastMessage;
            const lastMsgAt = (chat as { lastMessageAt?: string | null }).lastMessageAt;
            const isPinned = (chat as { isPinned?: boolean }).isPinned;
            const unread = chat.unreadCount ?? 0;
            const time = formatChatTime(lastMsgAt);

            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors">
                  {/* Avatar with type badge */}
                  <div className="relative shrink-0">
                    <Avatar className="h-[54px] w-[54px]">
                      {(chat as { avatarFileId?: string | null }).avatarFileId && (
                        <AvatarImage src={(chat as { avatarFileId: string }).avatarFileId} />
                      )}
                      <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(chat.title))}>
                        {chat.title.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online dot for DMs */}
                    {chat.type === 1 && (
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#34c759] border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 border-b border-border/40 py-2">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <ChatTypeIcon type={chat.type} />
                        <span className="font-semibold text-[16px] truncate">{chat.title}</span>
                      </div>
                      <span className="text-muted-foreground text-[13px] shrink-0">{time}</span>
                    </div>

                    {/* Last message row */}
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <span className="text-muted-foreground text-[14px] truncate">
                        {lastMsg || (chat.type === 3 ? "Канал" : "Нет сообщений")}
                      </span>
                      <div className="shrink-0 flex items-center gap-1">
                        {unread > 0 ? (
                          <span className="flex items-center justify-center bg-primary text-white text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full">
                            {unread > 9999 ? "9999+" : unread}
                          </span>
                        ) : isPinned ? (
                          <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* Bottom actions */}
        <div className="px-4 py-4 space-y-1 border-t border-border/30 mt-2">
          <Link href="/new-group">
            <div className="flex items-center gap-3 py-2 text-primary text-[16px] hover:opacity-70 cursor-pointer">
              <div className="h-[42px] w-[42px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              Создать группу
            </div>
          </Link>
          <Link href="/new-channel">
            <div className="flex items-center gap-3 py-2 text-primary text-[16px] hover:opacity-70 cursor-pointer">
              <div className="h-[42px] w-[42px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5" />
              </div>
              Создать канал
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
