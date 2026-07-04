import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useWsEvent } from "@/hooks/use-ws";
import { useUpdateCall } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/ui/user-avatar";

interface IncomingCall {
  callId: number;
  callUuid: string;
  callerId: number;
  callerUsername: string;
  callType: "audio" | "video";
}

export function IncomingCallBanner() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [, navigate] = useLocation();
  const updateCall = useUpdateCall();

  useWsEvent((event) => {
    if (event.type === "incoming_call") {
      setIncomingCall({
        callId: event.callId,
        callUuid: event.callUuid,
        callerId: event.callerId,
        callerUsername: event.callerUsername,
        callType: event.callType,
      });
    }
    if (event.type === "call_ended") {
      setIncomingCall((prev) => (prev?.callId === event.callId ? null : prev));
    }
  });

  function handleAccept() {
    if (!incomingCall) return;
    const { callId, callerId, callType } = incomingCall;
    setIncomingCall(null);
    navigate(
      `/call?callId=${callId}&callerId=${callerId}&type=${callType}&initiator=false` as never
    );
  }

  async function handleDecline() {
    if (!incomingCall) return;
    const id = incomingCall.callId;
    setIncomingCall(null);
    try {
      await updateCall.mutateAsync({ id, data: { status: "declined" } });
    } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-4 left-4 right-4 z-[100] rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(20, 20, 20, 0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <UserAvatar name={incomingCall.callerUsername} size="sm" />

            <div className="flex-1 min-w-0">
              <div className="text-white text-[15px] font-semibold truncate">
                {incomingCall.callerUsername}
              </div>
              <div className="text-white/60 text-[13px] flex items-center gap-1">
                {incomingCall.callType === "video" ? (
                  <><Video className="h-3 w-3" /> Входящий видеозвонок</>
                ) : (
                  <><Phone className="h-3 w-3" /> Входящий голосовой звонок</>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => void handleDecline()}
                className="h-11 w-11 rounded-full bg-[#ff3b30] flex items-center justify-center hover:bg-[#ff3b30]/90 active:scale-95 transition-transform"
                title="Отклонить"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={handleAccept}
                className="h-11 w-11 rounded-full bg-[#34c759] flex items-center justify-center hover:bg-[#34c759]/90 active:scale-95 transition-transform"
                title="Принять"
              >
                <Phone className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="h-1 w-full bg-white/5">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 30, ease: "linear" }}
              onAnimationComplete={() => void handleDecline()}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
