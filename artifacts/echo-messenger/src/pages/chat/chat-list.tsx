import { useState } from "react";
import { Link } from "wouter";
import { SquarePen, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetChats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = [
    "bg-[#e17076]", "bg-[#faa774]", "bg-[#a695e7]",
    "bg-[#7bc862]", "bg-[#6ec9cb]", "bg-[#65aadd]", "bg-[#ee7aae]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ChatList() {
  const [activeTab, setActiveTab] = useState<"all" | "schedule">("all");
  const { data: chats, isLoading } = useGetChats();

  const mockChats = [
    { id: 1, title: "Архив чатов", lastMessage: "PR GRAM Giveaways | NFT, Подарок 🎁...", time: "", unreadCount: 15, isPinned: false, isArchive: true },
    { id: 2, title: "Избранное", lastMessage: "Стикер", time: "16/05", unreadCount: 0, isPinned: true, isArchive: false },
    { id: 3, title: "Любимая ❤️", lastMessage: "Ну или в Макс", time: "12/06", unreadCount: 0, isPinned: true, isArchive: false },
    { id: 4, title: "ghost_protocol", lastMessage: "Всем, кто купит на этой неделе 5000 звёзд...", time: "9:36 AM", unreadCount: 21, isPinned: false, isArchive: false },
    { id: 5, title: "cipher_ops", lastMessage: "🟣 🔊 Мини-игра 8-бита вернулась! На время...", time: "9:15 AM", unreadCount: 7, isPinned: false, isArchive: false },
    { id: 6, title: "Gorilla Chat 🦍 🔕", lastMessage: "да", time: "3:41 AM", unreadCount: 0, isPinned: false, isArchive: false },
    { id: 7, title: "neon_shadow", lastMessage: "ok", time: "Вчера", unreadCount: 0, isPinned: false, isArchive: false },
    { id: 8, title: "echo_admin", lastMessage: "Добро пожаловать!", time: "Пн", unreadCount: 0, isPinned: false, isArchive: false },
  ];

  const displayChats = chats && chats.length > 0 ? chats : mockChats;

  return (
    <div className="flex flex-col h-full bg-background w-full md:w-80 lg:w-96 shrink-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal">Изм.</button>
        <span className="text-[17px] font-semibold">Чаты</span>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
          <SquarePen className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-muted-foreground text-[15px]">Поиск</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-4 h-8 rounded-full text-[14px] font-medium transition-colors",
            activeTab === "all"
              ? "bg-muted text-foreground"
              : "text-muted-foreground"
          )}
        >
          Все
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={cn(
            "flex items-center gap-1.5 px-4 h-8 rounded-full text-[14px] font-medium transition-colors",
            activeTab === "schedule"
              ? "bg-muted text-foreground"
              : "text-muted-foreground"
          )}
        >
          Расписания
          <span className="flex items-center justify-center bg-primary text-white text-[11px] font-bold h-4 min-w-4 px-1 rounded-full">1</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
                <div className="w-[54px] h-[54px] rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/5" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          displayChats.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.id}`}>
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer">
                <div className="relative shrink-0">
                  <Avatar className="h-[54px] w-[54px]">
                    {(chat as { avatarFileId?: string }).avatarFileId && (
                      <AvatarImage src={(chat as { avatarFileId?: string }).avatarFileId} />
                    )}
                    <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(chat.title))}>
                      {chat.title.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 border-b border-border/50 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[16px] leading-tight truncate text-foreground">
                      {chat.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-muted-foreground text-[13px]">
                        {(chat as { time?: string }).time || ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 gap-2">
                    <span className="text-muted-foreground text-[14px] truncate leading-snug">
                      {(chat as { lastMessage?: string }).lastMessage || chat.description || ""}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {(chat.unreadCount || 0) > 0 ? (
                        <span className="flex items-center justify-center bg-primary text-white text-[12px] font-bold h-5 min-w-5 px-1.5 rounded-full">
                          {(chat.unreadCount || 0) > 9999 ? "9999" : chat.unreadCount}
                        </span>
                      ) : (chat as { isPinned?: boolean }).isPinned ? (
                        <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
