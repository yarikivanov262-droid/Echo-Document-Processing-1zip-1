import { useLocation } from "wouter";
import { Check } from "lucide-react";

const LANGS = [
  { code: "ru", label: "Русский", native: "Русский" },
  { code: "en", label: "Английский", native: "English" },
  { code: "uk", label: "Украинский", native: "Українська" },
  { code: "de", label: "Немецкий", native: "Deutsch" },
  { code: "fr", label: "Французский", native: "Français" },
  { code: "es", label: "Испанский", native: "Español" },
  { code: "zh", label: "Китайский", native: "中文" },
  { code: "ar", label: "Арабский", native: "العربية" },
];

export function LanguageSettings() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Язык</span>
        <div className="w-14" />
      </div>

      <div className="px-4 py-3 text-[13px] text-muted-foreground">
        Выберите язык интерфейса
      </div>

      <div className="glass divide-y divide-border/50">
        {LANGS.map((l) => (
          <div key={l.code} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex-1">
              <div className="text-[16px]">{l.native}</div>
              <div className="text-[13px] text-muted-foreground">{l.label}</div>
            </div>
            {l.code === "ru" && <Check className="h-5 w-5 text-primary shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
