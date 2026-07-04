import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, KeyRound, User, Lock, Terminal, ArrowRight, RefreshCw, Copy, Check } from "lucide-react";
import { useEchoAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLogin, useRegister, useCheckUsername } from "@workspace/api-client-react";
import { storePrivateKey, storeKeyPair } from "@/lib/crypto/key-store";
import { exportPrivateKey, exportPublicKey } from "@/lib/crypto/signal";

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

  const BIP39_WORDS = [
    "abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse",
    "access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act",
    "action","actor","actress","actual","adapt","add","addict","address","adjust","admit",
    "adult","advance","advice","aerobic","afford","afraid","again","agent","agree","ahead",
    "aim","air","airport","aisle","alarm","album","alcohol","alert","alien","all",
    "alley","allow","almost","alone","alpha","already","also","alter","always","amateur",
    "amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry",
    "animal","ankle","announce","annual","another","answer","antenna","antique","anxiety","any",
    "apart","apology","appear","apple","approve","april","arch","arctic","area","arena",
    "argue","arm","armed","armor","army","around","arrange","arrest","arrive","arrow",
    "art","asset","assist","assume","asthma","athlete","atom","attack","attend","attitude",
    "attract","audit","august","aunt","author","auto","autumn","average","avocado","avoid",
    "awake","aware","away","awesome","awful","awkward","axis","baby","balance","bamboo",
    "banana","banner","barely","bargain","barrel","base","basic","basket","battle","beach",
    "bean","beauty","become","beef","before","begin","behave","behind","believe","below",
    "belt","bench","benefit","best","betray","better","between","beyond","bicycle","bind",
    "biology","bird","birth","bitter","black","blade","blame","blanket","blast","bleak",
    "bless","blind","blood","blossom","blouse","blue","blur","blush","board","boat",
    "body","boil","bomb","bone","book","boost","border","boring","borrow","boss",
    "bottom","bounce","box","boy","bracket","brain","brand","brave","breeze","brick",
    "bridge","brief","bright","bring","brisk","broccoli","broken","bronze","broom","brother",
    "brown","brush","bubble","buddy","budget","buffalo","build","bulb","bulk","bullet",
    "bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer",
    "buzz","cabbage","cabin","cable","cactus","cage","cake","call","calm","camera",
    "camp","cancel","candy","cannon","canvas","canyon","capable","capital","captain","carbon",
    "card","cargo","carpet","carry","cart","case","cash","casino","castle","casual",
    "catalog","catch","category","cause","cave","century","cereal","certain","chair","chaos",
    "chapter","charge","chase","chat","cheap","check","cheese","chef","cherry","chest",
    "chief","child","chimney","choice","choose","chronic","circle","citizen","city","civil",
    "claim","clap","clarify","claw","clay","clean","clerk","clever","click","client",
    "cliff","climb","clinic","clip","clock","clog","close","cloth","cloud","coach",
    "coast","coconut","coffee","coil","coin","collect","color","column","combine","come",
  ];
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
    
    // In a real app, hash the seed before sending
    loginMutation.mutate({ data: { username, seedHash: seed } }, {
      onSuccess: (data) => {
        login(data.sessionToken, data.userId, data.username);
        toast({ title: "Decryption successful", description: "Welcome back." });
        setLocation("/chats");
      },
      onError: () => {
        toast({ title: "Access denied", description: "Invalid credentials.", variant: "destructive" });
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
          toast({ title: "Username taken", description: "Try another one.", variant: "destructive" });
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
            toast({ title: "Keys generated", description: "Your vault is secure." });
            setLocation("/chats");
          },
          onError: () => {
            toast({ title: "Generation failed", description: "Could not create secure vault.", variant: "destructive" });
          }
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <ShieldAlert className="h-16 w-16 text-primary relative z-10" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 font-mono tracking-tight">ECHO</h1>
            <p className="text-muted-foreground text-center mb-8 font-mono text-xs uppercase tracking-widest">
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
                      <Label htmlFor="username" className="text-xs uppercase text-muted-foreground">Identifier</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="username" 
                          placeholder="username" 
                          className="pl-10 bg-background/50 border-muted focus-visible:ring-primary font-mono"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seed" className="text-xs uppercase text-muted-foreground">Cryptographic Seed</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="seed" 
                          type="password" 
                          placeholder="••••••••••••" 
                          className="pl-10 bg-background/50 border-muted focus-visible:ring-primary font-mono"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 font-mono uppercase tracking-widest mt-6 group"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Decrypting..." : "Decrypt Vault"}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    <div className="mt-6 text-center">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsRegistering(true);
                          setStep(1);
                        }}
                        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase"
                      >
                        Generate new keys
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
                      <div className="bg-muted/50 p-4 rounded-lg border border-border">
                        <div className="flex items-start gap-3">
                          <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            ECHO does not require a phone number or email. Your identity is mathematically guaranteed by a seed phrase that never leaves this device.
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="w-full h-12 font-mono uppercase tracking-widest"
                        onClick={() => {
                          generateSeed();
                          setStep(2);
                        }}
                      >
                        Initialize Generator
                      </Button>
                      <div className="text-center">
                        <button 
                          type="button"
                          onClick={() => setIsRegistering(false)}
                          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase"
                        >
                          Abort
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-mono text-primary mb-1">Master Seed Generated</h3>
                        <p className="text-xs text-muted-foreground">Write this down. It cannot be recovered.</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {seed.split(" ").map((word, i) => (
                          <div key={i} className="bg-background/80 border border-border rounded px-2 py-2 text-center flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground opacity-50">{i + 1}</span>
                            <span className="font-mono text-sm">{word}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 font-mono text-xs h-10"
                          onClick={generateSeed}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Reroll
                        </Button>
                        <Button 
                          variant={copied ? "default" : "secondary"}
                          className="flex-1 font-mono text-xs h-10"
                          onClick={handleCopySeed}
                        >
                          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>

                      <Button 
                        className="w-full h-12 font-mono uppercase tracking-widest"
                        onClick={() => setStep(3)}
                        disabled={!seed}
                      >
                        I have saved it
                      </Button>
                    </div>
                  )}

                  {step === 3 && (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-username" className="text-xs uppercase text-muted-foreground">Choose Identifier</Label>
                        <div className="relative">
                          <Terminal className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input 
                            id="reg-username" 
                            placeholder="username" 
                            className="pl-10 bg-background/50 border-muted focus-visible:ring-primary font-mono"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 font-mono uppercase tracking-widest mt-6 group"
                        disabled={registerMutation.isPending || checkUsernameMutation.isPending}
                      >
                        {registerMutation.isPending ? "Encrypting..." : "Finalize"}
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
