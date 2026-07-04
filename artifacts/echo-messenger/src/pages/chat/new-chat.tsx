import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, Users, Radio } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetUserByUsername, useCreateChat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function NewChat() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const createChatMutation = useCreateChat();

  const { data: foundUser, isLoading } = useGetUserByUsername(search, {
    query: { enabled: search.length > 1 } as never,
  });

  const startChat = (userId: number, username: string) => {
    createChatMutation.mutate({
      data: { type: 1, title: username, memberIds: [userId] },
    }, {
      onSuccess: (chat) => {
        navigate(`/chat/${chat.id}`);
      },
      onError: () => toast({ title: "Не удалось создать чат", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 shrink-0">
        <button onClick={() => navigate("/chats")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1">Новое сообщение</span>
      </div>

      {/* Search input */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-10">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени пользователя..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick actions */}
        {!search && (
          <div className="mb-4">
            <button
              onClick={() => navigate("/new-group")}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <div className="h-[54px] w-[54px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-[16px] font-semibold text-primary">Новая группа</div>
                <div className="text-[13px] text-muted-foreground">Создать групповой чат</div>
              </div>
            </button>
            <button
              onClick={() => navigate("/new-channel")}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <div className="h-[54px] w-[54px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Radio className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-[16px] font-semibold text-primary">Новый канал</div>
                <div className="text-[13px] text-muted-foreground">Создать канал для трансляций</div>
              </div>
            </button>
          </div>
        )}

        {/* Search results */}
        {search.length > 1 && isLoading && (
          <div className="px-4 py-3 text-[14px] text-muted-foreground">Поиск...</div>
        )}

        {search.length > 1 && foundUser && (
          <div>
            <div className="px-4 pb-1">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Результаты</span>
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
          </div>
        )}

        {search.length > 1 && !isLoading && !foundUser && (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-[15px]">Пользователь не найден</div>
            <div className="text-[13px] mt-1">Попробуйте другое имя</div>
          </div>
        )}
      </div>
    </div>
  );
}
