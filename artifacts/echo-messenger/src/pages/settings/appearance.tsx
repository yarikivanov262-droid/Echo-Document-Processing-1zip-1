import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
