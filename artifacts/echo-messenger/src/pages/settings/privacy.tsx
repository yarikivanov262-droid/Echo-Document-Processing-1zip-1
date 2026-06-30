import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
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
    <div className="mb-6">
      <div className="px-4 pb-1.5 pt-4">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">{title}</span>
      </div>
      <div className="bg-card divide-y divide-border/50">{children}</div>
      {footer && <div className="px-4 pt-2 text-[13px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function PrivacySettings() {
  const [, navigate] = useLocation();
  const [twoFA, setTwoFA] = useState(false);
  const [autoDelete, setAutoDelete] = useState(false);

  const navRow = (label: string, value: string) => (
    <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/settings/security")}>
      <span className="flex-1 text-[16px]">{label}</span>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-[14px]">{value}</span>
        <ChevronRight className="h-4 w-4 opacity-40" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Конфиденциальность</span>
        <div className="w-14" />
      </div>

      <Section title="Кто может видеть">
        {navRow("Последний вход", "Все")}
        {navRow("Фото профиля", "Все")}
        {navRow("Биография", "Все")}
        {navRow("Звонки", "Все")}
        {navRow("Сообщения", "Все")}
      </Section>

      <Section title="Безопасность" footer="Двухфакторная аутентификация добавляет дополнительный уровень защиты к вашему аккаунту.">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Двухфакторная аутентификация</span>
          <Toggle on={twoFA} onChange={setTwoFA} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[16px]">Самоуничтожение сообщений</span>
          <Toggle on={autoDelete} onChange={setAutoDelete} />
        </div>
      </Section>

      <Section title="Устройства">
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/settings/security")}>
          <span className="flex-1 text-[16px]">Активные сессии</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </div>
      </Section>

      <Section title="Опасная зона">
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/settings/security")}>
          <span className="flex-1 text-[16px] text-[#ff3b30]">Уничтожить аккаунт</span>
          <ChevronRight className="h-4 w-4 opacity-40 text-[#ff3b30]" />
        </div>
      </Section>
    </div>
  );
}
