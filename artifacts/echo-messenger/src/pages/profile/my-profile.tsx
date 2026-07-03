import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera, Check, X, Copy, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe, useUpdateMe, useUploadFile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const BIO_MAX = 255;
const NAME_MAX = 64;

export function MyProfile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const updateMeMutation = useUpdateMe();
  const uploadMutation = useUploadFile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const username = user?.username ?? "";

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFileId, setAvatarFileId] = useState<string | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setBio(user.bio ?? "");
      setAvatarFileId(user.avatarFileId ?? null);
    }
  }, [user]);

  const copyUsername = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    toast({ title: "Скопировано" });
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setDisplayName(user?.displayName ?? "");
    setBio(user?.bio ?? "");
    setAvatarFileId(user?.avatarFileId ?? null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = () => {
    updateMeMutation.mutate(
      { data: { displayName: displayName.trim() || null, bio: bio.trim() || null, avatarFileId: avatarFileId ?? null } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          toast({ title: "Профиль обновлён" });
          setEditing(false);
        },
        onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
      }
    );
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      try {
        const res = await uploadMutation.mutateAsync({ data: { data: b64, mimeType: file.type } });
        setAvatarFileId(res.fileId);
      } catch {
        toast({ title: "Ошибка загрузки фото", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const displayLabel = user?.displayName || username;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button
          onClick={() => (editing ? cancelEdit() : navigate("/settings"))}
          className="text-primary text-[17px]"
        >
          {editing ? "Отмена" : "Назад"}
        </button>
        <span className="text-[17px] font-semibold">{editing ? "Редактировать" : "Мой профиль"}</span>
        {editing ? (
          <button
            onClick={saveEdit}
            disabled={updateMeMutation.isPending}
            className="text-primary text-[17px] font-semibold disabled:opacity-50"
          >
            Готово
          </button>
        ) : (
          <button onClick={startEdit} className="text-primary text-[17px] font-normal">Изм.</button>
        )}
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        <div className="relative mb-4">
          {isLoading ? (
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
          ) : (
            <Avatar className="h-24 w-24">
              {avatarFileId && <AvatarImage src={`/api/files/${avatarFileId}/download`} />}
              <AvatarFallback className={cn("text-white text-4xl font-semibold", getAvatarColor(username))}>
                {(displayLabel || "?").substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <button
            onClick={() => editing && fileRef.current?.click()}
            className={cn(
              "absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg",
              !editing && "opacity-70"
            )}
          >
            <Camera className="h-4 w-4 text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>

        {isLoading ? (
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        ) : (
          <div className="flex items-center gap-1.5">
            <h2 className="text-[22px] font-bold">{displayLabel}</h2>
            {user?.isPremium && (
              <span className="flex items-center gap-0.5 text-[#f0b90b] text-[13px] font-semibold">
                <Star className="h-3.5 w-3.5 fill-[#f0b90b]" /> ECHO Premium
              </span>
            )}
          </div>
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
        </div>

        {/* Display name */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5">Отображаемое имя</div>
            {editing ? (
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value.slice(0, NAME_MAX))}
                placeholder="Ваше имя"
                className="text-[16px] bg-transparent outline-none w-full border-b border-primary/40 pb-1"
              />
            ) : (
              <div className="text-[16px]">{user?.displayName || <span className="text-muted-foreground italic">Не указано</span>}</div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5 flex items-center justify-between">
              <span>О себе</span>
              {editing && <span>{bio.length}/{BIO_MAX}</span>}
            </div>
            {editing ? (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Расскажите о себе"
                rows={2}
                className="text-[16px] bg-transparent outline-none w-full border-b border-primary/40 pb-1 resize-none"
              />
            ) : (
              <div className={cn("text-[16px]", !user?.bio && "text-muted-foreground italic")}>
                {user?.bio || "Добавить описание..."}
              </div>
            )}
          </div>
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

      {/* Stars */}
      <div className="bg-card">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <Star className="h-5 w-5 text-[#f0b90b] fill-[#f0b90b]" />
          <span className="text-[16px] font-semibold">{user?.starsBalance ?? 0} Stars</span>
        </div>
        <button
          onClick={() => toast({ title: "Пополнение Stars скоро" })}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-muted/30 border-b border-border/50"
        >
          <span className="flex-1 text-[16px] text-primary">Пополнить</span>
          <span className="text-muted-foreground/50">›</span>
        </button>
        <button
          onClick={() => toast({ title: "История транзакций скоро" })}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-muted/30"
        >
          <span className="flex-1 text-[16px] text-primary">История транзакций</span>
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
