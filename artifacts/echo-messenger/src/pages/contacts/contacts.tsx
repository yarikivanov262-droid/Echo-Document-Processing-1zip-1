import { useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserByUsername, useCreateChat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const mockContacts = [
  { id: 1, username: "Алиса", lastSeen: "был(а) 8 часов назад" },
  { id: 2, username: "Борис Иванов", lastSeen: "был(а) 8 часов назад" },
  { id: 3, username: "Василий", lastSeen: "был(а) 8 часов назад" },
  { id: 4, username: "Григорий", lastSeen: "был(а) 9 часов назад" },
  { id: 5, username: "Дмитрий Сидоров", lastSeen: "был(а) вчера в 22:50" },
  { id: 6, username: "Елена", lastSeen: "был(а) вчера в 22:34" },
  { id: 7, username: "Жанна Петрова", lastSeen: "был(а) вчера в 22:24" },
  { id: 8, username: "Захар", lastSeen: "был(а) вчера в 22:19" },
  { id: 9, username: "Иван Кузнецов", lastSeen: "был(а) вчера в 22:02" },
  { id: 10, username: "Кирилл", lastSeen: "был(а) 30 июн в 20:14" },
];

export function Contacts() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: foundUser, isLoading } = useGetUserByUsername(search, {
    query: { enabled: search.length > 2 } as never,
  });
  const createChatMutation = useCreateChat();

  const filtered = search.length > 0
    ? mockContacts.filter(c => c.username.toLowerCase().includes(search.toLowerCase()))
    : mockContacts;

  const openChat = (userId: number, username: string) => {
    createChatMutation.mutate(
      { data: { type: 1, title: username, memberIds: [userId] } },
      { onSuccess: (chat) => navigate(`/chat/${chat.id}`) }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal">Сортиров.</button>
        <span className="text-[17px] font-semibold">Контакты</span>
        <button
          onClick={() => navigate("/chat/new")}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-muted"
        >
          <Plus className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground">✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Global search result */}
        {search.length > 2 && isLoading && (
          <div className="px-4 py-3 text-[14px] text-muted-foreground">Поиск...</div>
        )}
        {search.length > 2 && foundUser && (
          <div className="mb-1">
            <div className="px-4 py-1">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Глобальный поиск</span>
            </div>
            <button
              onClick={() => openChat(foundUser.id, foundUser.username)}
              disabled={createChatMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 disabled:opacity-60"
            >
              <Avatar className="h-[54px] w-[54px] shrink-0">
                {foundUser.avatarFileId && <AvatarImage src={foundUser.avatarFileId} />}
                <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(foundUser.username))}>
                  {foundUser.username.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 border-b border-border/50 py-2 text-left">
                <div className="text-[16px] font-semibold">{foundUser.username}</div>
                <div className="text-[13px] text-primary">@{foundUser.username}</div>
              </div>
            </button>
          </div>
        )}

        {/* Contact list */}
        {filtered.map((contact, i) => (
          <button
            key={contact.id}
            onClick={() => openChat(contact.id, contact.username)}
            disabled={createChatMutation.isPending}
            className="w-full flex items-center gap-3 px-4 hover:bg-muted/30 disabled:opacity-60"
          >
            <Avatar className="h-[54px] w-[54px] shrink-0">
              <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(contact.username))}>
                {contact.username.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 py-3 text-left", i < filtered.length - 1 && "border-b border-border/50")}>
              <div className="text-[16px] font-semibold">{contact.username}</div>
              <div className="text-[13px] text-muted-foreground">{contact.lastSeen}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
