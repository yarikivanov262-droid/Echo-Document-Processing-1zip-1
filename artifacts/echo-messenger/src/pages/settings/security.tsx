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
      <div className="bg-card rounded-2xl w-[280px] overflow-hidden shadow-2xl">
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
    deleteMutation.mutate({ data: { seedHash: "confirm-burn" } }, {
      onSuccess: () => {
        toast({ title: "Аккаунт удалён", variant: "destructive" });
        logout();
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось удалить аккаунт", variant: "destructive" });
        setBurnOpen(false);
      },
    });
  };

  const displaySessions = sessions && sessions.length > 0
    ? sessions
    : [{ deviceId: "current-device", isCurrent: true, lastUsed: new Date().toISOString(), userAgent: "Echo Web Client", createdAt: new Date().toISOString() }];

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
          <div className="rounded-[12px] overflow-hidden bg-card divide-y divide-border/60">
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
          <div className="rounded-[12px] overflow-hidden bg-card divide-y divide-border/60">
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
          <div className="rounded-[12px] overflow-hidden bg-card">
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
      <ConfirmDialog
        open={burnOpen}
        title="Уничтожить аккаунт?"
        message="Все данные будут безвозвратно удалены. Это действие нельзя отменить."
        confirmLabel={deleteMutation.isPending ? "Удаляем..." : "Уничтожить"}
        onConfirm={handleBurnAccount}
        onCancel={() => setBurnOpen(false)}
        danger
      />
    </div>
  );
}
