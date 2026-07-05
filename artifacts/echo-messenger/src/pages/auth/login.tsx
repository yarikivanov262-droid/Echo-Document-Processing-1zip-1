import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, User, Lock, ArrowRight, RefreshCw, Copy, Check } from "lucide-react";
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

export function Login() {
  const [, setLocation] = useLocation();
  const { login } = useEchoAuth();
  const { toast } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // 1 = info, 2 = seed, 3 = creds

  const [username, setUsername] = useState("");
  const [seed, setSeed] = useState("");
  const [copied, setCopied] = useState(false);

  const loginMutation = useLogin();
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

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
    const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
    const privKeyB64 = await exportPrivateKey(keyPair.privateKey);

    checkUsernameMutation.mutate({ data: { username } }, {
      onSuccess: (res) => {
        if (!res.available) {
          toast({ title: "Имя занято", description: "Выберите другое имя пользователя.", variant: "destructive" });
          return;
        }

        registerMutation.mutate({
          data: {
            username,
            seedHash: seed,
            publicIdentityKey: pubKeyB64,
          }
        }, {
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
      {/* Warm background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <EchoLogo size={64} />
            </div>

            <h1 className="text-2xl font-bold text-center mb-1.5">ECHO</h1>
            <p className="text-muted-foreground text-center mb-8 text-sm">
              Говори. Никто не узнает.
            </p>

            <AnimatePresence mode="wait">
              {!isRegistering ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs text-muted-foreground">Имя пользователя</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder="username"
                          className="pl-10 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:border-primary/40"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seed" className="text-xs text-muted-foreground">Сид-фраза</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="seed"
                          type="password"
                          placeholder="12 слов через пробел"
                          className="pl-10 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:border-primary/40"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-2xl mt-6 group bg-gradient-to-br from-[hsl(4_90%_58%)] to-[hsl(14_90%_62%)] hover:opacity-90 text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Входим..." : "Войти"}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(true);
                          setStep(1);
                        }}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Создать новый аккаунт
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="bg-muted/50 p-4 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            ECHO не требует номера телефона или email. Ваша личность защищена сид-фразой, которая никогда не покидает это устройство.
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full h-12 rounded-2xl bg-gradient-to-br from-[hsl(4_90%_58%)] to-[hsl(14_90%_62%)] hover:opacity-90 text-white"
                        onClick={() => {
                          generateSeed();
                          setStep(2);
                        }}
                      >
                        Сгенерировать ключи
                      </Button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setIsRegistering(false)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold text-primary mb-1">Сид-фраза создана</h3>
                        <p className="text-xs text-muted-foreground">Запишите её. Восстановить будет невозможно.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {seed.split(" ").map((word, i) => (
                          <div key={i} className="bg-muted/50 rounded-xl px-2 py-2 text-center flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground opacity-50">{i + 1}</span>
                            <span className="text-sm">{word}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-2xl text-xs h-10"
                          onClick={generateSeed}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Другая фраза
                        </Button>
                        <Button
                          variant={copied ? "default" : "secondary"}
                          className="flex-1 rounded-2xl text-xs h-10"
                          onClick={handleCopySeed}
                        >
                          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          {copied ? "Скопировано" : "Копировать"}
                        </Button>
                      </div>

                      <Button
                        className="w-full h-12 rounded-2xl bg-gradient-to-br from-[hsl(4_90%_58%)] to-[hsl(14_90%_62%)] hover:opacity-90 text-white"
                        onClick={() => setStep(3)}
                        disabled={!seed}
                      >
                        Я записал(а) фразу
                      </Button>
                    </div>
                  )}

                  {step === 3 && (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-username" className="text-xs text-muted-foreground">Придумайте имя пользователя</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="reg-username"
                            placeholder="username"
                            className="pl-10 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:border-primary/40"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-2xl mt-6 group bg-gradient-to-br from-[hsl(4_90%_58%)] to-[hsl(14_90%_62%)] hover:opacity-90 text-white"
                        disabled={registerMutation.isPending || checkUsernameMutation.isPending}
                      >
                        {registerMutation.isPending ? "Создаём..." : "Готово"}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
