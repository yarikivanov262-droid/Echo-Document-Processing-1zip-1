import { useState } from "react";
import { HardDrive, Download, UploadCloud, CheckCircle, Key, Copy, Eye, EyeOff, FileUp } from "lucide-react";
import { useUploadBackup, useGetLatestBackup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function encryptData(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(12 + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), 12);
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(key: CryptoKey, b64: string): Promise<string> {
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

async function collectUserData(token: string): Promise<object> {
  const headers = { Authorization: `Bearer ${token}` };
  const [chatsRes, contactsRes] = await Promise.allSettled([
    fetch("/api/chats", { headers }),
    fetch("/api/contacts", { headers }),
  ]);

  const chats = chatsRes.status === "fulfilled" && chatsRes.value.ok ? await chatsRes.value.json() : [];
  const contacts = contactsRes.status === "fulfilled" && contactsRes.value.ok ? await contactsRes.value.json() : [];

  const messagesMap: Record<string, unknown[]> = {};
  if (Array.isArray(chats)) {
    await Promise.all(
      (chats as { id: number }[]).slice(0, 30).map(async (chat) => {
        try {
          const r = await fetch(`/api/messages?chatId=${chat.id}&limit=200`, { headers });
          if (r.ok) messagesMap[chat.id] = (await r.json()) as unknown[];
        } catch {
          // skip
        }
      })
    );
  }

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    chats,
    contacts,
    messages: messagesMap,
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupSettings() {
  const { data: latestBackup, isLoading, refetch } = useGetLatestBackup();
  const backupMutation = useUploadBackup();
  const { toast } = useToast();
  const { sessionToken, userId } = useEchoAuth();

  const [encKey, setEncKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const [restoreKey, setRestoreKey] = useState("");
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleBackup = async () => {
    if (!sessionToken) return;
    setCollecting(true);
    try {
      const data = await collectUserData(sessionToken);
      const key = await generateAesKey();
      const keyB64 = await exportKey(key);
      const encrypted = await encryptData(key, JSON.stringify(data));

      backupMutation.mutate(
        { data: { encryptedData: encrypted } },
        {
          onSuccess: () => {
            setEncKey(keyB64);
            setShowKey(true);
            toast({ title: "Резервная копия создана", description: "Сохраните ключ шифрования!" });
            void refetch();
          },
          onError: () => {
            toast({ title: "Ошибка", description: "Не удалось сохранить резервную копию", variant: "destructive" });
          },
        }
      );
    } catch {
      toast({ title: "Ошибка сбора данных", variant: "destructive" });
    } finally {
      setCollecting(false);
    }
  };

  const handleDownloadKey = () => {
    if (!encKey) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(encKey, `echo-backup-key-${date}.txt`, "text/plain");
  };

  const handleRestore = async () => {
    if (!latestBackup?.encryptedData || !restoreKey.trim()) return;
    setRestoring(true);
    try {
      const key = await importKey(restoreKey.trim());
      const plain = await decryptData(key, latestBackup.encryptedData);
      const data = JSON.parse(plain) as { exportedAt?: string };
      const date = data.exportedAt ? new Date(data.exportedAt).toLocaleString("ru") : "неизвестно";
      downloadFile(JSON.stringify(data, null, 2), `echo-restore-${Date.now()}.json`, "application/json");
      toast({ title: "Данные расшифрованы", description: `Резервная копия от ${date}` });
      setShowRestoreInput(false);
      setRestoreKey("");
    } catch {
      toast({ title: "Неверный ключ", description: "Не удалось расшифровать резервную копию", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const copyKey = () => {
    if (encKey) {
      void navigator.clipboard.writeText(encKey);
      toast({ title: "Ключ скопирован" });
    }
  };

  const isPending = backupMutation.isPending || collecting;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-center px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <h1 className="text-[17px] font-semibold">Шифрованный архив</h1>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="rounded-[12px] glass overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-5">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HardDrive className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[17px] font-bold">Сетевой архив</div>
              <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                Чаты, сообщения и контакты шифруются AES-256-GCM прямо на устройстве. Ключ знаете только вы.
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border/60">
            {isLoading ? (
              <div className="animate-pulse h-5 bg-muted rounded w-1/2" />
            ) : latestBackup ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#34c759]" />
                    <div>
                      <div className="text-[14px] font-medium">Последний архив</div>
                      <div className="text-[12px] text-muted-foreground">
                        {new Date(latestBackup.createdAt).toLocaleString("ru")}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRestoreInput((v) => !v)}
                    className="flex items-center gap-1.5 text-primary text-[14px] hover:opacity-70"
                  >
                    <Download className="h-4 w-4" />
                    Восстановить
                  </button>
                </div>

                {showRestoreInput && (
                  <div className="pt-2 space-y-2">
                    <div className="text-[12px] text-muted-foreground">
                      Введите ключ шифрования (из файла echo-backup-key-*.txt):
                    </div>
                    <input
                      className="w-full bg-background rounded-[10px] px-3 py-2 text-[13px] font-mono outline-none border border-border/60 focus:border-primary"
                      placeholder="Ключ AES-256 (base64)..."
                      value={restoreKey}
                      onChange={(e) => setRestoreKey(e.target.value)}
                    />
                    <button
                      onClick={() => void handleRestore()}
                      disabled={!restoreKey.trim() || restoring}
                      className={cn(
                        "w-full py-2 rounded-[10px] bg-primary text-white text-[14px] font-medium transition-opacity",
                        (!restoreKey.trim() || restoring) && "opacity-50"
                      )}
                    >
                      {restoring ? "Расшифровка..." : "Расшифровать и скачать"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-muted-foreground">Нет сохранённых архивов</div>
            )}
          </div>
        </div>

        {encKey && (
          <div className="rounded-[12px] bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Key className="h-4 w-4 shrink-0" />
              <span className="text-[14px] font-semibold">Сохраните ключ шифрования!</span>
            </div>
            <div className="text-[12px] text-muted-foreground leading-relaxed">
              Без этого ключа невозможно расшифровать резервную копию. Сервер ключа не знает.
            </div>
            <div className="bg-background rounded-[8px] p-3 flex items-center gap-2">
              <span className={cn("flex-1 font-mono text-[11px] break-all", !showKey && "blur-sm select-none")}>
                {encKey}
              </span>
              <button onClick={() => setShowKey((v) => !v)} className="text-muted-foreground shrink-0">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyKey}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] glass text-[14px]"
              >
                <Copy className="h-3.5 w-3.5" />
                Скопировать
              </button>
              <button
                onClick={handleDownloadKey}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] glass text-[14px]"
              >
                <FileUp className="h-3.5 w-3.5" />
                Скачать файл
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => void handleBackup()}
          disabled={isPending}
          className={cn(
            "w-full py-3.5 rounded-[12px] flex items-center justify-center gap-2 text-[16px] font-medium transition-opacity",
            isPending ? "opacity-50" : "hover:opacity-90",
            "bg-primary text-white"
          )}
        >
          <UploadCloud className="h-5 w-5" />
          {collecting ? "Сбор данных..." : isPending ? "Загрузка..." : "Создать резервную копию"}
        </button>

        <div className="rounded-[12px] overflow-hidden glass divide-y divide-border/60">
          {[
            { label: "Шифрование", value: "AES-256-GCM" },
            { label: "Ключ", value: "Только у вас" },
            { label: "Данные", value: "Чаты, сообщения, контакты" },
            { label: "Автоархив", value: "Выкл." },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px]">{row.label}</span>
              <span className="text-[14px] text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
