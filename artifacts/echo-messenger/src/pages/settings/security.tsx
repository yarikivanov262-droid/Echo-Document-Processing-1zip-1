import { useState } from "react";
import { ShieldAlert, Smartphone, Trash2, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetSessions, useTerminateSession, useDeleteAccount } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-[280px] overflow-hidden shadow-2xl">
        <div className="px-6 pt-6 pb-4 text-center">
          <h3 className="font-bold text-[17px] mb-2">{title}</h3>
          <p className="text-[14px] text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="border-t border-border">
          <button
            onClick={onConfirm}
            className={cn(
              "w-full py-3.5 text-[17px] font-semibold border-b border-border",
              danger ? "text-[#ff3b30]" : "text-primary"
            )}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 text-[17px] text-foreground"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export function SecuritySettings() {
  const { data: sessions, refetch } = useGetSessions();
  const terminateMutation = useTerminateSession();
  const deleteMutation = useDeleteAccount();
  const { logout } = useEchoAuth();
  const { toast } = useToast();
  const [burnOpen, setBurnOpen] = useState(false);
  const [burnSeed, setBurnSeed] = useState("");
  const [terminateId, setTerminateId] = useState<string | null>(null);

  const handleTerminate = (deviceId: string) => {
    terminateMutation.mutate({ deviceId }, {
      onSuccess: () => {
        toast({ title: "Сессия завершена" });
        refetch();
        setTerminateId(null);
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось завершить сессию", variant: "destructive" });
        setTerminateId(null);
      },
    });
  };

  const handleBurnAccount = () => {
    if (!burnSeed.trim()) {
      toast({ title: "Введите seed-фразу", description: "Необходима seed-фраза для подтверждения", variant: "destructive" });
      return;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(burnSeed.trim().toLowerCase());
    void crypto.subtle.digest("SHA-256", data).then((hash) => {
      const hashArray = Array.from(new Uint8Array(hash));
      const seedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      deleteMutation.mutate({ data: { seedHash } }, {
        onSuccess: () => {
          toast({ title: "Аккаунт удалён", variant: "destructive" });
          logout();
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Не удалось удалить аккаунт. Проверьте seed-фразу.", variant: "destructive" });
          setBurnOpen(false);
        },
      });
    });
  };

  const displaySessions = sessions && sessions.length > 0 ? sessions : [];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <div />
        <h1 className="text-[17px] font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#ff3b30]" /> Безопасность
        </h1>
        <div />
      </div>

      <div className="p-4 space-y-4">
        {/* Active sessions */}
        <div>
          <div className="px-1 pb-2">
            <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Активные сессии</span>
          </div>
          <div className="rounded-[12px] overflow-hidden glass divide-y divide-border/60">
            {displaySessions.length === 0 && (
              <div className="px-4 py-4 text-[14px] text-muted-foreground text-center">
                Нет данных об активных сессиях
              </div>
            )}
            {displaySessions.map((s) => (
              <div key={s.deviceId} className={cn("flex items-center gap-3 px-4 py-3", s.isCurrent && "bg-primary/5")}>
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold truncate">{s.userAgent || "Unknown Device"}</span>
                    {s.isCurrent && (
                      <span className="text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full shrink-0">Текущая</span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {s.isCurrent ? "Активна сейчас" : `Последний вход: ${new Date(s.lastUsed).toLocaleDateString("ru")}`}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => setTerminateId(s.deviceId)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted shrink-0"
                  >
                    <X className="h-4 w-4 text-[#ff3b30]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy settings */}
        <div>
          <div className="px-1 pb-2">
            <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Конфиденциальность</span>
          </div>
          <div className="rounded-[12px] overflow-hidden glass divide-y divide-border/60">
            {[
              { label: "Последний вход", value: "Все" },
              { label: "Фото профиля", value: "Все" },
              { label: "Сообщения", value: "Все" },
              { label: "Звонки", value: "Все" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30">
                <span className="text-[15px]">{row.label}</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-[14px]">{row.value}</span>
                  <ChevronRight className="h-4 w-4 opacity-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <div className="px-1 pb-2">
            <span className="text-[13px] text-[#ff3b30] uppercase font-semibold tracking-wide">Опасная зона</span>
          </div>
          <div className="rounded-[12px] overflow-hidden glass">
            <div className="px-4 py-3 text-[13px] text-muted-foreground leading-relaxed border-b border-border/60">
              Уничтожение аккаунта безвозвратно удаляет все ключи, чаты и метаданные. Действие криптографически необратимо.
            </div>
            <button
              onClick={() => setBurnOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#ff3b30]/5"
            >
              <div className="h-8 w-8 rounded-[9px] flex items-center justify-center bg-[#ff3b30] shrink-0">
                <Trash2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-[16px] text-[#ff3b30]">Уничтожить аккаунт</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm: terminate session */}
      <ConfirmDialog
        open={!!terminateId}
        title="Завершить сессию?"
        message="Это устройство будет немедленно отключено."
        confirmLabel="Завершить"
        onConfirm={() => terminateId && handleTerminate(terminateId)}
        onCancel={() => setTerminateId(null)}
        danger
      />

      {/* Confirm: burn account */}
      {burnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl w-[300px] overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4 text-center">
              <h3 className="font-bold text-[17px] mb-2">Уничтожить аккаунт?</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
                Введите вашу seed-фразу для подтверждения. Все данные будут безвозвратно удалены.
              </p>
              <input
                type="text"
                value={burnSeed}
                onChange={e => setBurnSeed(e.target.value)}
                placeholder="Ваша seed-фраза..."
                className="w-full bg-muted rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-[#ff3b30]"
              />
            </div>
            <div className="border-t border-border">
              <button
                onClick={handleBurnAccount}
                disabled={deleteMutation.isPending}
                className="w-full py-3.5 text-[17px] font-semibold border-b border-border text-[#ff3b30] disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Удаляем..." : "Уничтожить"}
              </button>
              <button
                onClick={() => { setBurnOpen(false); setBurnSeed(""); }}
                className="w-full py-3.5 text-[17px] text-foreground"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
