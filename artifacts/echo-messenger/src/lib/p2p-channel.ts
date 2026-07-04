import { echoWs } from "./ws-client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type P2PMessageHandler = (data: string) => void;

export class P2PChannel {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private targetUserId: number | null = null;
  private onMessageCallback: P2PMessageHandler | null = null;

  onMessage(cb: P2PMessageHandler) {
    this.onMessageCallback = cb;
    return this;
  }

  async initiate(targetUserId: number): Promise<void> {
    this.targetUserId = targetUserId;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.dc = this.pc.createDataChannel("messages", { ordered: true });

    this.dc.onopen = () => console.log("[P2P] DataChannel open");
    this.dc.onclose = () => console.log("[P2P] DataChannel closed");
    this.dc.onmessage = (e) => this.onMessageCallback?.(e.data as string);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        echoWs.send(JSON.stringify({
          type: "p2p-ice",
          targetUserId,
          candidate: e.candidate,
        }));
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    echoWs.send(JSON.stringify({
      type: "p2p-offer",
      targetUserId,
      sdp: offer.sdp,
    }));
  }

  async handleOffer(fromUserId: number, sdp: string): Promise<void> {
    this.targetUserId = fromUserId;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.ondatachannel = (e) => {
      this.dc = e.channel;
      this.dc.onopen = () => console.log("[P2P] DataChannel open (answer)");
      this.dc.onmessage = (ev) => this.onMessageCallback?.(ev.data as string);
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        echoWs.send(JSON.stringify({
          type: "p2p-ice",
          targetUserId: fromUserId,
          candidate: e.candidate,
        }));
      }
    };

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    echoWs.send(JSON.stringify({
      type: "p2p-answer",
      targetUserId: fromUserId,
      sdp: answer.sdp,
    }));
  }

  async handleAnswer(sdp: string): Promise<void> {
    await this.pc?.setRemoteDescription({ type: "answer", sdp });
  }

  async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc?.addIceCandidate(candidate);
  }

  send(encryptedMsg: string): boolean {
    if (this.dc?.readyState === "open") {
      this.dc.send(encryptedMsg);
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    return this.dc?.readyState === "open";
  }

  close(): void {
    this.dc?.close();
    this.pc?.close();
    this.pc = null;
    this.dc = null;
  }
}

const p2pChannels = new Map<number, P2PChannel>();

export function getOrCreateP2PChannel(userId: number): P2PChannel {
  if (!p2pChannels.has(userId)) {
    p2pChannels.set(userId, new P2PChannel());
  }
  return p2pChannels.get(userId)!;
}

export function closeP2PChannel(userId: number): void {
  p2pChannels.get(userId)?.close();
  p2pChannels.delete(userId);
}
