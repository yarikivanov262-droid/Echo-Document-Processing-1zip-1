import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Edit, ShieldCheck, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetChats } from "@workspace/api-client-react";

export function ChatList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: chats, isLoading } = useGetChats();

  const mockChats = [
    { id: 1, title: "CipherOps", lastMessage: "Keys rotated.", time: "10:24", unread: 0, isSecret: true },
    { id: 2, title: "nexus_prime", lastMessage: "Meeting at rendezvous point.", time: "09:12", unread: 2, isSecret: false },
    { id: 3, title: "ghost_protocol", lastMessage: "Data purged.", time: "Yesterday", unread: 0, isSecret: false },
  ];

  const displayChats = chats && chats.length > 0 ? chats : mockChats;

  return (
    <div className="flex flex-col h-full bg-background border-r border-border md:w-80 lg:w-96 shrink-0 relative z-10 shadow-xl">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-mono text-lg font-bold tracking-tight">ECHO</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search channels & users..." 
            className="pl-9 bg-background/50 border-muted font-mono text-xs h-9 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {displayChats.map((chat, idx) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/chat/${chat.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group">
                    <Avatar className="h-12 w-12 border border-border bg-muted">
                      {chat.avatarFileId && <AvatarImage src={chat.avatarFileId} />}
                      <AvatarFallback className="font-mono text-xs text-primary bg-primary/10">
                        {chat.title.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {chat.isSecret && <Lock className="h-3 w-3 text-primary" />}
                          <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {chat.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {chat.time || "Now"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate font-mono">
                          {chat.lastMessage || "No messages yet."}
                        </span>
                        {(chat.unreadCount || chat.unread) > 0 && (
                          <span className="flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full ml-2 shrink-0">
                            {chat.unreadCount || chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
