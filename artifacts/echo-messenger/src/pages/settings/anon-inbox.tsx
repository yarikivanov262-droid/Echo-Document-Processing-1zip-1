import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Mail, Copy, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Inbox {
  id: number;
  slug: string;
  label: string | null;
  isActive: boolean;
  messageCount: number;
}

export function AnonInboxSettings() {
  const [, setLocation] = useLocation();
  const { sessionToken } = useEchoAuth();
  const { toast } = useToast();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inbox", { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (res.ok) setInboxes(await res.json() as Inbox[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    const label = prompt("Название ящика (напр. «Мои вопросы»)") ?? "Анонимный ящик";
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) { void load(); toast({ title: "Ящик создан" }); }
  };

  const toggle = async (id: number, isActive: boolean) => {
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    void load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/inbox/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${sessionToken}` } });
    void load();
    toast({ title: "Ящик удалён" });
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/ask/${slug}`);
    toast({ title: "Ссылка скопирована" });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button onClick={() => setLocation("/settings")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">Анонимный ящик</span>
        <button onClick={() => void create()} className="text-primary">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="glass rounded-[12px] p-4 flex items-start gap-3">
          <Mail className="h-8 w-8 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="text-[15px] font-semibold">Анонимный ящик</div>
            <div className="text-[13px] text-muted-foreground">
              Создай ссылку — любой сможет написать тебе, не раскрывая свой аккаунт.
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-8 text-muted-foreground animate-pulse">Загрузка…</div>}

        {!loading && inboxes.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div className="text-[15px]">Нет ящиков</div>
          </div>
        )}

        {inboxes.map((inbox) => (
          <div key={inbox.id} className="glass rounded-[12px] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="text-[15px] font-medium">{inbox.label ?? "Анонимный ящик"}</div>
                <div className="text-[12px] text-muted-foreground font-mono">
                  /ask/{inbox.slug}
                </div>
              </div>
              <button onClick={() => void toggle(inbox.id, inbox.isActive)} className="text-muted-foreground">
                {inbox.isActive
                  ? <ToggleRight className="h-6 w-6 text-[#34c759]" />
                  : <ToggleLeft className="h-6 w-6" />}
              </button>
            </div>
            <div className="flex items-center gap-1 px-4 py-2 border-t border-border/40">
              <span className="text-[12px] text-muted-foreground flex-1">{inbox.messageCount} сообщений</span>
              <button onClick={() => copyLink(inbox.slug)} className="p-2 text-primary hover:opacity-70">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={() => void remove(inbox.id)} className="p-2 text-destructive hover:opacity-70">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => void create()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-[12px] text-[15px] font-medium"
        >
          <Plus className="h-4 w-4" />
          Создать новый ящик
        </button>
      </div>
    </div>
  );
}
