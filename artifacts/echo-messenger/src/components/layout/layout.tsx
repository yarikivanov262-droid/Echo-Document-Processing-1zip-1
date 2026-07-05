import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, Phone, Settings, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetChats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/calls",    label: "Звонки",   icon: Phone },
  { href: "/chats",    label: "Чаты",     icon: MessageCircle },
  { href: "/settings", label: "Настройки",icon: Settings },
  { href: "/search",   label: "Поиск",    icon: Search },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats({ query: { refetchInterval: 5000 } as never });
  const totalUnread = chats?.reduce((sum: number, c: { unreadCount?: number | null }) => sum + (c.unreadCount || 0), 0) ?? 0;

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row bg-background overflow-hidden app-bg">
      {/* Decorative orbs (desktop only — mobile gets them on bg) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden md:block">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(4 90% 60% / 0.18) 0%, transparent 65%)", filter: "blur(60px)", animation: "float-orb 14s ease-in-out infinite" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(340 80% 60% / 0.12) 0%, transparent 65%)", filter: "blur(60px)", animation: "float-orb 18s ease-in-out infinite reverse" }} />
      </div>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 hidden md:flex w-[72px] flex-col items-center py-4 shrink-0 m-3 rounded-3xl glass-nav"
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="flex h-11 w-11 items-center justify-center rounded-full mb-6 shadow-lg cursor-pointer"
          style={{ background: "var(--gradient-primary)" }}
        >
          <MessageCircle className="h-5 w-5 text-white" strokeWidth={2.2} />
        </motion.div>

        <nav className="flex flex-1 flex-col items-center gap-1 w-full">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const badge = item.href === "/chats" ? totalUnread : 0;
            return (
              <Link key={item.href} href={item.href} className="w-full flex justify-center py-1">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
                    isActive ? "glass-pill-active text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-nav-indicator"
                      className="absolute inset-0 rounded-2xl glass-pill-active"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  )}
                  <item.icon className={cn("h-5 w-5 relative z-10", isActive && "drop-shadow-sm")} strokeWidth={isActive ? 2.2 : 1.7} />
                  {badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full shadow-md z-10"
                    >
                      {badge > 999 ? "999+" : badge}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom dot indicator */}
        <div className="w-8 h-1 rounded-full bg-muted/40 mb-1" />
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="relative flex-1 flex flex-col z-10 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 h-full flex flex-col overflow-hidden"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 md:hidden flex items-end justify-around shrink-0 mx-3 mb-3 rounded-3xl glass-nav"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "calc(62px + env(safe-area-inset-bottom))" }}
      >
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          const badge = item.href === "/chats" ? totalUnread : 0;
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex justify-center h-14 py-1">
              <motion.div
                whileTap={{ scale: 0.84 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 h-full w-full rounded-2xl transition-colors duration-200 mx-0.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 rounded-2xl glass-pill-active"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <div className="relative z-10">
                  <item.icon
                    className={cn("h-5.5 w-5.5 transition-all h-[22px] w-[22px]", isActive ? "stroke-primary" : "")}
                    strokeWidth={isActive ? 2.3 : 1.6}
                    fill={isActive ? "hsl(var(--primary) / 0.1)" : "none"}
                  />
                  {badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -top-1.5 -right-2 flex items-center justify-center bg-primary text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full leading-none shadow-md"
                    >
                      {badge > 9999 ? "9999+" : badge}
                    </motion.span>
                  )}
                </div>
                <motion.span
                  animate={{ opacity: isActive ? 1 : 0.65, scale: isActive ? 1 : 0.95 }}
                  className={cn("text-[10px] font-medium relative z-10", isActive ? "text-primary" : "text-muted-foreground")}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
