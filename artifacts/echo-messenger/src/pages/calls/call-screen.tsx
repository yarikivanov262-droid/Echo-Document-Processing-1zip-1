import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Volume2, RotateCcw, MessageCircle, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChat } from "@workspace/api-client-react";

function getAvatarColor(name: string) {
  const colors = ["#e17076","#faa774","#a695e7","#7bc862","#6ec9cb","#65aadd","#ee7aae"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const chatId = parseInt(id || "0", 10);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId } as never });

  const [callState, setCallState] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chatName = chat?.title ?? `Чат ${chatId}`;
  const initials = chatName.charAt(0).toUpperCase();

  useEffect(() => {
    const t1 = setTimeout(() => setCallState("ringing"), 800);
    const t2 = setTimeout(() => setCallState("active"), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  function handleHangup() {
    setCallState("ended");
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => navigate(-1 as never), 1500);
  }

  const statusLabel = {
    connecting: "Соединение...",
    ringing: "Вызов...",
    active: formatDuration(duration),
    ended: "Звонок завершён",
  }[callState];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between py-12"
      style={{
        background: `linear-gradient(160deg, ${getAvatarColor(chatName)}33 0%, #0f0f0f 60%)`,
        backgroundColor: "#0f0f0f",
      }}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-6">
        <button
          onClick={() => navigate(-1 as never)}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
        <div className="text-white/60 text-[14px]">
          {isVideoOn ? "Видеозвонок" : "Голосовой звонок"} · E2EE
        </div>
        <button
          onClick={() => navigate(`/chat/${chatId}`)}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={callState === "ringing" ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="relative"
        >
          {/* Ripple rings */}
          {callState !== "active" && callState !== "ended" && (
            <>
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-white/20"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1 + i * 0.3, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                />
              ))}
            </>
          )}

          <div
            className="h-28 w-28 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg"
            style={{ backgroundColor: getAvatarColor(chatName) }}
          >
            {initials}
          </div>
        </motion.div>

        <div className="text-center">
          <div className="text-white text-[22px] font-semibold">{chatName}</div>
          <motion.div
            key={statusLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-[16px] mt-1",
              callState === "active" ? "text-green-400 font-mono" : "text-white/60"
            )}
          >
            {statusLabel}
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <AnimatePresence>
        {callState !== "ended" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full px-8"
          >
            {/* Secondary controls */}
            <div className="flex justify-center gap-6 mb-8">
              {[
                { icon: isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />, label: isMuted ? "Включить" : "Выключить", fn: () => setIsMuted(v => !v), active: isMuted },
                { icon: isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />, label: "Камера", fn: () => setIsVideoOn(v => !v), active: isVideoOn },
                { icon: <Volume2 className="h-5 w-5" />, label: "Динамик", fn: () => setIsSpeaker(v => !v), active: isSpeaker },
                { icon: <RotateCcw className="h-5 w-5" />, label: "Перевернуть", fn: () => {}, active: false },
              ].map(({ icon, label, fn, active }) => (
                <button key={label} onClick={fn} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
                    active ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
                  )}>
                    {icon}
                  </div>
                  <span className="text-white/60 text-[11px]">{label}</span>
                </button>
              ))}
            </div>

            {/* Hangup */}
            <div className="flex justify-center">
              <button
                onClick={handleHangup}
                className="h-16 w-16 rounded-full bg-[#ff3b30] flex items-center justify-center shadow-lg hover:bg-[#ff3b30]/90 active:scale-95 transition-transform"
              >
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {callState === "ended" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-[14px]">
          Возврат к чату...
        </motion.div>
      )}
    </div>
  );
}
