export type FontSizeId = "sm" | "md" | "lg";

const SCALES: Record<FontSizeId, number> = { sm: 0.9, md: 1, lg: 1.15 };
const STORAGE_KEY = "echo_font_size";

export function getStoredFontSize(): FontSizeId {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "sm" || raw === "md" || raw === "lg" ? raw : "md";
}

export function applyFontSize(id: FontSizeId) {
  document.documentElement.style.setProperty("--chat-font-scale", String(SCALES[id]));
  localStorage.setItem(STORAGE_KEY, id);
}

export function initFontSize() {
  applyFontSize(getStoredFontSize());
}
