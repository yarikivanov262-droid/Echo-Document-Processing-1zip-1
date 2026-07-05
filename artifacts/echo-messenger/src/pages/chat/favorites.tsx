import { ArrowLeft, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useGetStarredMessages } from "@workspace/api-client-react";
import { MessageText } from "@/components/message-text";

function formatTime(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Favorites() {
  const [, navigate] = useLocation();
  const { data: messages, isLoading } = useGetStarredMessages();
  const list = messages ?? [];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass shrink-0">
        <button onClick={() => navigate("/chats")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold flex-1">Избранное</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-3 text-muted-foreground px-8">
            <Star className="h-12 w-12 opacity-40" />
            <div className="text-[16px] font-medium">Избранное пусто</div>
            <div className="text-[13px] text-center">Сохраняйте важные сообщения здесь, зажав их в чате</div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {list.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/chat/${m.chatId}#msg-${m.id}`)}
                className="w-full text-left glass rounded-2xl px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-primary">{m.senderUsername || `User ${m.senderId}`}</span>
                  <span className="text-[11px] text-muted-foreground">{formatTime(m.timestamp)}</span>
                </div>
                <MessageText id={`fav-${m.id}`} text={m.encryptedContent} isSelf={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
