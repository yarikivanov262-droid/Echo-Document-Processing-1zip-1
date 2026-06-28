import { Lock, Plus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SecretChatList() {
  const mockChats = [
    { id: 4, title: "Ghost Team", lastMessage: "Coordinates received.", time: "11:00", unread: 1 },
  ];

  return (
    <div className="flex flex-col h-full bg-background border-r border-border md:w-80 lg:w-96 shrink-0 relative z-10 shadow-xl">
      <div className="flex flex-col gap-4 p-4 border-b border-primary/30 bg-primary/5 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="font-mono text-lg font-bold tracking-tight text-primary">SECRET VAULT</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/20">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-1">
          {mockChats.map((chat) => (
             <div key={chat.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 cursor-pointer transition-colors border border-transparent hover:border-primary/20">
                <div className="h-12 w-12 rounded-full border border-primary bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate text-primary">{chat.title}</span>
                    <span className="text-[10px] text-primary/70 font-mono">{chat.time}</span>
                  </div>
                  <span className="text-xs text-primary/80 truncate font-mono block">{chat.lastMessage}</span>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
