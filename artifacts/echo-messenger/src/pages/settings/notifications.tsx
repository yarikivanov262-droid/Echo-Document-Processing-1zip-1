import { useState } from "react";
import { useLocation } from "wouter";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {title && (
        <div className="px-4 pb-1.5 pt-4">
          <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">{title}</span>
        </div>
      )}
      <div className="bg-card divide-y divide-border/50">
        {children}
      </div>
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

export function NotificationsSettings() {
  const [, navigate] = useLocation();
  const [s, setS] = useState({
    messages: true,
    groups: true,
    channels: false,
    calls: true,
    sound: true,
    vibration: true,
    preview: true,
    badge: true,
  });
  const set = (k: keyof typeof s) => (v: boolean) => setS(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Уведомления</span>
        <div className="w-16" />
      </div>

      <Section title="Личные сообщения">
        <ToggleRow label="Уведомления" value={s.messages} onChange={set("messages")} />
        <ToggleRow label="Предпросмотр текста" sub="Показывать фрагмент сообщения" value={s.preview} onChange={set("preview")} />
      </Section>

      <Section title="Группы">
        <ToggleRow label="Уведомления" value={s.groups} onChange={set("groups")} />
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
        <ToggleRow label="Значок непрочитанных" sub="Показывать счётчик на иконке" value={s.badge} onChange={set("badge")} />
      </Section>
    </div>
  );
}
