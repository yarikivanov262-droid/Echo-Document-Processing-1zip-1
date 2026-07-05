import { useLocation } from "wouter";
import {
  ChevronRight, Bell, Lock, HardDrive, Palette, Globe, Smartphone,
  Bookmark, Phone, LogOut, ShieldAlert, Star, FolderOpen,
  Smile, Users, Activity, Database, Wifi, Mail, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useGetMe } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface RowProps {
  icon: React.ReactNode;
  bg: string;
  label: string;
  href?: string;
  value?: string;
  last?: boolean;
  onClick?: () => void;
  danger?: boolean;
  index?: number;
}

function Row({ icon, bg, label, href, value, last, onClick, danger, index = 0 }: RowProps) {
  const [, navigate] = useLocation();
  const handleClick = () => {
    if (href) navigate(href);
    if (onClick) onClick();
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, type: "spring", stiffness: 300, damping: 28 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 glass hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer select-none group",
        !last && "border-b border-border/40"
      )}
    >
      <motion.div
        whileHover={{ scale: 1.12, rotate: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn("h-[32px] w-[32px] rounded-[9px] flex items-center justify-center shrink-0 shadow-sm", bg)}
      >
        {icon}
      </motion.div>
      <span className={cn("flex-1 text-[16px]", danger ? "text-[#ff3b30]" : "text-foreground")}>{label}</span>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        {value && <span className="text-[14px]">{value}</span>}
        <motion.div
          animate={{ x: 0 }}
          whileHover={{ x: 2 }}
          className="group-hover:text-foreground/60 transition-colors"
        >
          <ChevronRight className="h-[18px] w-[18px] opacity-40" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function SectionDivider() {
  return <div className="h-[8px]" style={{ background: "hsl(var(--muted)/0.4)" }} />;
}

export function Settings() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const { logout } = useEchoAuth();
  const username = user?.username ?? "…";

  let rowIdx = 0;
  const ri = () => rowIdx++;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <div className="w-9" />
        <span className="text-[17px] font-semibold">Настройки</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/settings/my-profile")}
          className="text-primary text-[15px] font-medium px-2 py-1 rounded-xl hover:bg-primary/10 transition-colors"
        >
          Изм.
        </motion.button>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/settings/my-profile")}
        className="flex items-center gap-4 px-4 py-5 cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        {isLoading ? (
          <div className="h-[66px] w-[66px] rounded-full skeleton shrink-0" />
        ) : (
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
            <UserAvatar
              name={username}
              src={user?.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null}
              size="lg"
            />
          </motion.div>
        )}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <>
              <div className="h-5 skeleton rounded w-32 mb-2" />
              <div className="h-4 skeleton rounded w-24" />
            </>
          ) : (
            <>
              <div className="text-[19px] font-bold leading-tight">{username}</div>
              <div className="text-[14px] text-primary font-medium mt-0.5">@{username}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Нажмите для редактирования</div>
            </>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
      </motion.div>

      <SectionDivider />

      {/* Group 1 — quick access */}
      <div>
        <Row index={ri()} icon={<Bookmark className="h-[17px] w-[17px] text-white" />}   bg="bg-[#007aff]" label="Избранное"       href="/chat/favorites" />
        <Row index={ri()} icon={<Phone className="h-[17px] w-[17px] text-white" />}       bg="bg-[#34c759]" label="Недавние звонки" href="/calls" />
        <Row index={ri()} icon={<Smartphone className="h-[17px] w-[17px] text-white" />}  bg="bg-[#ff9500]" label="Устройства"      href="/settings/security" value="QR" last />
      </div>

      <SectionDivider />

      {/* Group 2 — settings */}
      <div>
        <Row index={ri()} icon={<Bell className="h-[17px] w-[17px] text-white" />}        bg="bg-[#ff2d55]" label="Уведомления и звуки"   href="/settings/notifications" />
        <Row index={ri()} icon={<Lock className="h-[17px] w-[17px] text-white" />}        bg="bg-[#8e8e93]" label="Конфиденциальность"     href="/settings/privacy" />
        <Row index={ri()} icon={<HardDrive className="h-[17px] w-[17px] text-white" />}   bg="bg-[#34c759]" label="Данные и хранилище"     href="/settings/data" />
        <Row index={ri()} icon={<Palette className="h-[17px] w-[17px] text-white" />}     bg="bg-[#007aff]" label="Оформление"             href="/settings/appearance" />
        <Row index={ri()} icon={<Globe className="h-[17px] w-[17px] text-white" />}       bg="bg-[#34c759]" label="Язык"                   href="/settings/language" value="Русский" />
        <Row index={ri()} icon={<Smile className="h-[17px] w-[17px] text-white" />}       bg="bg-[#ff9500]" label="Стикерпаки"             href="/sticker-packs" />
        <Row index={ri()} icon={<FolderOpen className="h-[17px] w-[17px] text-white" />}  bg="bg-[#5856d6]" label="Папки чатов"            href="/settings/folders" />
        <Row index={ri()} icon={<Users className="h-[17px] w-[17px] text-white" />}       bg="bg-[#a695e7]" label="Мои профили"            href="/settings/profiles" />
        <Row index={ri()} icon={<Users className="h-[17px] w-[17px] text-white" />}       bg="bg-[#5856d6]" label="Псевдонимы"             href="/settings/personas" />
        <Row index={ri()} icon={<Wifi className="h-[17px] w-[17px] text-white" />}        bg="bg-[#007aff]" label="Прокси и соединение"    href="/settings/connection" />
        <Row index={ri()} icon={<Mail className="h-[17px] w-[17px] text-white" />}        bg="bg-[#ff2d55]" label="Анонимный ящик"         href="/settings/anon-inbox" />
        <Row index={ri()} icon={<Shield className="h-[17px] w-[17px] text-white" />}      bg="bg-[#34c759]" label="Анализ приватности"     href="/settings/privacy-score" />
        <Row index={ri()} icon={<Database className="h-[17px] w-[17px] text-white" />}    bg="bg-[#ff9500]" label="Резервная копия"        href="/settings/backup" last />
      </div>

      <SectionDivider />

      {/* Group 3 — help */}
      <div>
        <Row index={ri()} icon={<Activity className="h-[17px] w-[17px] text-white" />}    bg="bg-[#5856d6]" label="Журнал активности"     href="/settings/log" />
        <Row index={ri()} icon={<Star className="h-[17px] w-[17px] text-white" />}        bg="bg-[#ff9500]" label="Оценить приложение"    href="/settings/rate" />
        <Row index={ri()} icon={<ShieldAlert className="h-[17px] w-[17px] text-white" />} bg="bg-[#ff3b30]" label="Центр безопасности"    href="/settings/security" last />
      </div>

      <SectionDivider />

      {/* Logout */}
      <div>
        <Row
          index={ri()}
          icon={<LogOut className="h-[17px] w-[17px] text-white" />}
          bg="bg-[#ff3b30]"
          label="Выйти"
          onClick={logout}
          danger
          last
        />
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center py-8 gap-1"
      >
        <div className="text-[13px] text-muted-foreground font-medium">ECHO Messenger v1.0.0</div>
        <div className="text-[12px] text-muted-foreground/50">🔒 Анонимность гарантирована</div>
      </motion.div>
    </div>
  );
}
