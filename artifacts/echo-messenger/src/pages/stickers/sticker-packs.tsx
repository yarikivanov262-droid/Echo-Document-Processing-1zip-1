import { useState } from "react";
import { ArrowLeft, Search, Plus, Download, Trash2, Star } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const OFFICIAL_PACKS = [
  {
    id: 1,
    title: "ECHO Classic",
    author: "ECHO Team",
    stickers: ["😀","😂","😍","🤔","👍","❤️","🔥","💯","🎉","😢","😮","🙏","😎","🤝","✌️","🫂"],
    installed: true,
    count: 64,
    animated: false,
  },
  {
    id: 2,
    title: "Anim Faces",
    author: "ECHO Team",
    stickers: ["🥳","🥹","😤","🫡","🤯","😵","🥴","🫠","😶‍🌫️","🤭","🫣","🤗","😬","🙃","😏","🫤"],
    installed: false,
    count: 32,
    animated: true,
  },
  {
    id: 3,
    title: "Animals",
    author: "EmojiLab",
    stickers: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔"],
    installed: false,
    count: 48,
    animated: false,
  },
  {
    id: 4,
    title: "Space Vibes",
    author: "CosmicArt",
    stickers: ["🚀","🌌","⭐","🌙","☄️","🛸","👽","🌍","🌠","🔭","🪐","💫","🌟","✨","🌌","🛰️"],
    installed: true,
    count: 24,
    animated: true,
  },
  {
    id: 5,
    title: "Food & Drinks",
    author: "FoodieStudio",
    stickers: ["🍕","🍔","🌮","🍜","🍣","🍰","☕","🧁","🍩","🥑","🍎","🥗","🍱","🍦","🧃","🍇"],
    installed: false,
    count: 56,
    animated: false,
  },
  {
    id: 6,
    title: "Memes Pack",
    author: "Community",
    stickers: ["😂","🗿","💀","🤡","👺","🤌","💅","🫵","🧌","🪬","🫶","🤙","🖕","☝️","👈","👉"],
    installed: false,
    count: 30,
    animated: false,
  },
];

export function StickerPacks() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [packs, setPacks] = useState(OFFICIAL_PACKS);
  const [tab, setTab] = useState<"installed" | "all">("installed");

  const filtered = packs.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.author.toLowerCase().includes(search.toLowerCase())
  );

  const displayed = tab === "installed"
    ? filtered.filter(p => p.installed)
    : filtered;

  function toggleInstall(id: number) {
    setPacks(ps => ps.map(p => p.id === id ? { ...p, installed: !p.installed } : p));
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={() => navigate("/settings")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold flex-1">Стикерпаки</h1>
        <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-primary">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 h-9">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск стикерпаков..."
            className="bg-transparent flex-1 text-[14px] outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 shrink-0">
        {(["installed", "all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-[14px] font-medium border-b-2 transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            {t === "installed" ? "Установленные" : "Все паки"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">🎭</div>
              <div className="text-[14px]">
                {tab === "installed" ? "Нет установленных стикеров" : "Ничего не найдено"}
              </div>
            </div>
          ) : (
            displayed.map(pack => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                {/* Preview */}
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                  <div className="grid grid-cols-2 gap-0.5 p-1">
                    {pack.stickers.slice(0, 4).map((s, i) => (
                      <span key={i} className="text-lg leading-none">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold truncate">{pack.title}</span>
                    {pack.animated && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Анимированные</span>
                    )}
                  </div>
                  <div className="text-[13px] text-muted-foreground">{pack.author} · {pack.count} стикеров</div>
                  {/* Sticker preview row */}
                  <div className="flex gap-1 mt-1.5">
                    {pack.stickers.slice(0, 8).map((s, i) => (
                      <span key={i} className="text-xl">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => toggleInstall(pack.id)}
                  className={cn(
                    "shrink-0 h-8 px-3 rounded-full text-[13px] font-medium transition-colors",
                    pack.installed
                      ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {pack.installed ? <Trash2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {tab === "installed" && (
        <div className="shrink-0 px-4 py-3 border-t border-border text-[12px] text-muted-foreground text-center">
          {packs.filter(p => p.installed).length} из {packs.length} установлено
        </div>
      )}
    </div>
  );
}
