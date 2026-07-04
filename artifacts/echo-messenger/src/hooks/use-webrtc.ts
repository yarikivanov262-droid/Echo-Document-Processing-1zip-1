import { useRef, useState, useCallback, useEffect } from "react";
import { echoWs } from "@/lib/ws-client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export type CallState = "connecting" | "ringing" | "active" | "ended";

interface UseWebRTCOptions {
  callId: number;
  targetUserId: number;
  isInitiator: boolean;
  callType: "audio" | "video";
  onEnded?: () => void;
}

export function useWebRTC({ callId, targetUserId, isInitiator, callType, onEnded }: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>(isInitiator ? "ringing" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);

  const init = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video" ? { facingMode: "user" } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          echoWs.send(JSON.stringify({
            type: "call_signal",
            targetUserId,
            signal: { type: "ice-candidate", candidate: e.candidate.toJSON() },
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("active");
        }
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          setCallState("ended");
          onEnded?.();
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        echoWs.send(JSON.stringify({
          type: "call_signal",
          targetUserId,
          signal: { type: "offer", sdp: offer.sdp },
        }));
      }
    } catch (err) {
      console.error("WebRTC init error:", err);
      setCallState("ended");
      onEnded?.();
    }
  }, [callId, targetUserId, isInitiator, callType, onEnded]);

  const handleSignal = useCallback(async (signal: Record<string, unknown>) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (signal.type === "offer") {
      await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp as string });
      remoteDescSet.current = true;

      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      echoWs.send(JSON.stringify({
        type: "call_signal",
        targetUserId,
        signal: { type: "answer", sdp: answer.sdp },
      }));
      setCallState("active");
    } else if (signal.type === "answer") {
      await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp as string });
      remoteDescSet.current = true;

      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidates.current = [];
    } else if (signal.type === "ice-candidate" && signal.candidate) {
      const candidate = signal.candidate as RTCIceCandidateInit;
      if (remoteDescSet.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    }
  }, [targetUserId]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((v) => !v);
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoEnabled((v) => !v);
  }, [localStream]);

  const hangup = useCallback(() => {
    localStream?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("ended");
  }, [localStream]);

  useEffect(() => {
    const unsub = echoWs.on((event) => {
      if (event.type === "call_signal") {
        void handleSignal(event.signal);
      }
      if (event.type === "call_ended" && event.callId === callId) {
        hangup();
        onEnded?.();
      }
    });
    return () => { unsub(); };
  }, [callId, handleSignal, hangup, onEnded]);

  return {
    init,
    hangup,
    toggleMute,
    toggleVideo,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    callState,
    setCallState,
    isMuted,
    isVideoEnabled,
  };
}
