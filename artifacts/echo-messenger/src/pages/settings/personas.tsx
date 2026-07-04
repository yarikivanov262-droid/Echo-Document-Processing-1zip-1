import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Users, Check, LogIn, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Persona {
  label: string;
  username: string;
  userId: number;
  sessionToken: string;
}

const PERSONAS_KEY = "echo_personas";

function loadPersonas(): Persona[] {
  try {
    const raw = localStorage.getItem(PERSONAS_KEY);
    return raw ? (JSON.parse(raw) as Persona[]) : [];
  } catch {
    return [];
  }
}

function savePersonas(personas: Persona[]) {
  localStorage.setItem(PERSONAS_KEY, JSON.stringify(personas));
}

function generateRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashSeed(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/gi, "")
    .replace(/[а-яё]/gi, "x")
    .slice(0, 12) || "persona";
}

export function PersonasSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { userId, login } = useEchoAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const list = loadPersonas();
    setPersonas(list);
  }, []);

  const currentPersonaIdx = personas.findIndex((p) => p.userId === userId);

  async function handleCreate() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const personaSeed = generateRandomHex(32);
      const seedHash = await hashSeed(personaSeed);
      const suffix = generateRandomHex(3);
      const username = `${sanitizeLabel(trimmed)}${suffix}`;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          seedHash,
          publicIdentityKey: generateRandomHex(32),
          publicSignedPrekey: null,
          publicOneTimePrekeys: null,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Ошибка регистрации");
      }

      const data = (await res.json()) as { userId: number; username: string; sessionToken: string };

      const newPersona: Persona = {
        label: trimmed,
        username: data.username,
        userId: data.userId,
        sessionToken: data.sessionToken,
      };

      const updated = [...personas, newPersona];
      savePersonas(updated);
      setPersonas(updated);
      setLabel("");
      setShowCreate(false);
      toast({ title: `Личность «${trimmed}» создана`, description: `@${data.username}` });
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать личность",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  function handleSwitch(persona: Persona) {
    if (persona.userId === userId) return;
    login(persona.sessionToken, persona.userId, persona.username);
    toast({ title: `Переключено на «${persona.label}»`, description: `@${persona.username}` });
    setLocation("/chats");
  }

  function handleDelete(idx: number) {
    const persona = personas[idx]!;
    if (persona.userId === userId) {
      toast({ title: "Нельзя удалить активную личность", variant: "destructive" });
      return;
    }
    const updated = personas.filter((_, i) => i !== idx);
    savePersonas(updated);
    setPersonas(updated);
    toast({ title: `«${persona.label}» удалена` });
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => setLocation("/settings")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">Псевдонимы</span>
        <button className="text-primary" onClick={() => setShowCreate(true)}>
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-card rounded-[12px] p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="text-[15px] font-semibold">Несколько личностей</div>
              <div className="text-[13px] text-muted-foreground leading-relaxed">
                Создавай независимые аккаунты под одной сессией. Переключай одним касанием.
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-card rounded-[12px] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold">Новая личность</span>
                <button onClick={() => { setShowCreate(false); setLabel(""); }}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <input
                className="w-full bg-background rounded-[10px] px-3 py-2.5 text-[15px] outline-none border border-border/60 focus:border-primary"
                placeholder='Метка, например "Рабочий"'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={32}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
                autoFocus
              />
              <button
                onClick={() => void handleCreate()}
                disabled={!label.trim() || creating}
                className={cn(
                  "w-full py-2.5 rounded-[10px] bg-primary text-white text-[15px] font-medium transition-opacity",
                  (!label.trim() || creating) && "opacity-50"
                )}
              >
                {creating ? "Создание..." : "Создать"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {personas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div className="text-[15px]">Нет псевдонимов</div>
            <div className="text-[13px] mt-1">Нажмите + чтобы создать новую личность</div>
          </div>
        ) : (
          <div className="space-y-2">
            {personas.map((p, idx) => {
              const isActive = p.userId === userId;
              return (
                <motion.div
                  key={p.userId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "bg-card rounded-[12px] px-4 py-3 flex items-center gap-3",
                    isActive && "border border-primary/40"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0",
                      isActive ? "bg-primary text-white" : "bg-primary/20 text-primary"
                    )}
                  >
                    {p.label[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium flex items-center gap-1.5">
                      {p.label}
                      {isActive && (
                        <span className="text-[11px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          Активна
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground truncate">@{p.username}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleSwitch(p)}
                          className="flex items-center gap-1 text-primary text-[13px] font-medium"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          Войти
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className="text-destructive p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {personas.length < 5 && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-[12px] text-[15px] font-medium"
          >
            <Plus className="h-4 w-4" />
            Создать новую личность
          </button>
        )}

        <div className="bg-card/50 rounded-[12px] p-4">
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            ⚠️ Каждая личность — отдельный аккаунт со своим seed. Токены хранятся локально в браузере. Для полного
            разделения — используйте разные устройства или отдельные seed-фразы.
          </div>
        </div>
      </div>
    </div>
  );
}
