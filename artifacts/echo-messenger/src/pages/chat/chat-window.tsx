import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Mic, ArrowLeft, MoreVertical, Phone,
  Check, CheckCheck, Reply, Copy, Trash2, Forward,
  Smile, X, Search, Pin, BellOff, UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetChat, useGetMessages, useSendMessage, useMarkMessageRead, useDeleteMessage, useReactToMessage } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useWsEvent } from "@/hooks/use-ws";
import { echoWs } from "@/lib/ws-client";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatMsgTime(raw?: string | null) {
  if (!raw) return "";
  const d = new Date(raw);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return "Сегодня";
  if (msgDay.getTime() === yesterday.getTime()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

const EMOJI_QUICK = ["👍","❤️","😂","😮","😢","🔥","🎉","👎","🙏","😍","🤔","💯"];

type MsgItem = {
  id: number;
  encryptedContent: string;
  senderId: number;
  timestamp: string;
  readAt?: string | null;
  isSelf?: boolean;
  reactions?: Record<string, number[]>;
  isEdited?: boolean;
  senderUsername?: string;
};

export function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { userId, username } = useEchoAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatId = parseInt(id || "0", 10);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId && chatId > 0 } as never });
  const { data: messages, isLoading } = useGetMessages(
    { chatId },
    { query: { enabled: !!chatId && chatId > 0 } as never }
  );
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessageRead();
  const deleteMessageMutation = useDeleteMessage();
  const reactMutation = useReactToMessage();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MsgItem | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<MsgItem | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showEmoji, setShowEmoji] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve messages query key for cache invalidation
  const messagesQueryKey = ["/api/messages", { chatId }];

  // WebSocket: real-time new messages → invalidate messages cache
  useWsEvent((event) => {
    if (event.type === "new_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "delete_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "edit_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "reaction" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "typing" && event.chatId === chatId && event.userId !== userId) {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (event.isTyping) {
          next.add(event.username);
        } else {
          next.delete(event.username);
        }
        return next;
      });
    }
    if (event.type === "read_ack" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
  });

  // Enrich messages with isSelf
  const enriched: MsgItem[] = (messages ?? []).map(m => ({
    ...m,
    timestamp: (m as { timestamp?: string }).timestamp ?? "",
    isSelf: m.senderId === userId,
    senderUsername: (m as { senderUsername?: string }).senderUsername,
  }));

  // Date separators
  type DateItem = { kind: "date"; label: string; key: string };
  type MsgEntry = { kind: "msg"; msg: MsgItem };
  type ListItem = DateItem | MsgEntry;

  const listItems: ListItem[] = [];
  let lastDateLabel = "";
  for (const msg of enriched) {
    const label = formatDateLabel(msg.timestamp);
    if (label && label !== lastDateLabel) {
      listItems.push({ kind: "date", label, key: `date-${label}` });
      lastDateLabel = label;
    }
    listItems.push({ kind: "msg", msg });
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [enriched.length]);

  // Mark unread as read
  useEffect(() => {
    if (messages && messages.length > 0) {
      messages.filter(m => !m.readAt && m.senderId !== userId)
        .slice(-5)
        .forEach(m => markReadMutation.mutate({ id: m.id }));
    }
  }, [messages?.length]);

  // Typing indicator
  const handleTextChange = (v: string) => {
    setText(v);
    if (!typingTimer.current) {
      echoWs.send(JSON.stringify({ type: "typing", chatId, isTyping: true, username }));
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      echoWs.send(JSON.stringify({ type: "typing", chatId, isTyping: false, username }));
      typingTimer.current = null;
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !chatId) return;
    setText("");
    setReplyTo(null);
    setShowEmoji(false);
    sendMutation.mutate({
      data: { chatId, chatType: chat?.type ?? 1, encryptedContent: trimmed },
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleLongPress = useCallback((msg: MsgItem, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setSelectedMsg(msg);
    if ("clientX" in e) {
      setMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      const t = e.touches[0];
      setMenuPos({ x: t.clientX, y: t.clientY });
    }
    setShowMenu(true);
  }, []);

  const copyMsg = () => {
    if (!selectedMsg) return;
    navigator.clipboard.writeText(selectedMsg.encryptedContent);
    toast({ title: "Скопировано" });
    setShowMenu(false);
  };

  const replyMsg = () => {
    if (!selectedMsg) return;
    setReplyTo(selectedMsg);
    setShowMenu(false);
    inputRef.current?.focus();
  };

  const deleteMsg = () => {
    if (!selectedMsg) return;
    deleteMessageMutation.mutate({ id: selectedMsg.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        toast({ title: "Сообщение удалено" });
      },
      onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
    });
    setShowMenu(false);
  };

  const reactToMsg = (emoji: string) => {
    if (!selectedMsg) return;
    reactMutation.mutate({ id: selectedMsg.id, data: { emoji } }, {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
      onError: () => toast({ title: "Ошибка реакции", variant: "destructive" }),
    });
    setShowMenu(false);
  };

  const chatTitle = chat?.title || "Чат";
  const isGroup = chat?.type === 2 || chat?.type === 3;
  const memberCount = (chat as { memberCount?: number })?.memberCount;
  const statusLine = isGroup
    ? `${memberCount ?? "?"} участников`
    : typingUsers.size > 0 ? "печатает..." : "в сети";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: `Файл выбран: ${file.name}`, description: "Загрузка файлов скоро будет добавлена" });
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-2 py-2 bg-card border-b border-border shrink-0 h-14">
        <button
          onClick={() => navigate("/chats")}
          className="md:hidden flex items-center text-primary gap-0.5 pr-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          onClick={() => setShowChatInfo(v => !v)}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={cn("text-white font-semibold text-sm", getAvatarColor(chatTitle))}>
              {chatTitle.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] leading-tight truncate">{chatTitle}</div>
            <div className={cn("text-[12px] truncate", isGroup ? "text-muted-foreground" : "text-[#34c759]")}>
              {statusLine}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => toast({ title: "Звонки скоро" })}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-primary"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => toast({ title: "Поиск по чату скоро" })}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowChatInfo(v => !v)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Chat info panel ── */}
      <AnimatePresence>
        {showChatInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card border-b border-border overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-around py-3 px-4">
              {[
                { icon: <BellOff className="h-5 w-5" />, label: "Без звука" },
                { icon: <Pin className="h-5 w-5" />, label: "Закрепить" },
                { icon: <UserPlus className="h-5 w-5" />, label: "Добавить" },
                { icon: <Search className="h-5 w-5" />, label: "Поиск" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  onClick={() => { toast({ title: label }); setShowChatInfo(false); }}
                  className="flex flex-col items-center gap-1 text-primary hover:opacity-70"
                >
                  {icon}
                  <span className="text-[11px]">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onClick={() => { setShowMenu(false); setShowEmoji(false); }}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.3) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : enriched.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-card/80 rounded-2xl px-5 py-3 text-[14px] text-muted-foreground">
              Начните разговор — всё зашифровано 🔒
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {listItems.map((item) => {
              if (item.kind === "date") {
                return (
                  <div key={item.key} className="flex justify-center my-3">
                    <span className="bg-card/80 backdrop-blur text-muted-foreground text-[12px] px-3 py-1 rounded-full">
                      {item.label}
                    </span>
                  </div>
                );
              }
              const { msg } = item;
              const isSelf = msg.isSelf ?? false;
              const reactionEntries = msg.reactions ? Object.entries(msg.reactions) : [];
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className={cn("flex flex-col mb-1", isSelf ? "items-end" : "items-start")}
                >
                  <div className={cn("flex", isSelf ? "justify-end" : "justify-start", "w-full")}>
                    {/* Avatar for others in group chats */}
                    {!isSelf && isGroup && (
                      <Avatar className="h-6 w-6 mr-1.5 mt-1 self-end shrink-0">
                        <AvatarFallback className={cn("text-white text-[10px]", getAvatarColor(msg.senderId.toString()))}>
                          {String(msg.senderId).substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn("relative max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm cursor-pointer select-text",
                        isSelf
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-card text-foreground rounded-bl-sm"
                      )}
                      onContextMenu={(e) => { e.preventDefault(); handleLongPress(msg, e); }}
                      onClick={(e) => { e.stopPropagation(); handleLongPress(msg, e); }}
                    >
                      {/* Sender name in group */}
                      {!isSelf && isGroup && (
                        <div className="text-[12px] font-semibold text-primary mb-0.5">
                          {msg.senderUsername || `User ${msg.senderId}`}
                        </div>
                      )}

                      <p className="break-words whitespace-pre-wrap pr-14">{msg.encryptedContent}</p>

                      {/* Edited mark */}
                      {msg.isEdited && (
                        <span className={cn("text-[10px] mr-1", isSelf ? "text-white/60" : "text-muted-foreground/70")}>изм.</span>
                      )}

                      {/* Time + read receipt */}
                      <div className={cn(
                        "absolute bottom-1.5 right-2.5 flex items-center gap-0.5",
                        isSelf ? "text-white/70" : "text-muted-foreground"
                      )}>
                        <span className="text-[11px]">{formatMsgTime(msg.timestamp)}</span>
                        {isSelf && (
                          msg.readAt
                            ? <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                            : <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reactions row */}
                  {reactionEntries.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-0.5 px-1", isSelf ? "justify-end" : "justify-start")}>
                      {reactionEntries.map(([emoji, users]) => (
                        <span
                          key={emoji}
                          className="inline-flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-0.5 text-[12px] cursor-pointer hover:bg-muted"
                        >
                          {emoji} <span className="text-muted-foreground">{users.length}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex justify-start mb-1"
            >
              <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-1">
                  {[0,1,2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Context menu ── */}
      <AnimatePresence>
        {showMenu && selectedMsg && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ left: Math.min(menuPos.x, window.innerWidth - 180), top: Math.min(menuPos.y, window.innerHeight - 200) }}
              className="fixed z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[160px]"
            >
              {/* Quick emoji reactions */}
              <div className="flex gap-1 px-3 py-2 border-b border-border/50">
                {EMOJI_QUICK.slice(0, 6).map(e => (
                  <button key={e} onClick={() => reactToMsg(e)}
                    className="text-xl hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
              {[
                { icon: <Reply className="h-4 w-4" />, label: "Ответить", fn: replyMsg },
                { icon: <Copy className="h-4 w-4" />, label: "Копировать", fn: copyMsg },
                { icon: <Forward className="h-4 w-4" />, label: "Переслать", fn: () => { toast({ title: "Пересылка скоро" }); setShowMenu(false); } },
                { icon: <Pin className="h-4 w-4" />, label: "Закрепить", fn: () => { toast({ title: "Закреплено" }); setShowMenu(false); } },
                { icon: <Trash2 className="h-4 w-4 text-[#ff3b30]" />, label: "Удалить", fn: deleteMsg, danger: true },
              ].map(({ icon, label, fn, danger }) => (
                <button
                  key={label}
                  onClick={fn}
                  className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-muted/50 text-left",
                    danger && "text-[#ff3b30]"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div className="shrink-0 bg-card border-t border-border"
           style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>

        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 pt-2 pb-1"
            >
              <div className="flex-1 bg-muted rounded-xl px-3 py-1.5 border-l-4 border-primary">
                <div className="text-[12px] text-primary font-semibold">
                  {replyTo.isSelf ? "Вы" : `User ${replyTo.senderId}`}
                </div>
                <div className="text-[13px] text-muted-foreground truncate">{replyTo.encryptedContent}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-8 gap-1 px-3 py-2 border-t border-border/50"
            >
              {EMOJI_QUICK.map(e => (
                <button key={e} onClick={() => setText(t => t + e)}
                  className="text-2xl flex items-center justify-center h-10 rounded-lg hover:bg-muted transition-colors">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2 px-2 py-2">
          {/* Attachment */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-9 w-9 flex items-center justify-center text-primary rounded-full hover:bg-muted shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx"
            onChange={handleFileSelect}
          />

          {/* Input */}
          <div className="flex-1 bg-muted rounded-2xl px-3 h-9 flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Сообщение..."
              className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              className={cn("shrink-0 transition-colors", showEmoji ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Send or Mic */}
          {text.trim() ? (
            <motion.button
              type="submit"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90"
            >
              <Send className="h-4 w-4 text-white" />
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={() => toast({ title: "Голосовые сообщения скоро" })}
              className="h-9 w-9 flex items-center justify-center text-primary rounded-full hover:bg-muted shrink-0"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
