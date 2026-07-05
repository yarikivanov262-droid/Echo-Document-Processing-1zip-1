import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera, Check, X, Copy, Hash, Shuffle } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useGetMe, useUpdateMe, useUploadFile, useCheckEchoNumber, useClaimEchoNumber } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const BIO_MAX = 255;
const NAME_MAX = 64;

function generateRandomNumber(): string {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `+999${digits}`;
}

function EchoNumberPicker({ current, onClose }: { current: string | null | undefined; onClose: () => void }) {
  const [input, setInput] = useState(current ?? generateRandomNumber());
  const [debouncedInput, setDebouncedInput] = useState(input);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const claimMutation = useClaimEchoNumber();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 500);
    return () => clearTimeout(t);
  }, [input]);

  const { data: availability, isFetching } = useCheckEchoNumber(
    debouncedInput,
    { query: { enabled: /^\+999\d{7}$/.test(debouncedInput) && debouncedInput !== current } as never }
  );

  const isValid = /^\+999\d{7}$/.test(input);
  const isSelf = input === current;
  const isAvailable = isSelf || (availability?.available ?? false);

  const handleClaim = () => {
    if (isSelf) { onClose(); return; }
    claimMutation.mutate({ data: { number: input } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        toast({ title: `Номер ${input} привязан!` });
        onClose();
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Ошибка";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="glass w-full max-w-md rounded-t-2xl p-6 pb-8 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold">ECHO Номер</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <p className="text-[13px] text-muted-foreground">
          Уникальный коллекционный номер +999XXXXXXX. Виден всем пользователям, привязан к вашей 12-словной фразе. Заменить можно в любой момент.
        </p>

        <div className="flex items-center gap-2">
          <div className={cn(
            "flex-1 flex items-center border rounded-xl px-3 h-11 bg-background",
            !isValid && input !== "" ? "border-red-500/60" : isAvailable && isValid ? "border-[#34c759]" : "border-border"
          )}>
            <Hash className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />
            <input
              value={input}
              onChange={e => {
                let v = e.target.value;
                if (!v.startsWith("+999")) v = "+999" + v.replace(/[^0-9]/g, "");
                setInput(v.slice(0, 11));
              }}
              placeholder="+9991234567"
              className="flex-1 bg-transparent outline-none text-[17px] font-mono tracking-wider"
            />
            {isFetching && <div className="h-3 w-3 border border-t-transparent border-primary rounded-full animate-spin shrink-0" />}
            {!isFetching && isValid && !isSelf && (
              isAvailable
                ? <Check className="h-4 w-4 text-[#34c759] shrink-0" />
                : <X className="h-4 w-4 text-red-500 shrink-0" />
            )}
          </div>
          <button
            onClick={() => setInput(generateRandomNumber())}
            className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/60"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>

        {isValid && !isSelf && !isFetching && (
          <p className={cn("text-[12px]", isAvailable ? "text-[#34c759]" : "text-red-500")}>
            {isAvailable ? "✓ Номер свободен" : "✗ Номер уже занят"}
          </p>
        )}
        {!isValid && input.length > 0 && (
          <p className="text-[12px] text-muted-foreground">Формат: +999 + 7 цифр (например +9991234567)</p>
        )}

        <button
          onClick={handleClaim}
          disabled={!isValid || (!isAvailable && !isSelf) || claimMutation.isPending}
          className="h-11 rounded-xl bg-primary text-white font-semibold text-[16px] disabled:opacity-40"
        >
          {claimMutation.isPending ? "Сохраняем..." : isSelf ? "Закрыть" : "Привязать номер"}
        </button>
      </div>
    </div>
  );
}

export function MyProfile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const updateMeMutation = useUpdateMe();
  const uploadMutation = useUploadFile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const username = user?.username ?? "";

  const [copied, setCopied] = useState(false);
  const [numberCopied, setNumberCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showNumberPicker, setShowNumberPicker] = useState(false);
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

  const copyNumber = () => {
    if (!user?.echoNumber) return;
    navigator.clipboard.writeText(user.echoNumber);
    setNumberCopied(true);
    toast({ title: "Номер скопирован" });
    setTimeout(() => setNumberCopied(false), 2000);
  };

  const startEdit = () => {
    setDisplayName(user?.displayName ?? "");
    setBio(user?.bio ?? "");
    setAvatarFileId(user?.avatarFileId ?? null);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

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
      {showNumberPicker && (
        <EchoNumberPicker
          current={user?.echoNumber}
          onClose={() => setShowNumberPicker(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
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
            <UserAvatar
              name={displayLabel || username || "?"}
              src={avatarFileId ? `/api/files/${avatarFileId}/download` : null}
              size="xl"
            />
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
          </div>
        )}
        <button onClick={copyUsername} className="flex items-center gap-1.5 mt-1 text-primary text-[15px]">
          @{username}
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
        </button>
        {user?.echoNumber && (
          <button onClick={copyNumber} className="flex items-center gap-1 mt-0.5 text-muted-foreground text-[14px] font-mono">
            {user.echoNumber}
            {numberCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
          </button>
        )}
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Info rows */}
      <div className="glass">
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

        {/* ECHO Number */}
        <div
          className="flex items-center px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/20"
          onClick={() => setShowNumberPicker(true)}
        >
          <div className="flex-1">
            <div className="text-[13px] text-muted-foreground mb-0.5">ECHO Номер</div>
            <div className={cn("text-[16px] font-mono", !user?.echoNumber && "text-primary")}>
              {user?.echoNumber ?? "Получить номер +999..."}
            </div>
          </div>
          <span className="text-muted-foreground/50 text-[18px]">›</span>
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
      <div className="glass">
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
      <div className="glass">
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
