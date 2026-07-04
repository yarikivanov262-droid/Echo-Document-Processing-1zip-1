import { useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Send, ShieldAlert } from "lucide-react";

interface InboxInfo {
  label: string | null;
  isActive: boolean;
  allowFiles: boolean;
  maxLength: number;
}

export function AskPage() {
  const { slug } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<InboxInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!loaded) {
    fetch(`/api/inbox/${slug}`)
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); setLoaded(true); return; }
        setInfo(await r.json() as InboxInfo);
        setLoaded(true);
      })
      .catch(() => { setNotFound(true); setLoaded(true); });
  }

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/inbox/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Ошибка отправки");
      } else {
        setSent(true);
      }
    } catch {
      setError("Нет соединения");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {!loaded && (
          <div className="text-center text-muted-foreground animate-pulse">Загрузка…</div>
        )}
        {loaded && notFound && (
          <div className="text-center space-y-3">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <div className="text-[18px] font-semibold">Ящик не найден</div>
            <div className="text-muted-foreground text-[14px]">Ссылка устарела или недействительна.</div>
          </div>
        )}
        {loaded && !notFound && info && !sent && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="text-4xl">💌</div>
              <div className="text-[20px] font-bold">
                {info.label ?? "Анонимный ящик"}
              </div>
              <div className="text-[13px] text-muted-foreground">
                Отправь сообщение анонимно — получатель не узнает кто ты
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, info.maxLength))}
              placeholder="Ваше сообщение..."
              rows={5}
              className="w-full bg-card border border-border rounded-[12px] px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <span>{text.length} / {info.maxLength}</span>
              {error && <span className="text-destructive">{error}</span>}
            </div>
            <button
              onClick={() => void handleSend()}
              disabled={!text.trim() || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-[12px] text-[16px] font-medium disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "Отправка…" : "Отправить анонимно"}
            </button>
          </div>
        )}
        {sent && (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <div className="text-[18px] font-semibold">Сообщение отправлено!</div>
            <div className="text-[13px] text-muted-foreground">Получатель не знает кто ты.</div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
