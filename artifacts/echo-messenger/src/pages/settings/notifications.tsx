import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useGetMe, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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
      <div className="glass divide-y divide-border/50">{children}</div>
      {footer && <div className="px-4 pt-2 pb-1 text-[13px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-[16px]">{label}</div>
        {sub && <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <Toggle on={value} onChange={onChange} />
    </div>
  );
}

type NotifSettings = {
  messages: boolean;
  groups: boolean;
  channels: boolean;
  calls: boolean;
  sound: boolean;
  vibration: boolean;
  preview: boolean;
  badge: boolean;
  loginAlerts: boolean;
  securityAlerts: boolean;
};

const DEFAULTS: NotifSettings = {
  messages: true, groups: true, channels: false, calls: true,
  sound: true, vibration: true, preview: true, badge: true,
  loginAlerts: true, securityAlerts: true,
};

export function NotificationsSettings() {
  const [, navigate] = useLocation();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const [s, setS] = useState<NotifSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (me?.settings) {
      const saved = (me.settings as Record<string, unknown>).notifications as Partial<NotifSettings> | undefined;
      if (saved) setS({ ...DEFAULTS, ...saved });
    }
  }, [me]);

  const set = (k: keyof NotifSettings) => (v: boolean) => {
    setS(p => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = () => {
    const existingSettings = (me?.settings as Record<string, unknown>) ?? {};
    updateSettings.mutate(
      { data: { settings: { ...existingSettings, notifications: s } as never } },
      {
        onSuccess: () => { toast({ title: "Настройки сохранены" }); setDirty(false); },
        onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Уведомления</span>
        {dirty ? (
          <button onClick={save} disabled={updateSettings.isPending} className="text-primary text-[17px] font-semibold disabled:opacity-50">
            {updateSettings.isPending ? "..." : "Сохранить"}
          </button>
        ) : <div className="w-20" />}
      </div>

      <Section title="Личные сообщения">
        <ToggleRow label="Уведомления" value={s.messages} onChange={set("messages")} />
        <ToggleRow label="Предпросмотр" sub="Показывать фрагмент сообщения" value={s.preview} onChange={set("preview")} />
      </Section>

      <Section title="Группы">
        <ToggleRow label="Уведомления о сообщениях" value={s.groups} onChange={set("groups")} />
      </Section>

      <Section title="Каналы">
        <ToggleRow label="Уведомления" value={s.channels} onChange={set("channels")} />
      </Section>

      <Section title="Звонки">
        <ToggleRow label="Входящие звонки" value={s.calls} onChange={set("calls")} />
      </Section>

      <Section title="Общие">
        <ToggleRow label="Звук" value={s.sound} onChange={set("sound")} />
        <ToggleRow label="Вибрация" value={s.vibration} onChange={set("vibration")} />
        <ToggleRow label="Значок непрочитанных" sub="Счётчик на иконке приложения" value={s.badge} onChange={set("badge")} />
      </Section>

      <Section title="Системные" footer="Уведомления безопасности рекомендуется оставить включёнными.">
        <ToggleRow label="Новый вход в аккаунт" value={s.loginAlerts} onChange={set("loginAlerts")} />
        <ToggleRow label="Уведомления безопасности" value={s.securityAlerts} onChange={set("securityAlerts")} />
      </Section>

      <div className="h-8" />
    </div>
  );
}
