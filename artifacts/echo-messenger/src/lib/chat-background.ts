export interface BackgroundOption {
  id: string;
  label: string;
  preview: string;
  css: string;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "default", label: "Обычный", preview: "bg-background", css: "" },
  { id: "gradient1", label: "Закат", preview: "bg-gradient-to-br from-orange-400 to-pink-500", css: "linear-gradient(135deg, #f97316, #ec4899)" },
  { id: "gradient2", label: "Океан", preview: "bg-gradient-to-br from-blue-500 to-cyan-400", css: "linear-gradient(135deg, #3b82f6, #22d3ee)" },
  { id: "gradient3", label: "Лес", preview: "bg-gradient-to-br from-green-600 to-emerald-400", css: "linear-gradient(135deg, #16a34a, #34d399)" },
  { id: "gradient4", label: "Ночь", preview: "bg-gradient-to-br from-slate-800 to-indigo-900", css: "linear-gradient(135deg, #1e293b, #312e81)" },
  { id: "dots", label: "Точки", preview: "bg-neutral-800", css: "radial-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px)" },
];

const STORAGE_KEY = "echo_chat_bg";

export function getStoredBackgroundId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "default";
}

export function applyChatBackground(id: string) {
  const option = BACKGROUND_OPTIONS.find(b => b.id === id) ?? BACKGROUND_OPTIONS[0];
  const root = document.documentElement.style;
  if (!option.css) {
    root.removeProperty("--chat-bg-image");
    root.removeProperty("--chat-bg-size");
  } else if (option.id === "dots") {
    root.setProperty("--chat-bg-image", option.css);
    root.setProperty("--chat-bg-size", "16px 16px");
  } else {
    root.setProperty("--chat-bg-image", option.css);
    root.setProperty("--chat-bg-size", "auto");
  }
  localStorage.setItem(STORAGE_KEY, option.id);
}

export function initChatBackground() {
  applyChatBackground(getStoredBackgroundId());
}
