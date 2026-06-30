import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, Phone, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/calls", label: "Звонки", icon: Phone },
  { href: "/chats", label: "Чаты", icon: MessageCircle, badge: 0 },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-16 flex-col items-center border-r border-border bg-card py-4 shrink-0 z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary mb-6">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 w-full">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="w-full flex justify-center py-1">
              <div className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                location.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon className="h-6 w-6" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full">
                    {item.badge > 999 ? "999+" : item.badge}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden flex items-end justify-around bg-card border-t border-border shrink-0 z-10"
           style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "calc(56px + env(safe-area-inset-bottom))" }}>
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex justify-center h-14">
              <div className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-full w-full",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <div className="relative">
                  <item.icon
                    className={cn("h-6 w-6 transition-all", isActive ? "fill-primary stroke-primary" : "")}
                    strokeWidth={isActive ? 0 : 1.5}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full leading-none">
                      {item.badge > 9999 ? "9999+" : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={cn("text-[10px]", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
        {/* Search icon */}
        <Link href="/search" className="flex-1 flex justify-center h-14">
          <div className="flex flex-col items-center justify-center gap-0.5 h-full w-full text-muted-foreground">
            <Search className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[10px]">Поиск</span>
          </div>
        </Link>
      </nav>
    </div>
  );
}
