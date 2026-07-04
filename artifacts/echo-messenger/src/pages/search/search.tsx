import { useState } from "react";
import { useLocation } from "wouter";
import { X, MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useGetUserByUsername, useGetUserByEchoNumber, useGetChats, useCreateChat, useSearchMessages } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useEchoAuth } from "@/lib/auth-context";

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatMsgTime(raw: string) {
  const d = new Date(raw);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function Search() {
  const [, navigate] = useLocation();
  const { userId } = useEchoAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "messages">("all");

  const isNumberSearch = /^\+999\d{0,7}$/.test(query.trim());
  const isFullNumber = /^\+999\d{7}$/.test(query.trim());
  const isMessageSearch = query.trim().length >= 2 && !isNumberSearch && tab === "messages";

  const { data: foundUser, isLoading: userLoading } = useGetUserByUsername(query.trim(), {
    query: { enabled: query.trim().length > 1 && !isNumberSearch && tab === "all" } as never,
  });

  const { data: foundByNumber, isLoading: numberLoading } = useGetUserByEchoNumber(query.trim(), {
    query: { enabled: isFullNumber } as never,
  });

  const { data: chats } = useGetChats();
  const createChatMutation = useCreateChat();

  const { data: messageResults, isLoading: msgLoading } = useSearchMessages(
    { q: query.trim(), limit: 30 },
    { query: { enabled: isMessageSearch } as never }
  );

  const filteredChats = chats?.filter(c =>
    query.length > 0 && c.title.toLowerCase().includes(query.toLowerCase())
  ) ?? [];

  const startChat = (userId: number, username: string) => {
    createChatMutation.mutate({ data: { type: 1, title: username, memberIds: [userId] } }, {
      onSuccess: (chat) => navigate(`/chat/${chat.id}`),
    });
  };

  const isLoading = userLoading || numberLoading;
  const resultUser = isNumberSearch ? foundByNumber : foundUser;

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
            placeholder={tab === "messages" ? "Поиск по тексту сообщений..." : "Поиск по @username или +999..."}
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

      {/* Tabs */}
      <div className="flex border-b border-border/50 shrink-0">
        {[
          { key: "all", label: "Всё" },
          { key: "messages", label: "Сообщения" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as "all" | "messages")}
            className={cn(
              "flex-1 py-2.5 text-[14px] font-medium transition-colors border-b-2",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query && (
          <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
            <div className="text-5xl">🔍</div>
            <div className="text-[16px] font-semibold">
              {tab === "messages" ? "Поиск по сообщениям" : "Поиск пользователей"}
            </div>
            <div className="text-[13px] text-muted-foreground max-w-[240px]">
              {tab === "messages"
                ? "Введите текст для поиска по всем вашим сообщениям"
                : <>Введите имя пользователя или ECHO номер в формате <span className="font-mono text-primary">+999XXXXXXX</span></>
              }
            </div>
          </div>
        )}

        {/* Message search results */}
        {tab === "messages" && query.trim().length >= 2 && (
          <div>
            {msgLoading ? (
              <div className="px-4 py-3 text-muted-foreground text-[14px]">Поиск...</div>
            ) : messageResults && messageResults.length > 0 ? (
              <>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">
                    Сообщения ({messageResults.length})
                  </span>
                </div>
                {messageResults.map((msg) => {
                  const chatTitle = chats?.find(c => c.id === msg.chatId)?.title ?? `Чат ${msg.chatId}`;
                  const isVoice = msg.encryptedContent?.startsWith("[voice:");
                  const isMedia = !!(msg as { mediaFileId?: string }).mediaFileId;
                  const displayText = isVoice ? "🎤 Голосовое" : isMedia ? "📎 Файл" : msg.encryptedContent;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => navigate(`/chat/${msg.chatId}`)}
                      className="w-full flex items-start gap-3 px-4 py-2 hover:bg-muted/30 text-left"
                    >
                      <div className="mt-0.5">
                        <UserAvatar name={chatTitle} size="md" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-border/50 py-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[15px] font-semibold truncate">{chatTitle}</span>
                          <span className="text-[12px] text-muted-foreground shrink-0">
                            {formatMsgTime(msg.timestamp)}
                          </span>
                        </div>
                        <div className="text-[13px] text-muted-foreground truncate">
                          <span className="font-medium text-foreground/70">{msg.senderUsername}: </span>
                          {highlight(displayText ?? "", query.trim())}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-[15px]">Сообщений не найдено</div>
                <div className="text-[13px] mt-1">Попробуйте другой запрос</div>
              </div>
            )}
          </div>
        )}

        {/* All tab content */}
        {tab === "all" && query && (
          <>
            {/* Hint for partial number */}
            {isNumberSearch && !isFullNumber && (
              <div className="px-4 py-3 text-[14px] text-muted-foreground">
                Введите полный номер: +999 + 7 цифр
              </div>
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
                    <UserAvatar name={chat.title} size="md" />
                    <div className="flex-1 border-b border-border/50 py-2 text-left">
                      <div className="text-[16px] font-semibold">{chat.title}</div>
                      <div className="text-[13px] text-muted-foreground">{chat.memberCount} участников</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Global search results */}
            {query.length > 1 && (
              <div>
                {isLoading ? (
                  <div className="px-4 py-3 text-muted-foreground text-[14px]">Поиск...</div>
                ) : resultUser ? (
                  <>
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">
                        {isNumberSearch ? "По ECHO номеру" : "Глобальный поиск"}
                      </span>
                    </div>
                    <button
                      onClick={() => startChat(resultUser.id, resultUser.username)}
                      disabled={createChatMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 disabled:opacity-60"
                    >
                      <UserAvatar name={resultUser.username} size="md" />
                      <div className="flex-1 border-b border-border/50 py-3 text-left">
                        <div className="text-[16px] font-semibold">
                          {resultUser.displayName || resultUser.username}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-primary">@{resultUser.username}</span>
                          {resultUser.echoNumber && (
                            <span className="text-[12px] text-muted-foreground font-mono">{resultUser.echoNumber}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </>
                ) : (
                  !filteredChats.length && !isNumberSearch && (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      <div className="text-4xl mb-3">🔍</div>
                      <div className="text-[15px]">Ничего не найдено</div>
                      <div className="text-[13px] mt-1">
                        Переключитесь на вкладку «Сообщения» для поиска по тексту
                      </div>
                    </div>
                  )
                )}

                {/* No result for full number search */}
                {isFullNumber && !numberLoading && !foundByNumber && (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <div className="text-4xl mb-3">📵</div>
                    <div className="text-[15px]">Пользователь с номером {query} не найден</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
