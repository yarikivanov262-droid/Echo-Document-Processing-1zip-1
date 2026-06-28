import { useState } from "react";
import { Link } from "wouter";
import { Search, UserPlus, Phone, MessageSquare, MoreVertical, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserByUsername } from "@workspace/api-client-react";

export function Contacts() {
  const [search, setSearch] = useState("");
  const { data: user, isLoading } = useGetUserByUsername(search, { query: { enabled: search.length > 2 } });

  const mockContacts = [
    { id: 1, username: "ghost_protocol", lastSeen: "Last seen recently", isOnline: true },
    { id: 2, username: "cipher_09", lastSeen: "Last seen 2 hours ago", isOnline: false },
    { id: 3, username: "neon_shadow", lastSeen: "Last seen yesterday", isOnline: false },
  ];

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <h1 className="text-xl font-bold font-mono tracking-tight">Contacts</h1>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by exact username..." 
            className="pl-9 bg-background/50 border-muted font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {search.length > 2 && isLoading && (
          <div className="p-4 text-center text-sm font-mono text-muted-foreground animate-pulse">
            Scanning network...
          </div>
        )}
        
        {search.length > 2 && user && (
          <div className="mb-6">
            <h2 className="px-3 text-xs font-bold text-primary font-mono uppercase tracking-widest mb-2">Global Search Result</h2>
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group border border-primary/20">
              <Avatar className="h-12 w-12 border border-primary/50 bg-muted">
                {user.avatarFileId && <AvatarImage src={user.avatarFileId} />}
                <AvatarFallback className="font-mono text-xs text-primary bg-primary/10">
                  {user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm truncate block">{user.username}</span>
                <span className="text-xs text-primary font-mono flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Identity verified
                </span>
              </div>
              <Button size="sm" className="font-mono text-xs uppercase h-8">Add</Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <h2 className="px-3 text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest mb-2 mt-4">Your Contacts</h2>
          {mockContacts.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group">
              <div className="relative">
                <Avatar className="h-12 w-12 border border-border bg-muted">
                  <AvatarFallback className="font-mono text-xs text-primary bg-primary/10">
                    {contact.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {contact.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm truncate block group-hover:text-primary transition-colors">
                  {contact.username}
                </span>
                <span className="text-xs text-muted-foreground font-mono block">
                  {contact.lastSeen}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
