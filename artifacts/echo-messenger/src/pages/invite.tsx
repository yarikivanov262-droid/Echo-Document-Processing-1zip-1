import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useEchoAuth } from "@/lib/auth-context";

export function InvitePage() {
  const { link } = useParams<{ link: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, sessionToken } = useEchoAuth();
  const [status, setStatus] = useState<"joining" | "done" | "error">("joining");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation(`/?redirect=/invite/${link}`);
      return;
    }
    const join = async () => {
      try {
        const res = await fetch(`/api/chats/join/${link}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg((data as { error?: string }).error ?? "Ссылка недействительна");
          setStatus("error");
          return;
        }
        const data = await res.json() as { chatId: number };
        setStatus("done");
        setTimeout(() => setLocation(`/chat/${data.chatId}`), 600);
      } catch {
        setErrorMsg("Нет соединения с сервером");
        setStatus("error");
      }
    };
    void join();
  }, [link, isAuthenticated, sessionToken, setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        {status === "joining" && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <div className="text-[18px] font-semibold">Присоединение к чату…</div>
            <div className="text-muted-foreground text-[14px]">Подождите секунду</div>
          </>
        )}
        {status === "done" && (
          <>
            <div className="text-5xl">✅</div>
            <div className="text-[18px] font-semibold">Успешно!</div>
            <div className="text-muted-foreground text-[14px]">Переходим в чат…</div>
          </>
        )}
        {status === "error" && (
          <>
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <div className="text-[18px] font-semibold">Ошибка</div>
            <div className="text-muted-foreground text-[14px]">{errorMsg}</div>
            <button
              onClick={() => setLocation("/chats")}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-[15px]"
            >
              На главную
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
