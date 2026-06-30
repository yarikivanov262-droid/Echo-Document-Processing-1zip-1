import { useState } from "react";
import { useLocation } from "wouter";
import { Camera, Check, X, Copy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function MyProfile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const { toast } = useToast();
  const username = user?.username ?? "";
  const [copied, setCopied] = useState(false);

  const copyUsername = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    toast({ title: "Скопировано" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">
          Назад
        </button>
        <span className="text-[17px] font-semibold">Мой профиль</span>
        <button className="text-primary text-[17px] font-normal">Изм.</button>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        <div className="relative mb-4">
          {isLoading ? (
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
          ) : (
            <Avatar className="h-24 w-24">
              {user?.avatarFileId && <AvatarImage src={user.avatarFileId} />}
              <AvatarFallback className={cn("text-white text-4xl font-semibold", getAvatarColor(username))}>
                {username.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Camera className="h-4 w-4 text-white" />
          </button>
        </div>
        {isLoading ? (
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        ) : (
          <h2 className="text-[22px] font-bold">{username}</h2>
        )}
        <button onClick={copyUsername} className="flex items-center gap-1.5 mt-1 text-primary text-[15px]">
          @{username}
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
        </button>
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Info rows */}
      <div className="bg-card">
        {/* Username */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5">Имя пользователя</div>
            <div className="text-[16px]">@{username}</div>
          </div>
          <button className="text-primary text-[14px]">Изменить</button>
        </div>
        {/* Bio */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5">О себе</div>
            <div className="text-[16px] text-muted-foreground italic">Добавить описание...</div>
          </div>
          <button className="text-primary text-[14px]">Изменить</button>
        </div>
        {/* User ID */}
        <div className="flex items-center px-4 py-3">
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5">ID аккаунта</div>
            <div className="text-[16px] font-mono text-muted-foreground">{user?.id ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Seed phrase info */}
      <div className="bg-card">
        <div className="px-4 py-3 border-b border-border/50">
          <div className="text-[13px] text-muted-foreground mb-1">Безопасность</div>
          <div className="text-[16px]">Сид-фраза активна</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            Ваш аккаунт защищён криптографической сид-фразой
          </div>
        </div>
        <button
          onClick={() => navigate("/settings/security")}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-muted/30"
        >
          <span className="flex-1 text-[16px] text-primary">Центр безопасности</span>
          <span className="text-muted-foreground/50">›</span>
        </button>
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Danger */}
      <div className="bg-card">
        <button
          onClick={() => navigate("/settings/security")}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-muted/30"
        >
          <span className="flex-1 text-[16px] text-[#ff3b30]">Уничтожить аккаунт</span>
          <X className="h-4 w-4 text-[#ff3b30]" />
        </button>
      </div>
    </div>
  );
}
