import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Mic, ArrowLeft, MoreVertical, Phone, Video, Timer, ShieldCheck, Check, CheckCheck } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetChat, useGetMessages, useSendMessage } from "@workspace/api-client-react";

export function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const chatId = parseInt(id || "0", 10);
  
  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId } });
  const { data: messages, isLoading: loadingMessages } = useGetMessages({ chatId }, { query: { enabled: !!chatId } });
  const sendMessageMutation = useSendMessage();

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mockMessages = [
    { id: 1, text: "The perimeter is secure.", senderId: 2, timestamp: "10:20", status: "read", isSelf: false },
    { id: 2, text: "Proceeding with data extraction.", senderId: 1, timestamp: "10:22", status: "read", isSelf: true },
    { id: 3, text: "Keys rotated successfully.", senderId: 2, timestamp: "10:24", status: "delivered", isSelf: false },
  ];

  const displayMessages = messages && messages.length > 0 ? messages : mockMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      data: {
        chatId,
        chatType: 1,
        encryptedContent: message,
      }
    }, {
      onSuccess: () => {
        setMessage("");
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background relative z-0 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-md z-10 shrink-0 h-16">
        <div className="flex items-center gap-3">
          <Link href="/chats">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <Avatar className="h-10 w-10 border border-border bg-muted shrink-0">
            {chat?.avatarFileId && <AvatarImage src={chat.avatarFileId} />}
            <AvatarFallback className="font-mono text-xs text-primary bg-primary/10">
              {chat?.title?.substring(0, 2).toUpperCase() || "CH"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">{chat?.title || "CipherOps"}</span>
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            </div>
            <span className="text-[10px] text-primary font-mono truncate">Encrypted connection active</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative z-0"
      >
        <AnimatePresence initial={false}>
          {displayMessages.map((msg, idx) => {
            const isSelf = msg.isSelf ?? (msg.senderId === 1); // Mock user ID 1
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col max-w-[80%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div 
                  className={`
                    px-4 py-2 rounded-2xl relative group font-mono text-sm
                    ${isSelf 
                      ? 'bg-primary text-primary-foreground rounded-br-sm' 
                      : 'bg-card border border-border rounded-bl-sm text-foreground'
                    }
                  `}
                >
                  <p className="break-words leading-relaxed">
                    {msg.text || msg.encryptedContent}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {msg.timestamp || new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {isSelf && (
                    msg.status === "read" || msg.readAt ? (
                      <CheckCheck className="h-3 w-3 text-primary" />
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground" />
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md shrink-0 safe-area-bottom">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto w-full">
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative bg-background border border-border rounded-2xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..." 
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 font-mono text-sm"
            />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-primary">
              <Timer className="h-4 w-4" />
            </Button>
          </div>

          {message.trim() ? (
            <Button type="submit" size="icon" className="h-10 w-10 rounded-full shrink-0 group">
              <Send className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          ) : (
            <Button type="button" size="icon" variant="secondary" className="h-10 w-10 rounded-full shrink-0">
              <Mic className="h-4 w-4 text-foreground" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
