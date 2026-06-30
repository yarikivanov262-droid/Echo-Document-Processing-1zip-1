import { useState } from "react";
import { Link } from "wouter";
import { Plus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserByUsername } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
  const [search, setSearch] = useState("");
  const { data: foundUser, isLoading } = useGetUserByUsername(search, {
    query: { enabled: search.length > 2 },
  });

  const filtered = search.length > 0
    ? mockContacts.filter(c => c.username.toLowerCase().includes(search.toLowerCase()))
    : mockContacts;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="text-primary text-[17px] font-normal">Сортиров...</button>
        <span className="text-[17px] font-semibold">Контакты</span>
        <button className="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
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
            <button onClick={() => setSearch("")} className="text-muted-foreground text-[15px]">✕</button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Invite row */}
        {!search && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer">
            <div className="h-[54px] w-[54px] rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-[16px] text-foreground">Пригласить</span>
          </div>
        )}

        {/* Global search result */}
        {search.length > 2 && foundUser && (
          <div className="mb-1">
            <div className="px-4 py-1">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Глобальный поиск</span>
            </div>
            <Link href={`/chat/new?user=${foundUser.username}`}>
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer">
                <Avatar className="h-[54px] w-[54px] shrink-0">
                  {foundUser.avatarFileId && <AvatarImage src={foundUser.avatarFileId} />}
                  <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(foundUser.username))}>
                    {foundUser.username.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 border-b border-border/50 py-2">
                  <div className="text-[16px] font-semibold text-foreground">{foundUser.username}</div>
                  <div className="text-[13px] text-primary">@{foundUser.username}</div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {search.length > 2 && isLoading && (
          <div className="px-4 py-3 text-[14px] text-muted-foreground">Поиск...</div>
        )}

        {/* Contact list */}
        {filtered.map((contact, i) => (
          <div key={contact.id} className="flex items-center gap-3 px-4 hover:bg-muted/30 cursor-pointer">
            <Avatar className="h-[54px] w-[54px] shrink-0">
              <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(contact.username))}>
                {contact.username.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 py-3", i < filtered.length - 1 && "border-b border-border/50")}>
              <div className="text-[16px] font-semibold text-foreground">{contact.username}</div>
              <div className="text-[13px] text-muted-foreground">{contact.lastSeen}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
