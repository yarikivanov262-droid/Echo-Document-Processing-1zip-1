import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Mic, ArrowLeft, MoreVertical, Phone, Video, Check, CheckCheck } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetChat, useGetMessages, useSendMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const chatId = parseInt(id || "0", 10);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId } });
  const { data: messages, isLoading: loadingMessages } = useGetMessages({ chatId }, { query: { enabled: !!chatId } });
  const sendMessageMutation = useSendMessage();

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mockMessages = [
    { id: 1, encryptedContent: "Привет! Как дела?", senderId: 2, timestamp: "10:20", isSelf: false, readAt: null },
    { id: 2, encryptedContent: "Всё хорошо, спасибо!", senderId: 1, timestamp: "10:22", isSelf: true, readAt: "x" },
    { id: 3, encryptedContent: "Когда встречаемся?", senderId: 2, timestamp: "10:24", isSelf: false, readAt: null },
    { id: 4, encryptedContent: "Завтра в 18:00, договорились?", senderId: 1, timestamp: "10:25", isSelf: true, readAt: null },
  ];

  const displayMessages = messages && messages.length > 0 ? messages : mockMessages;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate({ data: { chatId, chatType: 1, encryptedContent: message } }, {
      onSuccess: () => setMessage(""),
    });
  };

  const chatTitle = chat?.title || "Чат";
  const chatName = chatTitle;

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 bg-card border-b border-border shrink-0 h-14">
        <Link href="/chats">
          <button className="md:hidden flex items-center text-primary gap-0.5 pr-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={cn("text-white font-semibold text-sm", getAvatarColor(chatName))}>
            {chatName.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayMessages.map((msg) => {
              const isSelf = (msg as { isSelf?: boolean }).isSelf ?? (msg.senderId === 1);
              const text = (msg as { text?: string; encryptedContent?: string }).text || msg.encryptedContent || "";
              const time = (msg as { timestamp?: string }).timestamp ||
                (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn("flex max-w-[75%]", isSelf ? "self-end" : "self-start")}
                >
                  <div className={cn(
                    "relative px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                    isSelf
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-card text-foreground rounded-tl-sm"
                  )}>
                    <p className="break-words pr-10">{text}</p>
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
      <div className="px-2 py-2 bg-card border-t border-border shrink-0" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-primary rounded-full">
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 bg-muted rounded-2xl px-3 py-2 min-h-[36px] flex items-center">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Сообщение..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto text-[15px] leading-relaxed"
            />
          </div>

          {message.trim() ? (
            <Button type="submit" size="icon" className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 shrink-0">
              <Send className="h-4 w-4 text-white" />
            </Button>
          ) : (
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full shrink-0 text-primary">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
