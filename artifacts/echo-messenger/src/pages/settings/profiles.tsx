import { useState } from "react";
import { ArrowLeft, Plus, User, Shield, ChevronRight, Check } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEchoAuth } from "@/lib/auth-context";

interface Profile {
  id: number;
  username: string;
  label: string;
  color: string;
  active: boolean;
}

export function ProfilesSettings() {
  const [, navigate] = useLocation();
  const { username } = useEchoAuth();
  const [profiles, setProfiles] = useState<Profile[]>([
    { id: 1, username: username ?? "you", label: "Основной", color: "bg-[#65aadd]", active: true },
    { id: 2, username: "shadow_" + (username ?? "anon"), label: "Второй профиль", color: "bg-[#a695e7]", active: false },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function switchProfile(id: number) {
    setProfiles(ps => ps.map(p => ({ ...p, active: p.id === id })));
  }

  function addProfile() {
    if (!newLabel.trim()) return;
    setProfiles(ps => [
      ...ps.map(p => ({ ...p, active: false })),
      {
        id: Date.now(),
        username: newLabel.toLowerCase().replace(/\s+/g, "_"),
        label: newLabel,
        color: ["bg-[#7bc862]","bg-[#ee7aae]","bg-[#faa774]"][ps.length % 3],
        active: true,
      },
    ]);
    setNewLabel("");
    setShowAdd(false);
  }

  const COLORS = ["bg-[#65aadd]", "bg-[#a695e7]", "bg-[#7bc862]", "bg-[#ee7aae]", "bg-[#faa774]", "bg-[#e17076]"];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={() => navigate("/settings")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold flex-1">Мои профили</h1>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-primary"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Info banner */}
        <div className="mx-4 mb-4 mt-1 bg-primary/10 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Несколько профилей позволяют использовать разные личности в ECHO. Каждый профиль полностью изолирован с отдельными ключами и историей.
          </p>
        </div>

        {/* Add profile form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-3 overflow-hidden"
            >
              <div className="bg-card rounded-2xl border border-border px-4 py-3">
                <div className="text-[14px] font-semibold mb-2">Новый профиль</div>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addProfile()}
                  placeholder="Название профиля..."
                  className="w-full bg-muted rounded-xl px-3 py-2 text-[14px] outline-none mb-3"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-[13px] text-muted-foreground hover:bg-muted">
                    Отмена
                  </button>
                  <button
                    onClick={addProfile}
                    disabled={!newLabel.trim()}
                    className="px-4 py-1.5 rounded-lg text-[13px] bg-primary text-white font-medium disabled:opacity-50"
                  >
                    Создать
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile list */}
        <div className="mx-4">
          <div className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Профили ({profiles.length}/3)
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {profiles.map((profile, i) => (
              <div key={profile.id}>
                {i > 0 && <div className="h-px bg-border mx-4" />}
                <button
                  onClick={() => switchProfile(profile.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-[16px] shrink-0", profile.color)}>
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium flex items-center gap-2">
                      @{profile.username}
                      {profile.active && (
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-semibold">активный</span>
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground">{profile.label}</div>
                  </div>
                  {profile.active ? (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {profiles.length < 3 && (
          <button
            onClick={() => setShowAdd(true)}
            className="mx-4 mt-3 w-[calc(100%-32px)] flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-[14px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Добавить профиль
          </button>
        )}

        <p className="text-[12px] text-muted-foreground text-center mt-4 px-4">
          Максимум 3 профиля на одно устройство
        </p>
      </div>
    </div>
  );
}
