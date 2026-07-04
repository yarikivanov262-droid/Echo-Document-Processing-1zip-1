import { useState } from "react";
import { useLocation } from "wouter";
import { HardDrive, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors shrink-0",
        on ? "bg-[#34c759]" : "bg-[#e5e5ea] dark:bg-[#39393d]"
      )}
    >
      <span className={cn(
        "inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md transition-transform",
        on ? "translate-x-[22px]" : "translate-x-[2px]"
      )} />
    </button>
  );
}

function Section({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  return (
    <div className="mb-0">
      <div className="px-4 pb-1.5 pt-5">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">{title}</span>
      </div>
      <div className="bg-card divide-y divide-border/50">{children}</div>
      {footer && <div className="px-4 pt-2 pb-1 text-[13px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

function estimateCacheSize(): string {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      const val = localStorage.getItem(key) ?? "";
      total += key.length + val.length;
    }
    const kb = total / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  } catch {
    return "Неизвестно";
  }
}

export function DataSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [autoDownload, setAutoDownload] = useState({
    wifi_photos: true, wifi_videos: false, wifi_docs: true,
    mobile_photos: true, mobile_videos: false, mobile_docs: false,
  });
  const [clearing, setClearing] = useState(false);
  const cacheSize = estimateCacheSize();

  const set = (k: keyof typeof autoDownload) => (v: boolean) => setAutoDownload(p => ({ ...p, [k]: v }));

  const clearCache = async () => {
    setClearing(true);
    try {
      const authToken = localStorage.getItem("echo_session_token");
      const authUser = localStorage.getItem("echo_user_id");
      const authUsername = localStorage.getItem("echo_username");
      localStorage.clear();
      if (authToken) localStorage.setItem("echo_session_token", authToken);
      if (authUser) localStorage.setItem("echo_user_id", authUser);
      if (authUsername) localStorage.setItem("echo_username", authUsername);

      // Clear IndexedDB stores except private keys
      if (indexedDB) {
        const dbs = await indexedDB.databases().catch(() => [] as IDBDatabaseInfo[]);
        for (const dbInfo of dbs) {
          if (!dbInfo.name) continue;
          const skipDb = dbInfo.name.toLowerCase().includes("key") ||
                         dbInfo.name.toLowerCase().includes("signal") ||
                         dbInfo.name.toLowerCase().includes("crypto");
          if (!skipDb) {
            await new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(dbInfo.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
            });
          }
        }
      }

      toast({ title: "Кэш очищен" });
    } catch {
      toast({ title: "Ошибка очистки", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const exportData = async () => {
    try {
      const token = localStorage.getItem("echo_session_token");
      const userId = localStorage.getItem("echo_user_id");
      const username = localStorage.getItem("echo_username");

      let chats: unknown[] = [];
      let profile: unknown = null;

      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        try {
          const [chatsRes, profileRes] = await Promise.all([
            fetch("/api/chats", { headers }),
            fetch("/api/users/me", { headers }),
          ]);
          if (chatsRes.ok) chats = await chatsRes.json() as unknown[];
          if (profileRes.ok) profile = await profileRes.json();
        } catch { /* continue with partial data */ }
      }

      const data = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        account: { userId, username, profile },
        chats,
        note: "Сообщения хранятся зашифрованными на сервере и недоступны в открытом виде.",
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `echo-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Данные экспортированы" });
    } catch {
      toast({ title: "Ошибка экспорта", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Данные и хранилище</span>
        <div className="w-14" />
      </div>

      <Section title="Автозагрузка по WiFi">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Фотографии</span>
          <Toggle on={autoDownload.wifi_photos} onChange={set("wifi_photos")} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Видео</span>
          <Toggle on={autoDownload.wifi_videos} onChange={set("wifi_videos")} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Документы</span>
          <Toggle on={autoDownload.wifi_docs} onChange={set("wifi_docs")} />
        </div>
      </Section>

      <Section title="Автозагрузка по мобильному интернету">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Фотографии</span>
          <Toggle on={autoDownload.mobile_photos} onChange={set("mobile_photos")} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Видео</span>
          <Toggle on={autoDownload.mobile_videos} onChange={set("mobile_videos")} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Документы</span>
          <Toggle on={autoDownload.mobile_docs} onChange={set("mobile_docs")} />
        </div>
      </Section>

      <Section title="Хранилище" footer="Очистка кэша не затрагивает сессию и настройки.">
        <div className="flex items-center px-4 py-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0 mr-3">
            <HardDrive className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <div className="text-[16px]">Локальный кэш</div>
            <div className="text-[13px] text-muted-foreground">Занято: {cacheSize}</div>
          </div>
          <button
            onClick={clearCache}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[14px] font-medium disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {clearing ? "..." : "Очистить"}
          </button>
        </div>
      </Section>

      <Section title="Экспорт данных" footer="Экспорт содержит профиль и список чатов. Сообщения хранятся зашифрованными и не включаются.">
        <button
          onClick={exportData}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[16px] text-primary">Скачать мои данные</div>
            <div className="text-[13px] text-muted-foreground">JSON-архив метаданных аккаунта</div>
          </div>
        </button>
      </Section>

      <div className="h-8" />
    </div>
  );
}
