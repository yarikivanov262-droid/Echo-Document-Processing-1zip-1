import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, UserPlus, Search, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useGetUserByUsername, useCreateChat, useGetContacts } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function formatLastSeen(isOnline: boolean, raw?: string | null): string {
  if (isOnline) return "в сети";
  if (!raw) return "не в сети";
  const d = new Date(raw);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1)  return "был(а) только что";
  if (diffMin < 60) return `был(а) ${diffMin} мин. назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24)   return `был(а) ${diffH} ч. назад`;
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
    ? allContacts.filter(c =>
        (c.displayName ?? c.username).toLowerCase().includes(search.toLowerCase()) ||
        c.username.toLowerCase().includes(search.toLowerCase())
      )
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
      <div className="flex items-center justify-between px-4 pt-3 pb-2 glass-header sticky top-0 z-10 border-b border-white/10 shrink-0">
        <div className="w-9" />
        <span className="text-[17px] font-semibold">Контакты</span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate("/chat/new")}
          className="h-9 w-9 flex items-center justify-center rounded-full glass-pill"
        >
          <Plus className="h-4.5 w-4.5 text-primary h-[18px] w-[18px]" />
        </motion.button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 glass-pill rounded-[14px] px-3 h-10 transition-shadow focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Global search result */}
        <AnimatePresence>
          {search.length > 2 && isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-3 text-[14px] text-muted-foreground"
            >
              Поиск...
            </motion.div>
          )}
          {search.length > 2 && foundUser && !allContacts.some(c => c.contactId === foundUser.id) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2"
            >
              <div className="px-4 py-1.5">
                <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Глобальный поиск</span>
              </div>
              <motion.div
                whileHover={{ backgroundColor: "hsl(var(--muted)/0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openChat(foundUser.id, foundUser.username)}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors mx-2 rounded-2xl"
              >
                <UserAvatar name={foundUser.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold">@{foundUser.username}</div>
                  <div className="text-[13px] text-muted-foreground">Нажмите чтобы начать чат</div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <UserPlus className="h-4 w-4 text-white" />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contacts list */}
        {contactsLoading ? (
          <div className="px-4 space-y-1 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="w-10 h-10 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 skeleton rounded-lg w-28" />
                  <div className="h-3 skeleton rounded-lg w-20" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : filtered.length === 0 && search.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground"
          >
            <div className="h-20 w-20 rounded-3xl glass flex items-center justify-center">
              <Users className="h-10 w-10 text-primary/60" />
            </div>
            <div className="text-center">
              <div className="text-[16px] font-semibold mb-1">Нет контактов</div>
              <div className="text-[13px] opacity-70">Найдите друзей через поиск</div>
            </div>
          </motion.div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="px-4 py-1.5">
                <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Контакты ({filtered.length})
                </span>
              </div>
            )}
            <div className="px-2">
              {filtered.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 28 }}
                  whileHover={{ backgroundColor: "hsl(var(--muted)/0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openChat(contact.contactId, contact.displayName ?? contact.username)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="relative shrink-0">
                    <UserAvatar name={contact.displayName ?? contact.username} size="sm" />
                    {(contact as { isOnline?: boolean }).isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#34c759] rounded-full border-2 border-background online-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold truncate">
                      {contact.displayName ?? contact.username}
                    </div>
                    <div className={cn(
                      "text-[13px] truncate",
                      (contact as { isOnline?: boolean }).isOnline ? "text-[#34c759]" : "text-muted-foreground"
                    )}>
                      {formatLastSeen(
                        (contact as { isOnline?: boolean }).isOnline ?? false,
                        (contact as { lastSeenAt?: string | null; lastOnline?: string | null }).lastSeenAt ?? (contact as { lastOnline?: string | null }).lastOnline
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
