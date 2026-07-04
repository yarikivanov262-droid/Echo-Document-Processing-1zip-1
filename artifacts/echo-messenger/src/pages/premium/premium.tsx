import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetPremiumStatus,
  useSubscribePremium,
  useCancelPremium,
  useGetStars,
  getGetPremiumStatusQueryKey,
  getGetStarsQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  { icon: "👑", title: "Анимированные стикеры", desc: "Lottie-стикеры в чате" },
  { icon: "⚡", title: "Файлы до 100 МБ", desc: "Вместо стандартных 50 МБ" },
  { icon: "🎨", title: "Эксклюзивные фоны", desc: "Уникальные обои для чатов" },
  { icon: "😎", title: "Кастомные эмодзи", desc: "Стикеры как inline-эмодзи" },
  { icon: "🏅", title: "Значок Premium", desc: "Золотая ⭐ рядом с именем" },
  { icon: "🔇", title: "Без рекламы", desc: "Полностью чистый интерфейс" },
  { icon: "⚡", title: "Приоритет доставки", desc: "Сообщения идут первыми" },
  { icon: "🤖", title: "Голос → Текст", desc: "Расшифровка голосовых" },
  { icon: "📌", title: "До 10 закреп. чатов", desc: "Вместо стандартных 5" },
  { icon: "📁", title: "До 20 папок", desc: "Вместо стандартных 5" },
  { icon: "🌈", title: "Цвета имён", desc: "Уникальный цвет в чате" },
  { icon: "😊", title: "Все реакции", desc: "Кастомные эмодзи-реакции" },
];

// Confetti
function Confetti({ active }: { active: boolean }) {
  const colors = ["#FFD700", "#FF6B35", "#A855F7", "#22D3EE", "#F43F5E"];
  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: 10 + (i % 4) * 4,
                height: 10 + (i % 4) * 4,
                backgroundColor: colors[i % colors.length],
                borderRadius: i % 3 === 0 ? "50%" : "3px",
                left: `${3 + (i * 3.3) % 94}%`,
                top: "-10px",
              }}
              initial={{ y: 0, opacity: 1, rotate: 0 }}
              animate={{ y: "115vh", opacity: 0, rotate: 720 * (i % 2 === 0 ? 1 : -1) }}
              exit={{}}
              transition={{ duration: 1.6 + (i % 5) * 0.25, ease: "easeIn", delay: i * 0.035 }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function Premium() {
  const [, navigate] = useLocation();
  const { data: premiumData, isLoading } = useGetPremiumStatus();
  const { data: starsData } = useGetStars();
  const subscribeMutation = useSubscribePremium();
  const cancelMutation = useCancelPremium();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedTier, setSelectedTier] = useState<"monthly" | "yearly">("monthly");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const isPremium = premiumData?.isPremium ?? false;
  const premiumUntil = premiumData?.premiumUntil;
  const starsBalance = starsData?.balance ?? premiumData?.starsBalance ?? 0;
  const COSTS = { monthly: 280, yearly: 2800 };
  const cost = COSTS[selectedTier];
  const canAfford = starsBalance >= cost;

  const handleSubscribe = () => {
    subscribeMutation.mutate(
      { data: { tier: selectedTier } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetPremiumStatusQueryKey() });
          qc.invalidateQueries({ queryKey: getGetStarsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setConfirmOpen(false);
          setConfetti(true);
          setTimeout(() => setConfetti(false), 2500);
          toast({ title: "🎉 Добро пожаловать в ECHO Premium!" });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Ошибка";
          setConfirmOpen(false);
          toast({ title: "Ошибка", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPremiumStatusQueryKey() });
        toast({ title: "Автопродление отменено" });
      },
    });
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <Confetti active={confetti} />

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
          >
            <motion.div
              className="w-full max-w-md bg-card rounded-t-2xl px-5 py-6 flex flex-col gap-4"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">👑</div>
                <div className="text-[18px] font-bold">Оформить Premium?</div>
                <div className="text-[14px] text-muted-foreground mt-1">
                  Будет списано <span className="text-[#FFD700] font-bold">{cost} ⭐</span> за{" "}
                  {selectedTier === "monthly" ? "1 месяц" : "1 год"}
                </div>
                {!canAfford && (
                  <div className="mt-2 text-[13px] text-[#ff3b30]">
                    Недостаточно Stars. Баланс: {starsBalance} ⭐
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-muted text-[16px] font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={!canAfford || subscribeMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[16px] font-bold disabled:opacity-40"
                >
                  {subscribeMutation.isPending ? "..." : "Оформить"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-background">
        <div className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 50% -20%, #FFD700 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-col items-center px-4 pt-10 pb-8">
          <button
            onClick={() => navigate("/settings")}
            className="absolute top-3 left-3 flex items-center justify-center h-9 w-9 rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white/80" />
          </button>

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-6xl mb-3"
          >
            👑
          </motion.div>
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[26px] font-bold text-white text-center leading-tight"
          >
            ECHO Premium
          </motion.div>
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="text-[14px] text-white/60 mt-1 text-center"
          >
            Полный доступ ко всем функциям
          </motion.div>

          {isPremium && premiumUntil && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 px-4 py-2 bg-[#FFD700]/20 rounded-full border border-[#FFD700]/40"
            >
              <span className="text-[#FFD700] text-[13px] font-semibold">
                ✅ Активна до {new Date(premiumUntil).toLocaleDateString("ru-RU")}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Features grid */}
      <div className="px-4 py-5">
        <div className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide pb-3">
          Преимущества
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/40"
            >
              <span className="text-xl shrink-0">{f.icon}</span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">{f.title}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      {!isLoading && !isPremium && (
        <div className="px-4 pb-6">
          <div className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide pb-3">
            Выберите план
          </div>

          <div className="flex gap-3 mb-4">
            {(["monthly", "yearly"] as const).map((tier) => {
              const label = tier === "monthly" ? "Ежемесячно" : "Ежегодно";
              const price = COSTS[tier];
              const saving = tier === "yearly" ? "−16%" : null;
              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={cn(
                    "flex-1 flex flex-col items-center py-4 rounded-2xl border-2 transition-all",
                    selectedTier === tier
                      ? "border-[#FFD700] bg-[#FFD700]/10"
                      : "border-border/50 bg-card"
                  )}
                >
                  {saving && (
                    <span className="text-[11px] font-bold text-[#34c759] bg-[#34c759]/15 px-2 py-0.5 rounded-full mb-1">
                      {saving}
                    </span>
                  )}
                  <div className="text-[15px] font-bold">{label}</div>
                  <div className="text-[18px] font-extrabold text-[#FFD700] mt-1">⭐ {price}</div>
                  {tier === "yearly" && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">≈ 233 ⭐/мес</div>
                  )}
                  {selectedTier === tier && (
                    <Check className="h-4 w-4 text-[#FFD700] mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          <div className={cn("text-[13px] mb-3 text-center", canAfford ? "text-muted-foreground" : "text-[#ff3b30]")}>
            Ваш баланс: <span className={cn("font-bold", canAfford ? "text-[#FFD700]" : "text-[#ff3b30]")}>{starsBalance} ⭐</span>
            {!canAfford && " — недостаточно Stars"}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirmOpen(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[17px] font-bold shadow-lg"
          >
            Оформить подписку — {COSTS[selectedTier]} ⭐
          </motion.button>

          {!canAfford && (
            <button
              onClick={() => navigate("/stars")}
              className="w-full mt-2 py-3 rounded-2xl border border-[#FFD700]/50 text-[#FFD700] text-[15px] font-semibold"
            >
              Пополнить Stars →
            </button>
          )}
        </div>
      )}

      {/* Already premium */}
      {!isLoading && isPremium && (
        <div className="px-4 pb-8 flex flex-col gap-3">
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="text-[18px] font-bold text-[#FFD700]">✅ У вас активен Premium</div>
            {premiumUntil && (
              <div className="text-[14px] text-muted-foreground">
                Истекает: {new Date(premiumUntil).toLocaleDateString("ru-RU")}
              </div>
            )}
          </div>

          {/* Extend */}
          <div className="flex gap-3">
            {(["monthly", "yearly"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => { setSelectedTier(tier); setConfirmOpen(true); }}
                className="flex-1 py-3 rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700] text-[14px] font-semibold"
              >
                +{tier === "monthly" ? "1 мес" : "1 год"}
              </button>
            ))}
          </div>

          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="text-[14px] text-muted-foreground/60 text-center mt-1"
          >
            {cancelMutation.isPending ? "..." : "Отменить автопродление"}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3 px-4 py-5">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      )}
    </div>
  );
}
