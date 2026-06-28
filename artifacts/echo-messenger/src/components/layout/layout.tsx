import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Users, Lock, Settings, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEchoAuth } from "@/lib/auth-context";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useEchoAuth();

  const navItems = [
    { href: "/chats", label: "Chats", icon: MessageSquare },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/secret-chats", label: "Secret", icon: Lock },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (!isAuthenticated && location !== "/") {
    // Should redirect to login ideally
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-20 flex-col items-center border-r border-border bg-card py-6 shrink-0 z-10 relative">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Echo</span>
        </div>
        
        <nav className="flex flex-1 flex-col items-center gap-6 w-full">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="w-full flex justify-center">
              <div
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
                  location.startsWith(item.href)
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden flex items-center justify-around border-t border-border bg-card h-16 shrink-0 safe-area-bottom z-10 relative">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full",
                location.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
