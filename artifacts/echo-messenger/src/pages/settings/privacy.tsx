import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
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
      <div className="bg-card divide-y divide-border/50">{children}</div>
      {footer && <div className="px-4 pt-2 pb-1 text-[13px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

type Visibility = "all" | "contacts" | "nobody";
type PrivacySettings = {
  lastSeen: Visibility;
  profilePhoto: Visibility;
  bio: Visibility;
  calls: Visibility;
  messages: Visibility;
  addToGroups: Visibility;
  readReceipts: boolean;
  incognito: boolean;
};

const DEFAULTS: PrivacySettings = {
  lastSeen: "all", profilePhoto: "all", bio: "all", calls: "all",
  messages: "all", addToGroups: "all", readReceipts: true, incognito: false,
};

const VIS_LABELS: Record<Visibility, string> = { all: "Все", contacts: "Контакты", nobody: "Никто" };
const VIS_ORDER: Visibility[] = ["all", "contacts", "nobody"];

function VisRow({ label, value, onChange }: { label: string; value: Visibility; onChange: (v: Visibility) => void }) {
  const next = () => {
    const idx = VIS_ORDER.indexOf(value);
    onChange(VIS_ORDER[(idx + 1) % VIS_ORDER.length]);
  };
  return (
    <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={next}>
      <span className="flex-1 text-[16px]">{label}</span>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-[14px]">{VIS_LABELS[value]}</span>
        <ChevronRight className="h-4 w-4 opacity-40" />
      </div>
    </div>
  );
}

export function PrivacySettings() {
  const [, navigate] = useLocation();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const [s, setS] = useState<PrivacySettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (me?.settings) {
      const saved = (me.settings as Record<string, unknown>).privacy as Partial<PrivacySettings> | undefined;
      if (saved) setS({ ...DEFAULTS, ...saved });
    }
  }, [me]);

  const setVis = (k: keyof Pick<PrivacySettings, "lastSeen"|"profilePhoto"|"bio"|"calls"|"messages"|"addToGroups">) =>
    (v: Visibility) => { setS(p => ({ ...p, [k]: v })); setDirty(true); };

  const setToggle = (k: keyof Pick<PrivacySettings, "readReceipts"|"incognito">) =>
    (v: boolean) => { setS(p => ({ ...p, [k]: v })); setDirty(true); };

  const save = () => {
    const existingSettings = (me?.settings as Record<string, unknown>) ?? {};
    updateSettings.mutate(
      { data: { settings: { ...existingSettings, privacy: s } as never } },
      {
        onSuccess: () => { toast({ title: "Настройки сохранены" }); setDirty(false); },
        onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Конфиденциальность</span>
        {dirty ? (
          <button onClick={save} disabled={updateSettings.isPending} className="text-primary text-[17px] font-semibold disabled:opacity-50">
            {updateSettings.isPending ? "..." : "Сохранить"}
          </button>
        ) : <div className="w-20" />}
      </div>

      <Section title="Кто может видеть">
        <VisRow label="Последний вход" value={s.lastSeen} onChange={setVis("lastSeen")} />
        <VisRow label="Фото профиля" value={s.profilePhoto} onChange={setVis("profilePhoto")} />
        <VisRow label="Биографию" value={s.bio} onChange={setVis("bio")} />
      </Section>

      <Section title="Кто может" footer="Нажмите на строку для переключения между: Все → Контакты → Никто">
        <VisRow label="Писать мне" value={s.messages} onChange={setVis("messages")} />
        <VisRow label="Звонить мне" value={s.calls} onChange={setVis("calls")} />
        <VisRow label="Добавлять в группы" value={s.addToGroups} onChange={setVis("addToGroups")} />
      </Section>

      <Section title="Сообщения">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="text-[16px]">Подтверждения прочтения</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Синие галочки ✓✓</div>
          </div>
          <Toggle on={s.readReceipts} onChange={setToggle("readReceipts")} />
        </div>
      </Section>

      <Section title="Режим инкогнито" footer="В режиме инкогнито ваш статус 'в сети' и время последнего входа скрыты от всех.">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="text-[16px]">Скрыть онлайн-статус</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Выглядеть офлайн для всех</div>
          </div>
          <Toggle on={s.incognito} onChange={setToggle("incognito")} />
        </div>
      </Section>

      <Section title="Безопасность">
        <div
          className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30"
          onClick={() => navigate("/settings/security")}
        >
          <span className="flex-1 text-[16px]">Активные сессии</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </div>
        <div
          className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30"
          onClick={() => navigate("/settings/security")}
        >
          <span className="flex-1 text-[16px] text-[#ff3b30]">Уничтожить аккаунт</span>
          <ChevronRight className="h-4 w-4 opacity-40 text-[#ff3b30]" />
        </div>
      </Section>

      <div className="h-8" />
    </div>
  );
}
