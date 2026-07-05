import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, User, Lock, ArrowRight, RefreshCw, Copy, Check, Shield } from "lucide-react";
import { useEchoAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLogin, useRegister, useCheckUsername } from "@workspace/api-client-react";
import { storePrivateKey, storeKeyPair } from "@/lib/crypto/key-store";
import { exportPrivateKey, exportPublicKey } from "@/lib/crypto/signal";
import { BIP39_WORDS } from "@/lib/bip39-words";
import { EchoLogo } from "@/components/ui/echo-logo";

/* ── floating particles ── */
function Particle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: `hsl(4 90% 60% / 0.35)` }}
      animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0], scale: [0.6, 1.2, 0.6] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const PARTICLES = [
  { x: 10, y: 20, size: 4, duration: 5.5, delay: 0 },
  { x: 85, y: 15, size: 3, duration: 7,   delay: 1.2 },
  { x: 30, y: 80, size: 5, duration: 6.5, delay: 0.8 },
  { x: 70, y: 75, size: 3.5, duration: 8, delay: 2 },
  { x: 55, y: 30, size: 2.5, duration: 6, delay: 3.5 },
  { x: 20, y: 60, size: 4,   duration: 9, delay: 1.5 },
  { x: 90, y: 55, size: 3,   duration: 7, delay: 4 },
];

export function Login() {
  const [, setLocation] = useLocation();
  const { login } = useEchoAuth();
  const { toast } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [seed, setSeed] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loginMutation    = useLogin();
  const registerMutation = useRegister();
  const checkUsernameMutation = useCheckUsername();

  const generateSeed = () => {
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    const words = Array.from(arr).map(n => BIP39_WORDS[n % BIP39_WORDS.length]);
    setSeed(words.join(" "));
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(seed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !seed) return;
    loginMutation.mutate({ data: { username, seedHash: seed } }, {
      onSuccess: (data) => {
        login(data.sessionToken, data.userId, data.username);
        toast({ title: "Добро пожаловать", description: "Вход выполнен." });
        setLocation("/chats");
      },
      onError: () => {
        toast({ title: "Доступ отклонён", description: "Неверные данные для входа.", variant: "destructive" });
      }
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !seed) return;

    const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
    const pubKeyB64  = await exportPublicKey(keyPair.publicKey);
    const privKeyB64 = await exportPrivateKey(keyPair.privateKey);

    checkUsernameMutation.mutate({ data: { username } }, {
      onSuccess: (res) => {
        if (!res.available) {
          toast({ title: "Имя занято", description: "Выберите другое имя пользователя.", variant: "destructive" });
          return;
        }
        registerMutation.mutate({ data: { username, seedHash: seed, publicIdentityKey: pubKeyB64 } }, {
          onSuccess: async (data) => {
            await storePrivateKey(data.userId, privKeyB64);
            await storeKeyPair(`identity_${data.userId}`, pubKeyB64, privKeyB64);
            login(data.sessionToken, data.userId, data.username);
            toast({ title: "Аккаунт создан", description: "Ваше хранилище защищено." });
            setLocation("/chats");
          },
          onError: () => {
            toast({ title: "Не удалось создать аккаунт", description: "Попробуйте снова.", variant: "destructive" });
          }
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <motion.div
          animate={{ x: [0, 30, -15, 0], y: [0, -20, 10, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(4 90% 60% / 0.22) 0%, transparent 65%)", filter: "blur(70px)" }}
        />
        <motion.div
          animate={{ x: [0, -25, 20, 0], y: [0, 15, -10, 0], scale: [1, 0.95, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(340 80% 60% / 0.16) 0%, transparent 65%)", filter: "blur(80px)" }}
        />
        <motion.div
          animate={{ x: [0, 20, -10, 0], y: [0, -15, 25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 7 }}
          className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(4 90% 60% / 0.1) 0%, transparent 65%)", filter: "blur(60px)" }}
        />
      </motion.div>

      {/* Floating particles */}
      {mounted && PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Card */}
      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong rounded-[2rem] overflow-hidden"
        >
          <div className="p-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 260, damping: 18 }}
              className="flex justify-center mb-5"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-[-8px] rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(4 90% 60% / 0.35) 0%, transparent 70%)", filter: "blur(12px)" }}
                />
                <EchoLogo size={68} />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-2xl font-bold text-center mb-1 tracking-tight"
            >
              ECHO
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.4 }}
              className="text-muted-foreground text-center mb-8 text-sm font-medium"
            >
              Говори. Никто не узнает.
            </motion.p>

            <AnimatePresence mode="wait">
              {!isRegistering ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Имя пользователя
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder="username"
                          className="pl-10 h-12 rounded-2xl glass-input border-transparent"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seed" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Сид-фраза
                      </Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="seed"
                          type="password"
                          placeholder="12 слов через пробел"
                          className="pl-10 h-12 rounded-2xl glass-input border-transparent"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                        />
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-2xl group text-white font-semibold text-[15px]"
                        style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px hsl(4 90% 60% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.25)" }}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">
                              ⟳
                            </motion.span>
                            Входим...
                          </span>
                        ) : (
                          <>
                            Войти
                            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.div>

                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(true); setStep(1); }}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                      >
                        Создать новый аккаунт →
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                      >
                        <div className="glass rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: "var(--gradient-primary)" }}>
                              <Shield className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              ECHO не требует номера телефона или email. Ваша личность защищена сид-фразой, которая <strong className="text-foreground">никогда не покидает это устройство</strong>.
                            </p>
                          </div>
                        </div>

                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            className="w-full h-12 rounded-2xl text-white font-semibold text-[15px]"
                            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px hsl(4 90% 60% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.25)" }}
                            onClick={() => { generateSeed(); setStep(2); }}
                          >
                            Сгенерировать ключи ✨
                          </Button>
                        </motion.div>
                        <div className="text-center">
                          <button type="button" onClick={() => setIsRegistering(false)}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            ← Вернуться ко входу
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                      >
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-primary mb-0.5">Сид-фраза создана</h3>
                          <p className="text-xs text-muted-foreground">Запишите её — восстановить будет невозможно</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {seed.split(" ").map((word, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.035, type: "spring", stiffness: 300, damping: 22 }}
                              className="glass rounded-xl px-2 py-2.5 text-center flex items-center gap-1.5"
                            >
                              <span className="text-[10px] text-muted-foreground/50 font-mono">{i + 1}</span>
                              <span className="text-[13px] font-medium truncate">{word}</span>
                            </motion.div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                            <Button variant="outline" className="w-full rounded-2xl text-xs h-10" onClick={generateSeed}>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Другая
                            </Button>
                          </motion.div>
                          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                            <Button
                              variant={copied ? "default" : "secondary"}
                              className="w-full rounded-2xl text-xs h-10"
                              style={copied ? { background: "var(--gradient-primary)" } : {}}
                              onClick={handleCopySeed}
                            >
                              {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                              {copied ? "Скопировано!" : "Копировать"}
                            </Button>
                          </motion.div>
                        </div>

                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            className="w-full h-12 rounded-2xl text-white font-semibold"
                            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px hsl(4 90% 60% / 0.4)" }}
                            onClick={() => setStep(3)}
                            disabled={!seed}
                          >
                            Я сохранил(а) фразу ✓
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-username" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              Придумайте имя пользователя
                            </Label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-username"
                                placeholder="username"
                                className="pl-10 h-12 rounded-2xl glass-input border-transparent"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} className="pt-2">
                            <Button
                              type="submit"
                              className="w-full h-12 rounded-2xl group text-white font-semibold text-[15px]"
                              style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px hsl(4 90% 60% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.25)" }}
                              disabled={registerMutation.isPending || checkUsernameMutation.isPending}
                            >
                              {registerMutation.isPending ? "Создаём..." : "Создать аккаунт"}
                              <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </motion.div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Step indicator */}
                  <div className="flex justify-center gap-2 mt-6">
                    {[1, 2, 3].map(s => (
                      <motion.div
                        key={s}
                        animate={{ width: step === s ? 20 : 6, opacity: step >= s ? 1 : 0.3 }}
                        className="h-1.5 rounded-full"
                        style={{ background: step >= s ? "var(--gradient-primary)" : "hsl(var(--muted))" }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-center justify-center gap-2 mt-5 text-muted-foreground/50 text-xs"
        >
          <Lock className="h-3 w-3" />
          <span>E2EE · Без телефона · Без email</span>
        </motion.div>
      </div>
    </div>
  );
}
