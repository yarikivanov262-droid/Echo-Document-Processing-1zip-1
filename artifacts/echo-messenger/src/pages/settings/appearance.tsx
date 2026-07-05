import { useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_OPTIONS, applyAccent, getStoredAccentId } from "@/lib/accent-theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="px-4 pb-1.5 pt-4">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">{title}</span>
      </div>
      <div className="bg-card divide-y divide-border/50">{children}</div>
    </div>
  );
}

const themes = [
  { id: "dark", label: "Тёмная", preview: "bg-[#1c1c1e]" },
  { id: "light", label: "Светлая", preview: "bg-[#f2f2f7]" },
  { id: "system", label: "Системная", preview: "bg-gradient-to-r from-[#1c1c1e] to-[#f2f2f7]" },
];

const fontSizes = [
  { id: "sm", label: "Мелкий" },
  { id: "md", label: "Средний" },
  { id: "lg", label: "Крупный" },
];

export function AppearanceSettings() {
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const [accentId, setAccentId] = useState(getStoredAccentId());

  const handleAccentSelect = (id: string) => {
    applyAccent(id);
    setAccentId(id);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Оформление</span>
        <div className="w-14" />
      </div>

      <Section title="Тема">
        {themes.map((t, i) => (
          <div
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
              i < themes.length - 1 && "border-b border-border/50"
            )}
          >
            <div className={cn("h-8 w-8 rounded-full border border-border/60 shrink-0", t.preview)} />
            <span className="flex-1 text-[16px]">{t.label}</span>
            {(theme === t.id || (!theme && t.id === "system")) && (
              <Check className="h-5 w-5 text-primary shrink-0" />
            )}
          </div>
        ))}
      </Section>

      <Section title="Цвет акцента">
        <div className="flex flex-wrap gap-3 px-4 py-3">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAccentSelect(a.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-card transition-all"
                style={{
                  backgroundColor: a.swatch,
                  '--tw-ring-color': accentId === a.id ? a.swatch : 'transparent',
                } as React.CSSProperties}
              >
                {accentId === a.id && <Check className="h-5 w-5 text-white" />}
              </div>
              <span className="text-[11px] text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Размер текста">
        {fontSizes.map((f, i) => (
          <div
            key={f.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
              i < fontSizes.length - 1 && "border-b border-border/50"
            )}
          >
            <span className="flex-1 text-[16px]">{f.label}</span>
            {f.id === "md" && <Check className="h-5 w-5 text-primary shrink-0" />}
          </div>
        ))}
      </Section>

      <Section title="Фоновое изображение">
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30">
          <span className="flex-1 text-[16px]">Изменить фон чата</span>
          <span className="text-muted-foreground/60">›</span>
        </div>
      </Section>
    </div>
  );
}
