import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, Phone, Settings, Search } from "lucide-react";
import { useGetChats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats({ query: { refetchInterval: 5000 } as never });

  const totalUnread = chats?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) ?? 0;

  const navItems = [
    { href: "/contacts", label: "Контакты", icon: Users, badge: 0 },
    { href: "/calls", label: "Звонки", icon: Phone, badge: 0 },
    { href: "/chats", label: "Чаты", icon: MessageCircle, badge: totalUnread },
    { href: "/settings", label: "Настройки", icon: Settings, badge: 0 },
    { href: "/search", label: "Поиск", icon: Search, badge: 0 },
  ];

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-20 flex-col items-center py-4 shrink-0 z-10 m-3 rounded-3xl glass-nav">
        <div className="flex h-10 w-10 items-center justify-center rounded-full mb-6 shadow-lg" style={{ background: "var(--gradient-primary)" }}>
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 w-full">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="w-full flex justify-center py-1">
                <div className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
                  isActive ? "text-primary glass-pill" : "text-muted-foreground hover:text-foreground"
                )}>
                  <item.icon className="h-6 w-6" />
                  {item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full">
                      {item.badge > 999 ? "999+" : item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden flex items-end justify-around shrink-0 z-10 mx-3 mb-3 rounded-3xl glass-nav"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "calc(60px + env(safe-area-inset-bottom))" }}
      >
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex justify-center h-14 py-1.5">
              <div className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-full w-full rounded-2xl transition-all mx-0.5",
                isActive ? "text-primary glass-pill" : "text-muted-foreground"
              )}>
                <div className="relative">
                  <item.icon
                    className={cn("h-6 w-6 transition-all", isActive ? "fill-primary stroke-primary" : "")}
                    strokeWidth={isActive ? 0 : 1.5}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full leading-none">
                      {item.badge > 9999 ? "9999+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px]", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
