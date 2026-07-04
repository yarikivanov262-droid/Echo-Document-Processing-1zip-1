import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Persona {
  id: number;
  label: string;
  username: string;
  userId: number;
}

export function PersonasSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [personas] = useState<Persona[]>([]);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => setLocation("/settings")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">Псевдонимы</span>
        <button className="text-primary">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-card rounded-[12px] p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-[15px] font-semibold">Несколько личностей</div>
              <div className="text-[13px] text-muted-foreground">
                Создавай независимые аккаунты под одной фразой-ключом.
                Сервер не связывает их между собой.
              </div>
            </div>
          </div>
        </div>

        {personas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div className="text-[15px]">Нет псевдонимов</div>
            <div className="text-[13px] mt-1">Нажмите + чтобы создать новую личность</div>
          </div>
        ) : (
          personas.map((p) => (
            <div key={p.id} className="bg-card rounded-[12px] px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {p.label[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium">{p.label}</div>
                <div className="text-[13px] text-muted-foreground">@{p.username}</div>
              </div>
              <button
                onClick={() => toast({ title: `Переключение на ${p.label}…` })}
                className="text-primary text-[14px]"
              >
                Войти
              </button>
            </div>
          ))
        )}

        <button
          onClick={() => toast({ title: "Создание псевдонима — скоро" })}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-[12px] text-[15px] font-medium"
        >
          <Plus className="h-4 w-4" />
          Создать новую личность
        </button>

        <div className="bg-card/50 rounded-[12px] p-4">
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            ⚠️ Важно: связь между псевдонимами видна на сервере. Для полного разделения — используйте отдельные seed-фразы.
          </div>
        </div>
      </div>
    </div>
  );
}
