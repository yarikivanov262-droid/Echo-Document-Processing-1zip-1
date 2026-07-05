export interface AccentOption {
  id: string;
  label: string;
  hsl: string;
  hslTo: string;
  swatch: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "coral", label: "Коралловый", hsl: "4 90% 58%", hslTo: "14 90% 62%", swatch: "#EF3B24" },
  { id: "sunset", label: "Закат", hsl: "24 92% 58%", hslTo: "38 92% 60%", swatch: "#F2822D" },
  { id: "berry", label: "Ягодный", hsl: "340 78% 56%", hslTo: "350 78% 62%", swatch: "#E23A78" },
  { id: "violet", label: "Фиолетовый", hsl: "262 60% 58%", hslTo: "272 60% 64%", swatch: "#7C5CD1" },
  { id: "azure", label: "Голубой", hsl: "205 80% 52%", hslTo: "195 80% 56%", swatch: "#1E9BE0" },
  { id: "mint", label: "Мятный", hsl: "160 60% 42%", hslTo: "150 55% 48%", swatch: "#1FA97A" },
];

const STORAGE_KEY = "echo_accent";

export function getStoredAccentId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "coral";
}

export function applyAccent(id: string) {
  const option = ACCENT_OPTIONS.find(a => a.id === id) ?? ACCENT_OPTIONS[0];
  const root = document.documentElement.style;
  root.setProperty("--primary", option.hsl);
  root.setProperty("--accent", option.hsl);
  root.setProperty("--ring", option.hsl);
  root.setProperty("--sidebar-primary", option.hsl);
  root.setProperty("--sidebar-ring", option.hsl);
  root.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${option.hsl}), hsl(${option.hslTo}))`);
  localStorage.setItem(STORAGE_KEY, option.id);
}

export function initAccent() {
  applyAccent(getStoredAccentId());
}
