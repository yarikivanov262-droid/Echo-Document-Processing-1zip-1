import { useCallback } from "react";
import { useEchoAuth } from "./auth-context";
import {
  generateKeyPair, exportPublicKey, exportPrivateKey,
  importPublicKey, importPrivateKey,
  x3dhSend, x3dhReceive,
  initSenderRatchet, initReceiverRatchet,
  drEncrypt, drDecrypt,
  type RatchetState, type EncryptedPayload,
} from "./crypto/signal";
import { loadKeyPair, storeKeyPair, loadSessionState, storeSessionState } from "./crypto/key-store";

export function useE2EE() {
  const { sessionToken } = useEchoAuth();

  const ensureMyKeys = useCallback(async (): Promise<{ pub: string; priv: string } | null> => {
    try {
      const existing = await loadKeyPair("identity");
      if (existing) return existing;

      const ikPair  = await generateKeyPair();
      const ikPub   = await exportPublicKey(ikPair.publicKey);
      const ikPriv  = await exportPrivateKey(ikPair.privateKey);
      await storeKeyPair("identity", ikPub, ikPriv);

      const spkPair = await generateKeyPair();
      const spkPub  = await exportPublicKey(spkPair.publicKey);
      const spkPriv = await exportPrivateKey(spkPair.privateKey);
      await storeKeyPair("signed_prekey", spkPub, spkPriv);

      await fetch("/api/me/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken ?? ""}` },
        body: JSON.stringify({ identityKey: ikPub, signedPrekey: spkPub }),
      });

      return { pub: ikPub, priv: ikPriv };
    } catch {
      return null;
    }
  }, [sessionToken]);

  const encryptForChat = useCallback(async (
    chatId: number,
    partnerUsername: string,
    plaintext: string
  ): Promise<string> => {
    try {
      const myIK = await ensureMyKeys();
      if (!myIK) return plaintext;

      let state = await loadSessionState<RatchetState>(chatId);

      if (!state) {
        const res = await fetch(`/api/users/${partnerUsername}`, {
          headers: { Authorization: `Bearer ${sessionToken ?? ""}` },
        });
        if (!res.ok) return plaintext;
        const partner = await res.json() as {
          identityKey?: string;
          signedPrekey?: string;
          oneTimePrekey?: string | null;
        };
        if (!partner.identityKey || !partner.signedPrekey) return plaintext;

        const myIKPriv    = await importPrivateKey(myIK.priv);
        const theirIKPub  = await importPublicKey(partner.identityKey);
        const theirSPKPub = await importPublicKey(partner.signedPrekey);
        const theirOPKPub = partner.oneTimePrekey
          ? await importPublicKey(partner.oneTimePrekey)
          : null;

        const x3dhResult = await x3dhSend({
          myIdentityPriv: myIKPriv,
          theirIdentityPub: theirIKPub,
          theirSignedPrekey: theirSPKPub,
          theirOneTimePrekey: theirOPKPub,
          opkId: null,
        });

        state = await initSenderRatchet(x3dhResult.masterSecret, theirSPKPub);

        const { state: nextState, payload } = await drEncrypt(state, plaintext, {
          ikPub: myIK.pub,
          ekPub: x3dhResult.ekPub,
          opkId: x3dhResult.opkId,
        });
        await storeSessionState(chatId, nextState);
        return JSON.stringify(payload);
      }

      const { state: nextState, payload } = await drEncrypt(state, plaintext);
      await storeSessionState(chatId, nextState);
      return JSON.stringify(payload);
    } catch {
      return plaintext;
    }
  }, [sessionToken, ensureMyKeys]);

  const decryptForChat = useCallback(async (
    chatId: number,
    encryptedContent: string
  ): Promise<string> => {
    try {
      if (!encryptedContent.startsWith("{")) return encryptedContent;
      const parsed = JSON.parse(encryptedContent) as EncryptedPayload;
      if (parsed.v !== 2) return encryptedContent;

      let state = await loadSessionState<RatchetState>(chatId);

      if (parsed.header.x3dh && !state) {
        const myIK  = await loadKeyPair("identity");
        const mySPK = await loadKeyPair("signed_prekey");
        if (!myIK || !mySPK) return "🔒 [E2EE]";

        const masterSecret = await x3dhReceive({
          myIdentityPriv:      await importPrivateKey(myIK.priv),
          mySignedPrekeyPriv:  await importPrivateKey(mySPK.priv),
          myOneTimePrekeyPriv: null,
          theirIdentityPub:    await importPublicKey(parsed.header.x3dh.ikPub),
          theirEphemeralPub:   await importPublicKey(parsed.header.x3dh.ekPub),
        });

        state = await initReceiverRatchet(masterSecret);
      }

      if (!state) return encryptedContent;

      const { state: nextState, plaintext } = await drDecrypt(state, parsed);
      await storeSessionState(chatId, nextState);
      return plaintext;
    } catch {
      return encryptedContent;
    }
  }, []);

  return { encryptForChat, decryptForChat, ensureMyKeys };
}

export function isE2EEPayload(s: string): boolean {
  if (!s || !s.startsWith("{")) return false;
  try {
    return (JSON.parse(s) as { v?: unknown }).v === 2;
  } catch {
    return false;
  }
}
