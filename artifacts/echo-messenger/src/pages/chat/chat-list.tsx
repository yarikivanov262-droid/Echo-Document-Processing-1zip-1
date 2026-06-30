import { useState } from "react";
import { Link, useLocation } from "wouter";
import { SquarePen, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetChats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const mockChats = [
  { id: 1, title: "Архив чатов", lastMessage: "PR GRAM Giveaways | NFT, Подарок 🎁...", time: "", unreadCount: 15, isPinned: false },
  { id: 2, title: "Избранное", lastMessage: "Стикер", time: "16/05", unreadCount: 0, isPinned: true },
  { id: 3, title: "Любимая ❤️", lastMessage: "Ну или в Макс", time: "12/06", unreadCount: 0, isPinned: true },
  { id: 4, title: "ghost_protocol", lastMessage: "Всем, кто купит на этой неделе 5000 звёзд...", time: "9:36", unreadCount: 21, isPinned: false },
  { id: 5, title: "cipher_ops", lastMessage: "Мини-игра 8-бита вернулась!", time: "9:15", unreadCount: 7, isPinned: false },
  { id: 6, title: "echo_admin", lastMessage: "Добро пожаловать в ECHO", time: "Вчера", unreadCount: 0, isPinned: false },
  { id: 7, title: "neon_shadow", lastMessage: "ok", time: "Пн", unreadCount: 0, isPinned: false },
];

export function ChatList() {
  const [activeTab, setActiveTab] = useState<"all" | "schedule">("all");
  const [, navigate] = useLocation();
  const { data: chats, isLoading } = useGetChats({ query: { refetchInterval: 3000 } as never });

  const displayChats = chats && chats.length > 0 ? chats : mockChats;

  return (
    <div className="flex flex-col h-full bg-background w-full md:w-80 lg:w-96 shrink-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal">Изм.</button>
        <span className="text-[17px] font-semibold">Чаты</span>
        <button
          onClick={() => navigate("/chat/new")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"
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
      <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
        <button
          onClick={() => setActiveTab("all")}
          className={cn("px-4 h-8 rounded-full text-[14px] font-medium transition-colors",
            activeTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground")}
        >
          Все
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={cn("flex items-center gap-1.5 px-4 h-8 rounded-full text-[14px] font-medium transition-colors",
            activeTab === "schedule" ? "bg-muted text-foreground" : "text-muted-foreground")}
        >
          Расписания
          <span className="flex items-center justify-center bg-primary text-white text-[11px] font-bold h-4 min-w-4 px-1 rounded-full">1</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
              <div className="w-[54px] h-[54px] rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/5" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))
        ) : (
          displayChats.map((chat) => {
            const isPinned = (chat as { isPinned?: boolean }).isPinned;
            const time = (chat as { time?: string }).time;
            const lastMsg = (chat as { lastMessage?: string; description?: string }).lastMessage || (chat as { description?: string }).description || "";
            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 active:bg-muted/50 cursor-pointer">
                  <Avatar className="h-[54px] w-[54px] shrink-0">
                    {(chat as { avatarFileId?: string }).avatarFileId && (
                      <AvatarImage src={(chat as { avatarFileId?: string }).avatarFileId} />
                    )}
                    <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(chat.title))}>
                      {chat.title.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 border-b border-border/50 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[16px] truncate">{chat.title}</span>
                      <span className="text-muted-foreground text-[13px] shrink-0">{time || ""}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <span className="text-muted-foreground text-[14px] truncate">{lastMsg}</span>
                      {(chat.unreadCount || 0) > 0 ? (
                        <span className="flex items-center justify-center bg-primary text-white text-[12px] font-bold h-5 min-w-5 px-1.5 rounded-full shrink-0">
                          {(chat.unreadCount || 0) > 9999 ? "9999" : chat.unreadCount}
                        </span>
                      ) : isPinned ? (
                        <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45 shrink-0" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* New group / channel buttons */}
        <div className="px-4 py-4 space-y-1">
          <Link href="/new-group">
            <div className="flex items-center gap-3 py-2 text-primary text-[16px] hover:opacity-70 cursor-pointer">
              <div className="h-[54px] w-[54px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              Создать группу
            </div>
          </Link>
          <Link href="/new-channel">
            <div className="flex items-center gap-3 py-2 text-primary text-[16px] hover:opacity-70 cursor-pointer">
              <div className="h-[54px] w-[54px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.49 5.49l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              Создать канал
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
