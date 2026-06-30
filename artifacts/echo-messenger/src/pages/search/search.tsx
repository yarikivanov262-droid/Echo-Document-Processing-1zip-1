import { useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetUserByUsername, useGetChats, useCreateChat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const recentSearches = [
  { username: "ghost_protocol" },
  { username: "cipher_ops" },
  { username: "neon_shadow" },
];

export function Search() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  const { data: foundUser, isLoading: userLoading } = useGetUserByUsername(query, {
    query: { enabled: query.length > 1 } as never,
  });
  const { data: chats } = useGetChats();
  const createChatMutation = useCreateChat();

  const filteredChats = chats?.filter(c =>
    query.length > 0 && c.title.toLowerCase().includes(query.toLowerCase())
  ) ?? [];

  const startChat = (userId: number, username: string) => {
    createChatMutation.mutate({ data: { type: 1, title: username, memberIds: [userId] } }, {
      onSuccess: (chat) => navigate(`/chat/${chat.id}`),
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => navigate("/chats")} className="text-primary text-[17px] shrink-0">
          Отмена
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query && (
          <>
            {/* Recent searches as avatar row */}
            <div className="flex gap-4 px-4 py-3 overflow-x-auto">
              {recentSearches.map(r => (
                <button key={r.username} onClick={() => setQuery(r.username)} className="flex flex-col items-center gap-1 shrink-0">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={cn("text-white font-semibold text-xl", getAvatarColor(r.username))}>
                      {r.username.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground max-w-[56px] truncate">{r.username}</span>
                </button>
              ))}
            </div>

            <div className="px-4 py-1 flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Недавние</span>
              <button className="text-primary text-[14px]">Очистить</button>
            </div>
          </>
        )}

        {/* Chat results */}
        {filteredChats.length > 0 && (
          <div>
            <div className="px-4 pt-2 pb-1">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Чаты</span>
            </div>
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30"
              >
                <Avatar className="h-[54px] w-[54px] shrink-0">
                  <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(chat.title))}>
                    {chat.title.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 border-b border-border/50 py-2 text-left">
                  <div className="text-[16px] font-semibold">{chat.title}</div>
                  <div className="text-[13px] text-muted-foreground">{chat.memberCount} участников</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* User search results */}
        {query.length > 1 && (
          <div>
            {userLoading ? (
              <div className="px-4 py-3 text-muted-foreground text-[14px]">Поиск...</div>
            ) : foundUser ? (
              <>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Глобальный поиск</span>
                </div>
                <button
                  onClick={() => startChat(foundUser.id, foundUser.username)}
                  disabled={createChatMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 disabled:opacity-60"
                >
                  <Avatar className="h-[54px] w-[54px] shrink-0">
                    <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(foundUser.username))}>
                      {foundUser.username.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 border-b border-border/50 py-3 text-left">
                    <div className="text-[16px] font-semibold">{foundUser.username}</div>
                    <div className="text-[13px] text-primary">@{foundUser.username}</div>
                  </div>
                </button>
              </>
            ) : (
              !filteredChats.length && (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="text-[15px]">Ничего не найдено</div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
