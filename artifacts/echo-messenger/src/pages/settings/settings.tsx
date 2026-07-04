import { useLocation } from "wouter";
import {
  ChevronRight, Bell, Lock, HardDrive, Palette, Globe, Smartphone,
  Bookmark, Phone, LogOut, ShieldAlert, Star, FolderOpen,
  Smile, Users, Activity, Database, Crown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

interface RowProps {
  icon: React.ReactNode;
  bg: string;
  label: string;
  href?: string;
  value?: string;
  last?: boolean;
  onClick?: () => void;
  danger?: boolean;
}

function Row({ icon, bg, label, href, value, last, onClick, danger }: RowProps) {
  const [, navigate] = useLocation();
  const handleClick = () => {
    if (href) navigate(href);
    if (onClick) onClick();
  };
  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer select-none",
        !last && "border-b border-border/50"
      )}
    >
      <div className={cn("h-[30px] w-[30px] rounded-[8px] flex items-center justify-center shrink-0", bg)}>
        {icon}
      </div>
      <span className={cn("flex-1 text-[16px]", danger ? "text-[#ff3b30]" : "text-foreground")}>{label}</span>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        {value && <span className="text-[14px]">{value}</span>}
        <ChevronRight className="h-[18px] w-[18px] opacity-40" />
      </div>
    </div>
  );
}

export function Settings() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const { logout } = useEchoAuth();
  const username = user?.username ?? "…";

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <div className="w-9" />
        <span className="text-[17px] font-semibold">Настройки</span>
        <button
          onClick={() => navigate("/settings/my-profile")}
          className="text-primary text-[17px] font-normal"
        >
          Изм.
        </button>
      </div>

      {/* Profile card — tappable */}
      <div
        onClick={() => navigate("/settings/my-profile")}
        className="flex items-center gap-4 px-4 py-4 mx-0 cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        {isLoading ? (
          <div className="h-[62px] w-[62px] rounded-full bg-muted animate-pulse shrink-0" />
        ) : (
          <Avatar className="h-[62px] w-[62px] shrink-0">
            {user?.avatarFileId && <AvatarImage src={user.avatarFileId} />}
            <AvatarFallback className={cn("text-white text-2xl font-semibold", getAvatarColor(username))}>
              {username.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <>
              <div className="h-5 bg-muted rounded w-32 mb-1 animate-pulse" />
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </>
          ) : (
            <>
              <div className="text-[18px] font-bold leading-tight">{username}</div>
              <div className="text-[14px] text-primary">@{username}</div>
            </>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/60 shrink-0" />
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Group 1 — account actions */}
      <div className="mt-0">
        <Row icon={<Bookmark className="h-[18px] w-[18px] text-white" />} bg="bg-[#007aff]" label="Избранное" href="/chat/favorites" />
        <Row icon={<Phone className="h-[18px] w-[18px] text-white" />} bg="bg-[#34c759]" label="Недавние звонки" href="/calls" />
        <Row icon={<Smartphone className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff9500]" label="Устройства" href="/settings/security" value="QR" last />
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Group 2 — settings */}
      <div>
        <Row icon={<Bell className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff2d55]" label="Уведомления и звуки" href="/settings/notifications" />
        <Row icon={<Lock className="h-[18px] w-[18px] text-white" />} bg="bg-[#8e8e93]" label="Конфиденциальность" href="/settings/privacy" />
        <Row icon={<HardDrive className="h-[18px] w-[18px] text-white" />} bg="bg-[#34c759]" label="Данные и хранилище" href="/settings/data" />
        <Row icon={<Palette className="h-[18px] w-[18px] text-white" />} bg="bg-[#007aff]" label="Оформление" href="/settings/appearance" />
        <Row icon={<Globe className="h-[18px] w-[18px] text-white" />} bg="bg-[#34c759]" label="Язык" href="/settings/language" value="Русский" />
        <Row icon={<Smile className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff9500]" label="Стикерпаки" href="/sticker-packs" />
        <Row icon={<FolderOpen className="h-[18px] w-[18px] text-white" />} bg="bg-[#5856d6]" label="Папки чатов" href="/settings/folders" />
        <Row icon={<Users className="h-[18px] w-[18px] text-white" />} bg="bg-[#a695e7]" label="Мои профили" href="/settings/profiles" />
        <Row icon={<Database className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff9500]" label="Резервная копия" href="/settings/backup" last />
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Group 3 — stars & premium */}
      <div>
        <Row icon={<Star className="h-[18px] w-[18px] text-white" />} bg="bg-[#FFD700]" label="ECHO Stars" href="/stars" value={user?.starsBalance !== undefined ? `${user.starsBalance} ⭐` : undefined} />
        <Row icon={<Crown className="h-[18px] w-[18px] text-white" />} bg="bg-gradient-to-br from-[#FFD700] to-[#FFA500]" label="ECHO Premium" href="/premium" value={user?.isPremium ? "Активна" : undefined} last />
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Group 4 — help */}
      <div>
        <Row icon={<Activity className="h-[18px] w-[18px] text-white" />} bg="bg-[#5856d6]" label="Журнал активности" href="/settings/log" />
        <Row icon={<Star className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff9500]" label="Оценить приложение" href="/settings/rate" />
        <Row icon={<ShieldAlert className="h-[18px] w-[18px] text-white" />} bg="bg-[#ff3b30]" label="Центр безопасности" href="/settings/security" last />
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Logout */}
      <div className="mt-0">
        <Row
          icon={<LogOut className="h-[18px] w-[18px] text-white" />}
          bg="bg-[#ff3b30]"
          label="Выйти"
          onClick={logout}
          danger
          last
        />
      </div>

      {/* Footer version */}
      <div className="flex flex-col items-center py-6 gap-1">
        <div className="text-[13px] text-muted-foreground">ECHO Messenger v1.0.0</div>
        <div className="text-[12px] text-muted-foreground/60">Анонимность гарантирована</div>
      </div>
    </div>
  );
}
