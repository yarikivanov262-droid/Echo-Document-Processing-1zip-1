import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Volume2, VolumeX, RotateCcw, MessageCircle, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChat, useCreateCall, useUpdateCall } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useWebRTC } from "@/hooks/use-webrtc";

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
  const search = useSearch();
  const [, navigate] = useLocation();
  const chatId = parseInt(id || "0", 10);
  const { userId } = useEchoAuth();

  const params = new URLSearchParams(search);
  const isInitiator = params.get("initiator") !== "false";
  const callType = (params.get("type") as "audio" | "video") ?? "audio";
  const calleeIdParam = parseInt(params.get("calleeId") ?? "0", 10);
  const incomingCallId = parseInt(params.get("callId") ?? "0", 10);
  const callerUserId = parseInt(params.get("callerId") ?? "0", 10);

  const targetUserId = isInitiator ? calleeIdParam : callerUserId;

  const [activeCallId, setActiveCallId] = useState<number>(incomingCallId || 0);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callCreated = useRef(false);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId } as never });
  const createCallMutation = useCreateCall();
  const updateCallMutation = useUpdateCall();

  const {
    init,
    hangup,
    toggleMute,
    toggleVideo,
    localVideoRef,
    remoteVideoRef,
    callState,
    setCallState,
    isMuted,
    isVideoEnabled,
  } = useWebRTC({
    callId: activeCallId,
    targetUserId,
    isInitiator,
    callType,
    onEnded: () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => navigate("/calls" as never), 1500);
    },
  });

  const chatName = chat?.title ?? (isInitiator ? `Пользователь ${calleeIdParam}` : `Звонок`);
  const initials = chatName.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(chatName);

  useEffect(() => {
    async function start() {
      if (callCreated.current) return;
      callCreated.current = true;

      if (isInitiator && calleeIdParam) {
        try {
          const result = await createCallMutation.mutateAsync({
            data: { calleeId: calleeIdParam, type: callType, chatId: chatId || undefined },
          });
          setActiveCallId(result.id);
        } catch {
          navigate("/calls" as never);
          return;
        }
      }

      await init();
    }
    void start();
  }, []);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  async function handleHangup() {
    hangup();
    if (timerRef.current) clearInterval(timerRef.current);

    if (activeCallId) {
      try {
        await updateCallMutation.mutateAsync({
          id: activeCallId,
          data: {
            status: callState === "active" ? "ended" : "declined",
            durationSeconds: callState === "active" ? duration : undefined,
          },
        });
      } catch { /* ignore */ }
    }

    setCallState("ended");
    setTimeout(() => navigate("/calls" as never), 1200);
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
        background: `linear-gradient(160deg, ${avatarColor}44 0%, #0f0f0f 55%)`,
        backgroundColor: "#0f0f0f",
      }}
    >
      {callType === "video" && callState === "active" && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute bottom-40 right-4 z-10 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        </>
      )}

      <div className="relative z-10 w-full flex items-center justify-between px-6">
        <button
          onClick={() => navigate("/calls" as never)}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
        <div className="text-white/60 text-[14px]">
          {callType === "video" ? "Видеозвонок" : "Голосовой звонок"} · E2EE
        </div>
        {chatId ? (
          <button
            onClick={() => navigate(`/chat/${chatId}` as never)}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          animate={callState === "ringing" || callState === "connecting" ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="relative"
        >
          {(callState === "connecting" || callState === "ringing") && (
            <>
              {[1, 2, 3].map((i) => (
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
            style={{ backgroundColor: avatarColor }}
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

      <AnimatePresence>
        {callState !== "ended" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 w-full px-8"
          >
            <div className="flex justify-center gap-6 mb-8">
              {[
                {
                  icon: isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />,
                  label: isMuted ? "Вкл. микр." : "Выкл. микр.",
                  fn: toggleMute,
                  active: isMuted,
                },
                {
                  icon: isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />,
                  label: "Камера",
                  fn: toggleVideo,
                  active: isVideoEnabled,
                },
                {
                  icon: isSpeaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />,
                  label: "Динамик",
                  fn: () => setIsSpeaker((v) => !v),
                  active: isSpeaker,
                },
                {
                  icon: <RotateCcw className="h-5 w-5" />,
                  label: "Перевернуть",
                  fn: () => {},
                  active: false,
                },
              ].map(({ icon, label, fn, active }) => (
                <button key={label} onClick={fn} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
                      active ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
                    )}
                  >
                    {icon}
                  </div>
                  <span className="text-white/60 text-[11px]">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => void handleHangup()}
                className="h-16 w-16 rounded-full bg-[#ff3b30] flex items-center justify-center shadow-lg hover:bg-[#ff3b30]/90 active:scale-95 transition-transform"
              >
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {callState === "ended" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-white/50 text-[14px]"
        >
          Возврат к звонкам...
        </motion.div>
      )}
    </div>
  );
}
