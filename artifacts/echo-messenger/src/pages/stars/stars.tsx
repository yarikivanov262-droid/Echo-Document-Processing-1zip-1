import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetStars,
  usePurchaseStars,
  useGiftStars,
  useListUsers,
  getGetStarsQueryKey,
  type PurchaseStarsInputPackageSize,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PACKAGES = [
  { size: 100,  label: "100 Stars",  price: "Бесплатно", popular: false },
  { size: 250,  label: "250 Stars",  price: "Бесплатно", popular: false },
  { size: 500,  label: "500 Stars",  price: "Бесплатно", popular: true  },
  { size: 1000, label: "1 000 Stars",price: "Бесплатно", popular: false },
  { size: 2500, label: "2 500 Stars",price: "Бесплатно", popular: false },
  { size: 5000, label: "5 000 Stars",price: "Бесплатно", popular: false },
];

const TX_ICON: Record<string, string> = {
  purchase:      "⬆️",
  gift_sent:     "🎁",
  gift_received: "🎁",
  tip:           "⭐",
  paid_reaction: "⭐",
  premium:       "👑",
};

const TX_LABEL: Record<string, string> = {
  purchase:      "Пополнение",
  gift_sent:     "Подарок отправлен",
  gift_received: "Подарок получен",
  tip:           "Чаевые",
  paid_reaction: "Платная реакция",
  premium:       "ECHO Premium",
};

// Confetti particles
function Confetti({ active }: { active: boolean }) {
  const colors = ["#FFD700","#FFA500","#FF6B35","#FFE566","#FFBA08"];
  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
                backgroundColor: colors[i % colors.length],
                left: `${5 + (i * 4) % 90}%`,
                top: "-10px",
              }}
              initial={{ y: 0, opacity: 1, rotate: 0 }}
              animate={{ y: "110vh", opacity: 0, rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
              exit={{}}
              transition={{ duration: 1.4 + (i % 4) * 0.3, ease: "easeIn", delay: i * 0.04 }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Gift modal
function GiftModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [amount, setAmount] = useState(100);
  const [step, setStep] = useState<"pick" | "amount" | "confirm">("pick");
  const { data: users } = useListUsers({ search, limit: 20 });
  const giftMutation = useGiftStars();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleGift = () => {
    if (!selectedId) return;
    giftMutation.mutate(
      { data: { recipientId: selectedId, amount } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStarsQueryKey() });
          toast({ title: `✅ Подарено ${amount} ⭐ @${selectedUsername}` });
          onClose();
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Ошибка";
          toast({ title: "Ошибка", description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-md bg-card rounded-t-2xl pb-safe overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <button onClick={onClose} className="text-primary text-[17px]">Отмена</button>
          <span className="text-[17px] font-semibold">Подарить Stars</span>
          <div className="w-16" />
        </div>

        {step === "pick" && (
          <div className="flex flex-col max-h-[60vh]">
            <div className="px-4 pt-3 pb-2">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск пользователя..."
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-[15px] outline-none"
              />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border/30">
              {(users ?? []).map((u) => (
                <div
                  key={u.id}
                  onClick={() => { setSelectedId(u.id); setSelectedUsername(u.username); setStep("amount"); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium">{u.username}</div>
                    {u.displayName && <div className="text-[13px] text-muted-foreground">{u.displayName}</div>}
                  </div>
                </div>
              ))}
              {(users ?? []).length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-[14px]">Введите имя пользователя</div>
              )}
            </div>
          </div>
        )}

        {step === "amount" && (
          <div className="px-4 py-5 flex flex-col gap-5">
            <div className="text-center text-[15px] text-muted-foreground">
              Получатель: <span className="text-foreground font-semibold">@{selectedUsername}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Количество Stars</span>
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 250, 500, 1000, 2500].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAmount(n)}
                    className={cn(
                      "py-3 rounded-xl text-[15px] font-semibold border transition-colors",
                      amount === n
                        ? "bg-[#FFD700] text-black border-[#FFD700]"
                        : "bg-muted border-border/50 text-foreground"
                    )}
                  >
                    ⭐ {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("pick")} className="flex-1 py-3 rounded-xl bg-muted text-[16px] font-semibold">Назад</button>
              <button onClick={() => setStep("confirm")} className="flex-1 py-3 rounded-xl bg-[#FFD700] text-black text-[16px] font-semibold">Далее</button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="px-4 py-6 flex flex-col gap-5 items-center">
            <div className="text-6xl">🎁</div>
            <div className="text-center">
              <div className="text-[20px] font-bold mb-1">Подарить {amount} ⭐?</div>
              <div className="text-[14px] text-muted-foreground">@{selectedUsername} получит Stars сразу</div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setStep("amount")} className="flex-1 py-3 rounded-xl bg-muted text-[16px] font-semibold">Назад</button>
              <button
                onClick={handleGift}
                disabled={giftMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-[#FFD700] text-black text-[16px] font-semibold disabled:opacity-50"
              >
                {giftMutation.isPending ? "..." : "Подарить"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function Stars() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useGetStars();
  const purchaseMutation = usePurchaseStars();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confetti, setConfetti] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);

  const balance = data?.balance ?? 0;
  const transactions = data?.transactions ?? [];

  const handlePurchase = (packageSize: number) => {
    setBuying(packageSize);
    purchaseMutation.mutate(
      { data: { packageSize: packageSize as PurchaseStarsInputPackageSize } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStarsQueryKey() });
          setConfetti(true);
          setTimeout(() => setConfetti(false), 2000);
          toast({ title: `⭐ +${packageSize} Stars зачислено!` });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Ошибка";
          toast({ title: "Ошибка", description: msg, variant: "destructive" });
        },
        onSettled: () => setBuying(null),
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <Confetti active={confetti} />
      <AnimatePresence>{giftOpen && <GiftModal onClose={() => setGiftOpen(false)} />}</AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted/50">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold flex-1">⭐ ECHO Stars</span>
        <button
          onClick={() => setGiftOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-[13px] font-medium hover:bg-muted/70"
        >
          <Send className="h-3.5 w-3.5" />
          Подарить
        </button>
      </div>

      {/* Balance card */}
      <div className="mx-4 mt-5 mb-2 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 p-6 flex flex-col items-center">
        <div className="text-5xl mb-2">⭐</div>
        {isLoading ? (
          <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
        ) : (
          <motion.div
            key={balance}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-[40px] font-bold text-[#FFD700] leading-tight"
          >
            {balance.toLocaleString("ru-RU")}
          </motion.div>
        )}
        <div className="text-[14px] text-muted-foreground mt-1">Stars на балансе</div>
      </div>

      {/* Packages */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide px-0 pb-2">Пополнить</div>
        <div className="grid grid-cols-2 gap-2.5">
          {PACKAGES.map((pkg) => (
            <motion.button
              key={pkg.size}
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePurchase(pkg.size)}
              disabled={buying === pkg.size}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors text-left",
                pkg.popular
                  ? "bg-[#FFD700]/10 border-[#FFD700]/50"
                  : "bg-card border-border/50 hover:bg-muted/40"
              )}
            >
              {pkg.popular && (
                <span className="absolute top-1.5 right-2 text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/15 px-1.5 py-0.5 rounded-full">
                  🔥
                </span>
              )}
              <span className="text-2xl">⭐</span>
              <div>
                <div className="text-[15px] font-bold">{pkg.size.toLocaleString("ru-RU")}</div>
                <div className="text-[12px] text-[#34c759] font-medium">{pkg.price}</div>
              </div>
              {buying === pkg.size && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/60">
                  <Star className="h-5 w-5 text-[#FFD700] animate-spin" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
        <div className="text-[12px] text-muted-foreground/60 mt-2 text-center">
          В демо-режиме Stars начисляются бесплатно
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 pt-4 pb-8">
        <div className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide pb-2">
          История транзакций
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <div className="text-[14px]">Транзакций пока нет</div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl divide-y divide-border/40 overflow-hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="text-2xl shrink-0">{TX_ICON[tx.type] ?? "⭐"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">{TX_LABEL[tx.type] ?? tx.type}</div>
                  {tx.description && (
                    <div className="text-[12px] text-muted-foreground truncate">{tx.description}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground/60">
                    {new Date(tx.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <div className={cn(
                  "text-[16px] font-bold shrink-0",
                  tx.amount > 0 ? "text-[#34c759]" : "text-[#ff3b30]"
                )}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} ⭐
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
