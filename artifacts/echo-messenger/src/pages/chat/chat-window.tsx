import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Mic, ArrowLeft, MoreVertical, Phone, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetChat, useGetMessages, useSendMessage, useMarkMessageRead } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const chatId = parseInt(id || "0", 10);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId && chatId > 0 } as never });
  const { data: messages, isLoading } = useGetMessages(
    { chatId },
    { query: { enabled: !!chatId && chatId > 0, refetchInterval: 2000 } as never }
  );
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessageRead();

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mockMessages = [
    { id: 1, encryptedContent: "Привет!", senderId: 2, createdAt: new Date().toISOString(), isSelf: false, readAt: null },
    { id: 2, encryptedContent: "Привет! Как дела?", senderId: 1, createdAt: new Date().toISOString(), isSelf: true, readAt: "x" },
  ];

  const displayMessages = messages && messages.length > 0 ? messages : mockMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  // Mark unread messages as read when opening
  useEffect(() => {
    if (messages && messages.length > 0) {
      const unread = messages.filter(m => !m.readAt && m.senderId !== undefined);
      unread.slice(-3).forEach(m => markReadMutation.mutate({ id: m.id }));
    }
  }, [messages?.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;
    const text = message.trim();
    setMessage("");
    sendMutation.mutate({
      data: { chatId, chatType: chat?.type ?? 1, encryptedContent: text },
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const chatTitle = chat?.title || "Чат";

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 bg-card border-b border-border shrink-0 h-14">
        <button
          onClick={() => navigate("/chats")}
          className="md:hidden flex items-center text-primary gap-0.5 pr-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={cn("text-white font-semibold text-sm", getAvatarColor(chatTitle))}>
            {chatTitle.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => chatId && navigate(`/profile/${chatId}`)}>
          <div className="font-semibold text-[15px] leading-tight truncate">{chatTitle}</div>
          <div className="text-[12px] text-primary truncate">в сети</div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-primary">
            <Phone className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.3) 1px, transparent 0)", backgroundSize: "32px 32px" }}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayMessages.map((msg) => {
              const isSelf = (msg as { isSelf?: boolean }).isSelf ?? false;
              const text = (msg as { text?: string; encryptedContent?: string }).text || msg.encryptedContent || "";
              const rawTime = (msg as { createdAt?: string; timestamp?: string }).createdAt || (msg as { timestamp?: string }).timestamp;
              const time = rawTime
                ? new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn("flex max-w-[78%]", isSelf ? "self-end" : "self-start")}
                >
                  <div className={cn(
                    "relative px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                    isSelf ? "bg-primary text-white rounded-tr-sm" : "bg-card text-foreground rounded-tl-sm"
                  )}>
                    <p className="break-words pr-12">{text}</p>
                    <div className={cn(
                      "absolute bottom-1.5 right-2.5 flex items-center gap-0.5",
                      isSelf ? "text-white/70" : "text-muted-foreground"
                    )}>
                      <span className="text-[11px]">{time}</span>
                      {isSelf && (
                        msg.readAt
                          ? <CheckCheck className="h-3.5 w-3.5" />
                          : <Check className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="px-2 py-2 bg-card border-t border-border shrink-0"
           style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="h-9 w-9 flex items-center justify-center text-primary rounded-full hover:bg-muted shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1 bg-muted rounded-2xl px-3 h-9 flex items-center">
            <input
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); }}
              placeholder="Сообщение..."
              className="w-full bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {message.trim() ? (
            <button
              type="submit"
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          ) : (
            <button type="button" className="h-9 w-9 flex items-center justify-center text-primary rounded-full hover:bg-muted shrink-0">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
