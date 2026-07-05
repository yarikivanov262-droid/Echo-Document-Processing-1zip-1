import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquarePen, Pin, Users, Radio, BellOff, Archive, Trash2, Bell,
  Mic, Camera, Video as VideoIcon, Paperclip, Sticker as StickerIcon,
  Check, CheckCheck, ChevronLeft,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  useGetChats,
  useGetFolders,
  useListUsers,
  useUpdateChatMemberSettings,
  useDeleteChatHistory,
} from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

function mediaPreview(mediaType?: string | null): string | null {
  switch (mediaType) {
    case "photo": return "📷 Фото";
    case "video": return "📹 Видео";
    case "voice": return "🎤 Голосовое сообщение";
    case "video_note": return "🎥 Видео-кружок";
    case "document": return "📎 Документ";
    case "sticker": return "Стикер";
    case "gif": return "GIF";
    case "location": return "📍 Геолокация";
    case "poll": return "📊 Опрос";
    case "contact": return "👤 Контакт";
    default: return null;
  }
}

function MediaIcon({ mediaType }: { mediaType?: string | null }) {
  const cls = "h-3.5 w-3.5 shrink-0 text-muted-foreground";
  switch (mediaType) {
    case "voice": return <Mic className={cls} />;
    case "photo": return <Camera className={cls} />;
    case "video": case "video_note": return <VideoIcon className={cls} />;
    case "document": return <Paperclip className={cls} />;
    case "sticker": return <StickerIcon className={cls} />;
    default: return null;
  }
}

type SwipeAction = "archive" | "unarchive" | "delete" | "mute" | "unmute";

interface SwipeRowProps {
  onAction: (action: SwipeAction) => void;
  isMuted: boolean;
  isArchived: boolean;
  onLongPress: () => void;
  children: React.ReactNode;
}

function SwipeRow({ onAction, isMuted, isArchived, onLongPress, children }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ACTION_WIDTH = 72;
  const maxReveal = ACTION_WIDTH * 2;

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
    longPressTimer.current = setTimeout(() => {
      if (Math.abs(dx) < 4) onLongPress();
    }, 550);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (delta < 0) setDx(Math.max(delta, -maxReveal));
    else setDx(0);
  };

  const endDrag = () => {
    dragging.current = false;
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    setDx((prev) => (prev < -ACTION_WIDTH ? -maxReveal : 0));
  };

  return (
    <div className="relative overflow-hidden select-none">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => { onAction(isMuted ? "unmute" : "mute"); setDx(0); }}
          className="w-[72px] flex flex-col items-center justify-center gap-1 bg-[#65aadd] text-white text-[11px]"
        >
          {isMuted ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          {isMuted ? "Вкл. звук" : "Мут"}
        </button>
        <button
          onClick={() => { onAction(isArchived ? "unarchive" : "archive"); setDx(0); }}
          className="w-[72px] flex flex-col items-center justify-center gap-1 bg-muted-foreground/70 text-white text-[11px]"
        >
          <Archive className="h-5 w-5" />
          {isArchived ? "Из архива" : "Архив"}
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        className="relative bg-background transition-transform duration-150 ease-out"
      >
        {children}
      </div>
    </div>
  );
}

interface ContextMenuState {
  chatId: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  x: number;
  y: number;
}

export function ChatList() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [, navigate] = useLocation();
  const [isArchivedRoute] = useRoute("/chats/archived");
  const { userId } = useEchoAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chats, isLoading } = useGetChats({ query: { refetchInterval: 3000 } as never });
  const { data: folders } = useGetFolders({ query: { refetchInterval: 15000 } as never });
  const { data: globalUsers } = useListUsers(
    { search: query, limit: 10 },
    { query: { enabled: searchOpen && query.trim().length > 1 } as never }
  );

  const settingsMutation = useUpdateChatMemberSettings({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats"] }),
      onError: () => toast({ title: "Не удалось выполнить действие", variant: "destructive" }),
    },
  });

  const deleteHistoryMutation = useDeleteChatHistory({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages", { chatId: variables.id }] });
        toast({ title: "История чата удалена" });
      },
      onError: () => toast({ title: "Не удалось удалить историю", variant: "destructive" }),
    },
  });

  const allChats = chats ?? [];
  const archivedChats = allChats.filter((c) => (c as { isArchived?: boolean }).isArchived);
  const activeChats = allChats.filter((c) => !(c as { isArchived?: boolean }).isArchived);

  const baseList = isArchivedRoute ? archivedChats : activeChats;

  const filteredChats = useMemo(() => {
    let list = baseList;
    if (activeTab === "unread") list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    else if (activeTab === "groups") list = list.filter((c) => c.type === 2 || c.type === 3);
    else if (activeTab === "personal") list = list.filter((c) => c.type === 1);
    else if (activeTab.startsWith("folder:")) {
      const folderId = Number(activeTab.split(":")[1]);
      const folder = folders?.find((f) => f.id === folderId);
      if (folder) list = list.filter((c) => folder.chatIds.includes(c.id));
    }

    if (searchOpen && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      const ap = (a as { isPinned?: boolean }).isPinned ? 1 : 0;
      const bp = (b as { isPinned?: boolean }).isPinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const at = (a as { lastMessageAt?: string | null }).lastMessageAt;
      const bt = (b as { lastMessageAt?: string | null }).lastMessageAt;
      return (bt ? new Date(bt).getTime() : 0) - (at ? new Date(at).getTime() : 0);
    });
  }, [baseList, activeTab, folders, searchOpen, query]);

  const foundGlobalUsers = (globalUsers ?? []).filter(
    (u) => u.username.toLowerCase().includes(query.trim().toLowerCase())
  );

  function handleAction(chatId: number, action: SwipeAction) {
    if (action === "archive") {
      settingsMutation.mutate({ id: chatId, data: { isArchived: true } });
      toast({ title: "Чат перемещён в архив" });
    } else if (action === "unarchive") {
      settingsMutation.mutate({ id: chatId, data: { isArchived: false } });
      toast({ title: "Чат восстановлен из архива" });
    } else if (action === "mute") {
      const far = new Date(); far.setFullYear(far.getFullYear() + 10);
      settingsMutation.mutate({ id: chatId, data: { mutedUntil: far.toISOString() } });
      toast({ title: "Уведомления отключены" });
    } else if (action === "unmute") {
      settingsMutation.mutate({ id: chatId, data: { mutedUntil: null } });
      toast({ title: "Уведомления включены" });
    } else if (action === "delete") {
      if (window.confirm("Удалить всю историю переписки в этом чате? Это действие необратимо.")) {
        deleteHistoryMutation.mutate({ id: chatId });
      }
    }
    setContextMenu(null);
  }

  function openContextMenu(chat: (typeof allChats)[number], e: React.PointerEvent | React.MouseEvent) {
    e.preventDefault();
    setContextMenu({
      chatId: chat.id,
      isPinned: (chat as { isPinned?: boolean }).isPinned ?? false,
      isMuted: !!(chat as { mutedUntil?: string | null }).mutedUntil,
      isArchived: (chat as { isArchived?: boolean }).isArchived ?? false,
      x: 0,
      y: 0,
    });
  }

  const tabs: { id: string; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "personal", label: "Личные" },
    { id: "groups", label: "Группы" },
    { id: "unread", label: "Непрочитанные" },
    ...(folders ?? []).map((f) => ({ id: `folder:${f.id}`, label: f.emoji ? `${f.emoji} ${f.name}` : f.name })),
  ];

  return (
    <div className="flex flex-col h-full bg-background w-full md:w-80 lg:w-96 shrink-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0 glass-header sticky top-0 z-10 border-b border-white/10">
        {isArchivedRoute ? (
          <button
            onClick={() => navigate("/chats")}
            className="h-8 w-8 flex items-center justify-center rounded-full glass-pill hover:bg-muted/80"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
        ) : (
          <button
            onClick={() => navigate("/settings")}
            className="h-8 w-8 flex items-center justify-center rounded-full glass-pill hover:bg-muted/80"
          >
            <svg className="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        )}
        <span className="text-[17px] font-semibold">{isArchivedRoute ? "Архив" : "Чаты"}</span>
        {!isArchivedRoute ? (
          <button
            onClick={() => navigate("/chat/new")}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-pill hover:bg-muted/80"
          >
            <SquarePen className="h-4 w-4 text-primary" />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-2 shrink-0">
        {!searchOpen ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9 text-muted-foreground text-[15px]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Поиск
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск"
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => { setSearchOpen(false); setQuery(""); }}
              className="text-primary text-[15px] shrink-0"
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      {!searchOpen && (
        <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none shrink-0">
          {tabs.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative px-3.5 h-7 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === t.id ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
              style={activeTab === t.id ? { background: "var(--gradient-primary)" } : { background: "hsl(var(--muted))" }}
            >
              {t.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {searchOpen && query.trim().length > 1 && foundGlobalUsers.length > 0 && (
          <div className="pb-2">
            <div className="px-4 py-1.5 text-[13px] font-medium text-muted-foreground">Глобальный поиск</div>
            {foundGlobalUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate(`/profile/${u.username}`)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
              >
                <UserAvatar name={u.username} size="sm" />
                <span className="text-[15px] font-medium">@{u.username}</span>
              </div>
            ))}
          </div>
        )}

        {!isArchivedRoute && !searchOpen && archivedChats.length > 0 && (
          <div
            onClick={() => navigate("/chats/archived")}
            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/40"
          >
            <div className="h-[54px] w-[54px] rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
              <Archive className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="font-semibold text-[16px]">Архив</span>
              <span className="flex items-center justify-center bg-muted text-muted-foreground text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full">
                {archivedChats.length}
              </span>
            </div>
          </div>
        )}

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
        ) : filteredChats.length === 0 && !(searchOpen && foundGlobalUsers.length > 0) ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground px-8 text-center">
            <div className="text-4xl">
              {activeTab === "unread" ? "✅" : activeTab === "groups" ? "👥" : "💬"}
            </div>
            <div className="text-[15px]">
              {searchOpen ? "Ничего не найдено" :
               isArchivedRoute ? "Архив пуст" :
               activeTab === "unread" ? "Нет непрочитанных" :
               activeTab === "groups" ? "Нет групп" :
               "Нет чатов. Нажмите ✏️ чтобы начать"}
            </div>
          </div>
        ) : (
          filteredChats.map((chat, chatIdx) => {
            const lastMsg = (chat as { lastMessage?: string | null }).lastMessage;
            const lastMsgAt = (chat as { lastMessageAt?: string | null }).lastMessageAt;
            const lastMsgMediaType = (chat as { lastMessageMediaType?: string | null }).lastMessageMediaType;
            const lastMsgSenderId = (chat as { lastMessageSenderId?: number | null }).lastMessageSenderId;
            const isPinned = (chat as { isPinned?: boolean }).isPinned ?? false;
            const isArchived = (chat as { isArchived?: boolean }).isArchived ?? false;
            const mutedUntil = (chat as { mutedUntil?: string | null }).mutedUntil;
            const isMuted = !!mutedUntil;
            const draftText = (chat as { draftText?: string | null }).draftText;
            const isOnline = (chat as { isOnline?: boolean }).isOnline ?? false;
            const unread = chat.unreadCount ?? 0;
            const time = formatChatTime(lastMsgAt);
            const isMine = lastMsgSenderId != null && lastMsgSenderId === userId;
            const preview = mediaPreview(lastMsgMediaType);

            return (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(chatIdx * 0.04, 0.4), type: "spring", stiffness: 280, damping: 28 }}
              >
              <SwipeRow
                isMuted={isMuted}
                isArchived={isArchived}
                onAction={(action) => handleAction(chat.id, action)}
                onLongPress={() =>
                  setContextMenu({ chatId: chat.id, isPinned, isMuted, isArchived, x: 0, y: 0 })
                }
              >
                <Link href={`/chat/${chat.id}`}>
                  <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors">
                    {/* Avatar with online indicator */}
                    <UserAvatar
                      name={chat.title}
                      src={(chat as { avatarFileId?: string | null }).avatarFileId}
                      size="md"
                      online={chat.type === 1 && isOnline}
                    />

                    <div className="flex-1 min-w-0 border-b border-border/40 py-2">
                      {/* Title row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <ChatTypeIcon type={chat.type} />
                          <span className="font-semibold text-[16px] truncate">{chat.title}</span>
                          {isMuted && <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          {isPinned && <Pin className="h-3.5 w-3.5 text-muted-foreground rotate-45 shrink-0" />}
                        </div>
                        <span className="text-muted-foreground text-[13px] shrink-0">{time}</span>
                      </div>

                      {/* Last message row */}
                      <div className="flex items-center justify-between mt-0.5 gap-2">
                        <div className="flex items-center gap-1 min-w-0 text-muted-foreground text-[14px]">
                          {isMine && (
                            unread === 0
                              ? <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              : <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {!draftText && <MediaIcon mediaType={lastMsgMediaType} />}
                          {draftText ? (
                            <span className="truncate">
                              <span className="text-destructive">Черновик: </span>
                              {draftText}
                            </span>
                          ) : (
                            <span className="truncate">
                              {isMine && !preview ? "Вы: " : ""}
                              {preview || lastMsg || (chat.type === 3 ? "Канал" : "Нет сообщений")}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {unread > 0 ? (
                            <span className={cn(
                              "flex items-center justify-center text-white text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full",
                              isMuted ? "bg-muted-foreground" : "bg-primary"
                            )}>
                              {unread > 9999 ? "9999+" : unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwipeRow>
              </motion.div>
            );
          })
        )}

        {/* Bottom actions */}
        {!isArchivedRoute && !searchOpen && (
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
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-strong rounded-2xl overflow-hidden w-64 animate-in zoom-in-95 fade-in duration-150">
            <button
              onClick={() => {
                settingsMutation.mutate({ id: contextMenu.chatId, data: { isPinned: !contextMenu.isPinned } });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left"
            >
              <Pin className="h-4 w-4" /> {contextMenu.isPinned ? "Открепить" : "Закрепить"}
            </button>
            <button
              onClick={() => handleAction(contextMenu.chatId, contextMenu.isMuted ? "unmute" : "mute")}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left"
            >
              {contextMenu.isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {contextMenu.isMuted ? "Включить уведомления" : "Замутить"}
            </button>
            <button
              onClick={() => handleAction(contextMenu.chatId, contextMenu.isArchived ? "unarchive" : "archive")}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left"
            >
              <Archive className="h-4 w-4" /> {contextMenu.isArchived ? "Из архива" : "Архивировать"}
            </button>
            <button
              onClick={() => handleAction(contextMenu.chatId, "delete")}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-destructive/10 text-destructive text-left"
            >
              <Trash2 className="h-4 w-4" /> Удалить историю
            </button>
          </div>
        </>
      )}
    </div>
  );
}
