import { Link } from "wouter";
import { ChevronRight, QrCode, Camera, User, Wallet, Bookmark, Phone, MonitorSmartphone, FolderOpen, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function SettingsRow({
  icon,
  iconBg,
  label,
  href,
  right,
  last = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  href?: string;
  right?: React.ReactNode;
  last?: boolean;
}) {
  const inner = (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer",
      !last && "border-b border-border/60"
    )}>
      <div className={cn("h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0", iconBg)}>
        {icon}
      </div>
      <span className="flex-1 text-[16px] text-foreground">{label}</span>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {right}
        <ChevronRight className="h-4 w-4 opacity-40" />
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Settings() {
  const { data: user } = useGetMe();
  const { logout } = useEchoAuth();
  const username = user?.username || "username";

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="h-9 w-9 flex items-center justify-center rounded-full bg-muted">
          <QrCode className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-[17px] font-semibold">Настройки</span>
        <button className="text-primary text-[17px] font-normal">Изм.</button>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center pt-4 pb-6 px-4">
        <div className="relative mb-3">
          <Avatar className="h-24 w-24">
            {user?.avatarFileId && <AvatarImage src={user.avatarFileId} />}
            <AvatarFallback className={cn("text-white text-3xl font-semibold", getAvatarColor(username))}>
              {username.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <h2 className="text-[22px] font-bold text-foreground">{username}</h2>
        <p className="text-[14px] text-muted-foreground mt-0.5">@{username}</p>
      </div>

      {/* Change photo */}
      <div className="mx-4 mb-6 rounded-[12px] overflow-hidden">
        <button className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 text-primary text-[16px]">
          <Camera className="h-5 w-5" />
          Изменить фотографию
        </button>
      </div>

      {/* Group 1 */}
      <div className="mx-4 mb-6 rounded-[12px] overflow-hidden">
        <SettingsRow
          icon={<User className="h-5 w-5 text-white" />}
          iconBg="bg-[#ff3b30]"
          label="Мой профиль"
          href={`/profile/${user?.id || 'me'}`}
        />
        <SettingsRow
          icon={<Wallet className="h-5 w-5 text-white" />}
          iconBg="bg-[#007aff]"
          label="Кошелёк"
          href="/settings/wallet"
          last
        />
      </div>

      {/* Group 2 */}
      <div className="mx-4 mb-6 rounded-[12px] overflow-hidden">
        <SettingsRow
          icon={<Bookmark className="h-5 w-5 text-white" />}
          iconBg="bg-[#007aff]"
          label="Избранное"
          href="/chats"
        />
        <SettingsRow
          icon={<Phone className="h-5 w-5 text-white" />}
          iconBg="bg-[#34c759]"
          label="Недавние звонки"
          href="/calls"
        />
        <SettingsRow
          icon={<MonitorSmartphone className="h-5 w-5 text-white" />}
          iconBg="bg-[#ff9500]"
          label="Устройства"
          href="/settings/security"
          right={<span className="text-[14px] text-muted-foreground">QR-код</span>}
        />
        <SettingsRow
          icon={<FolderOpen className="h-5 w-5 text-white" />}
          iconBg="bg-[#007aff]"
          label="Папки с чатами"
          href="/settings/backup"
          last
        />
      </div>

      {/* Logout */}
      <div className="mx-4 mb-8 rounded-[12px] overflow-hidden">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 active:bg-muted/60 transition-colors"
        >
          <div className="h-8 w-8 rounded-[9px] flex items-center justify-center bg-[#ff3b30] shrink-0">
            <LogOut className="h-5 w-5 text-white" />
          </div>
          <span className="text-[16px] text-[#ff3b30]">Выйти</span>
        </button>
      </div>
    </div>
  );
}
