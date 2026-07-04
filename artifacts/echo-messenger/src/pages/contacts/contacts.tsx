import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, UserPlus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useGetUserByUsername, useCreateChat, useGetContacts } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function formatLastSeen(isOnline: boolean, raw?: string | null): string {
  if (isOnline) return "в сети";
  if (!raw) return "не в сети";
  const d = new Date(raw);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "был(а) только что";
  if (diffMin < 60) return `был(а) ${diffMin} мин. назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `был(а) ${diffH} ч. назад`;
  return `был(а) ${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
}

export function Contacts() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading: contactsLoading } = useGetContacts();
  const { data: foundUser, isLoading } = useGetUserByUsername(search, {
    query: { enabled: search.length > 2 } as never,
  });
  const createChatMutation = useCreateChat();

  const allContacts = contacts ?? [];
  const filtered = search.length > 0
    ? allContacts.filter(c => (c.displayName ?? c.username).toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()))
    : allContacts;

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
        <div className="w-8" />
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
        {search.length > 2 && foundUser && !allContacts.some(c => c.contactId === foundUser.id) && (
          <div className="mb-1">
            <div className="px-4 py-1">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Глобальный поиск</span>
            </div>
            <button
              onClick={() => navigate(`/profile/${foundUser.username}`)}
              disabled={createChatMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 disabled:opacity-60"
            >
              <UserAvatar name={foundUser.displayName || foundUser.username} src={foundUser.avatarFileId ? `/api/files/${foundUser.avatarFileId}/download` : null} size="md" />
              <div className="flex-1 border-b border-border/50 py-2 text-left">
                <div className="text-[16px] font-semibold">{foundUser.displayName || foundUser.username}</div>
                <div className="text-[13px] text-primary">@{foundUser.username}</div>
              </div>
            </button>
          </div>
        )}

        {/* Contact list */}
        {contactsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
              <div className="w-[54px] h-[54px] rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-2/5" />
                <div className="h-3 bg-muted rounded w-3/5" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground px-8 text-center">
            <UserPlus className="h-10 w-10" />
            <div className="text-[15px]">
              {search ? "Ничего не найдено" : "У вас пока нет контактов"}
            </div>
            {!search && (
              <button
                onClick={() => navigate("/chat/new")}
                className="text-primary text-[15px] font-medium"
              >
                Найти пользователя по username
              </button>
            )}
          </div>
        ) : (
          filtered.map((contact, i) => {
            const label = contact.nickname || contact.displayName || contact.username;
            return (
              <button
                key={contact.id}
                onClick={() => openChat(contact.contactId, contact.username)}
                disabled={createChatMutation.isPending}
                className="w-full flex items-center gap-3 px-4 hover:bg-muted/30 disabled:opacity-60"
              >
                <UserAvatar name={label} src={contact.avatarFileId ? `/api/files/${contact.avatarFileId}/download` : null} size="md" online={contact.isOnline} />
                <div className={cn("flex-1 py-3 text-left", i < filtered.length - 1 && "border-b border-border/50")}>
                  <div className="text-[16px] font-semibold">{label}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatLastSeen(contact.isOnline, contact.lastOnline)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
