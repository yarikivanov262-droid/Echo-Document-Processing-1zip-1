import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const GRADIENTS = [
  ["#f3713b", "#e8603a"],
  ["#2eba5a", "#1d9e50"],
  ["#259fe6", "#1a85c3"],
  ["#9b59b6", "#8e44ad"],
  ["#e8b94e", "#d4a63c"],
  ["#eb5545", "#d9493b"],
  ["#45bcd8", "#39a9c0"],
  ["#65aadd", "#5090c0"],
  ["#ee7aae", "#d96298"],
  ["#a695e7", "#8b7cd6"],
];

function getGradient(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 1).toUpperCase();
}

const SIZE_MAP = {
  xs: "h-6 w-6",
  sm: "h-9 w-9",
  md: "h-[54px] w-[54px]",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const TEXT_SIZE_MAP = {
  xs: "text-[10px]",
  sm: "text-sm",
  md: "text-[20px]",
  lg: "text-2xl",
  xl: "text-3xl",
};

const ONLINE_SIZE_MAP = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2.5 h-2.5 border-2",
  md: "w-3.5 h-3.5 border-2",
  lg: "w-4 h-4 border-2",
  xl: "w-5 h-5 border-2",
};

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_MAP;
  online?: boolean;
  className?: string;
}

export function UserAvatar({ name, src, size = "md", online, className }: UserAvatarProps) {
  const [from, to] = getGradient(name || "?");
  const initials = getInitials(name || "?");

  return (
    <div className={cn("relative shrink-0", SIZE_MAP[size], className)}>
      <Avatar className={cn("h-full w-full")}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback
          style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
          className={cn("text-white font-semibold select-none", TEXT_SIZE_MAP[size])}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-[#34c759] border-background",
            ONLINE_SIZE_MAP[size]
          )}
        />
      )}
    </div>
  );
}
