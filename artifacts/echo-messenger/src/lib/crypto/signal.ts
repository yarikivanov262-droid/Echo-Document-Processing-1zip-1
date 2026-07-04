// ============================================================
// ECHO Signal Protocol: X3DH + Double Ratchet
// All crypto via Web Crypto API (SubtleCrypto), no deps.
// ============================================================

// --------------- Key primitive helpers ---------------

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("spki", bytes, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", bytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
}

export async function dh(privateKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
}

export async function hkdf(input: ArrayBuffer, salt: ArrayBuffer, info: string, length = 32): Promise<ArrayBuffer> {
  const baseKey = await crypto.subtle.importKey("raw", input, "HKDF", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode(info) },
    baseKey,
    length * 8
  );
}

export async function encryptMessage(keyMaterial: ArrayBuffer, plaintext: string): Promise<string> {
  const aesKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(plaintext));
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted as ArrayBuffer), 12);
  return btoa(String.fromCharCode(...result));
}

export async function decryptMessage(keyMaterial: ArrayBuffer, ciphertext: string): Promise<string> {
  const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const aesKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ct);
  return new TextDecoder().decode(decrypted);
}

export async function deriveSessionKey(myPrivate: CryptoKey, theirPublic: CryptoKey): Promise<ArrayBuffer> {
  const shared = await dh(myPrivate, theirPublic);
  return hkdf(shared, new Uint8Array(32).buffer, "echo-session-key", 32);
}

// --------------- Conversion helpers ---------------

export function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function fromB64(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

// HMAC-SHA256 for symmetric chain key derivation
async function hmacSHA256(key: ArrayBuffer, data: Uint8Array): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, data as unknown as ArrayBuffer);
}

// --------------- Double Ratchet types ---------------

export interface MessageHeader {
  dhPub: string;
  pn: number;
  n: number;
  x3dh?: {
    ikPub: string;
    ekPub: string;
    opkId: number | null;
  };
}

export interface EncryptedPayload {
  v: 2;
  header: MessageHeader;
  ct: string;
}

export interface RatchetState {
  dhsPub: string;
  dhsPriv: string;
  dhrPub: string | null;
  rk: string;
  cks: string | null;
  ckr: string | null;
  ns: number;
  nr: number;
  pn: number;
  mkSkipped: Record<string, string>;
}

// --------------- KDF functions ---------------

async function kdfCK(ck: ArrayBuffer): Promise<{ nextCK: ArrayBuffer; mk: ArrayBuffer }> {
  const nextCK = await hmacSHA256(ck, new Uint8Array([1]));
  const mk     = await hmacSHA256(ck, new Uint8Array([2]));
  return { nextCK, mk };
}

async function kdfRK(rk: ArrayBuffer, dhOut: ArrayBuffer): Promise<{ nextRK: ArrayBuffer; nextCK: ArrayBuffer }> {
  const out = await hkdf(dhOut, rk, "EchoRatchet", 64);
  return { nextRK: out.slice(0, 32), nextCK: out.slice(32, 64) };
}

// --------------- X3DH ---------------

export interface X3DHSenderResult {
  masterSecret: ArrayBuffer;
  ekPub: string;
  opkId: number | null;
}

export async function x3dhSend(params: {
  myIdentityPriv: CryptoKey;
  theirIdentityPub: CryptoKey;
  theirSignedPrekey: CryptoKey;
  theirOneTimePrekey: CryptoKey | null;
  opkId: number | null;
}): Promise<X3DHSenderResult> {
  const ek = await generateKeyPair();
  const dh1 = await dh(params.myIdentityPriv, params.theirSignedPrekey);
  const dh2 = await dh(ek.privateKey, params.theirIdentityPub);
  const dh3 = await dh(ek.privateKey, params.theirSignedPrekey);

  let combined: Uint8Array;
  if (params.theirOneTimePrekey) {
    const dh4 = await dh(ek.privateKey, params.theirOneTimePrekey);
    combined = new Uint8Array([...new Uint8Array(dh1), ...new Uint8Array(dh2), ...new Uint8Array(dh3), ...new Uint8Array(dh4)]);
  } else {
    combined = new Uint8Array([...new Uint8Array(dh1), ...new Uint8Array(dh2), ...new Uint8Array(dh3)]);
  }

  const masterSecret = await hkdf(combined.buffer as ArrayBuffer, new Uint8Array(32).buffer as ArrayBuffer, "EchoX3DH", 32);
  return { masterSecret, ekPub: await exportPublicKey(ek.publicKey), opkId: params.opkId };
}

export async function x3dhReceive(params: {
  myIdentityPriv: CryptoKey;
  mySignedPrekeyPriv: CryptoKey;
  myOneTimePrekeyPriv: CryptoKey | null;
  theirIdentityPub: CryptoKey;
  theirEphemeralPub: CryptoKey;
}): Promise<ArrayBuffer> {
  const dh1 = await dh(params.mySignedPrekeyPriv, params.theirIdentityPub);
  const dh2 = await dh(params.myIdentityPriv, params.theirEphemeralPub);
  const dh3 = await dh(params.mySignedPrekeyPriv, params.theirEphemeralPub);

  let combined: Uint8Array;
  if (params.myOneTimePrekeyPriv) {
    const dh4 = await dh(params.myOneTimePrekeyPriv, params.theirEphemeralPub);
    combined = new Uint8Array([...new Uint8Array(dh1), ...new Uint8Array(dh2), ...new Uint8Array(dh3), ...new Uint8Array(dh4)]);
  } else {
    combined = new Uint8Array([...new Uint8Array(dh1), ...new Uint8Array(dh2), ...new Uint8Array(dh3)]);
  }
  return hkdf(combined.buffer as ArrayBuffer, new Uint8Array(32).buffer as ArrayBuffer, "EchoX3DH", 32);
}

// --------------- Ratchet initialization ---------------

export async function initSenderRatchet(masterSecret: ArrayBuffer, theirSignedPrekeyPub: CryptoKey): Promise<RatchetState> {
  const ourDH = await generateKeyPair();
  const dhOut = await dh(ourDH.privateKey, theirSignedPrekeyPub);
  const { nextRK, nextCK } = await kdfRK(masterSecret, dhOut);
  return {
    dhsPub: await exportPublicKey(ourDH.publicKey),
    dhsPriv: await exportPrivateKey(ourDH.privateKey),
    dhrPub: await exportPublicKey(theirSignedPrekeyPub),
    rk: toB64(nextRK),
    cks: toB64(nextCK),
    ckr: null,
    ns: 0, nr: 0, pn: 0, mkSkipped: {},
  };
}

export async function initReceiverRatchet(masterSecret: ArrayBuffer): Promise<RatchetState> {
  const ourDH = await generateKeyPair();
  return {
    dhsPub: await exportPublicKey(ourDH.publicKey),
    dhsPriv: await exportPrivateKey(ourDH.privateKey),
    dhrPub: null,
    rk: toB64(masterSecret),
    cks: null, ckr: null,
    ns: 0, nr: 0, pn: 0, mkSkipped: {},
  };
}

// --------------- Double Ratchet encrypt/decrypt ---------------

export async function drEncrypt(
  state: RatchetState,
  plaintext: string,
  x3dh?: MessageHeader["x3dh"]
): Promise<{ state: RatchetState; payload: EncryptedPayload }> {
  if (!state.cks) throw new Error("DR: no sending chain key");
  const { nextCK, mk } = await kdfCK(fromB64(state.cks));
  const newState: RatchetState = { ...state, cks: toB64(nextCK), ns: state.ns + 1 };
  const ct = await encryptMessage(mk, plaintext);
  const header: MessageHeader = { dhPub: state.dhsPub, pn: state.pn, n: state.ns };
  if (x3dh) header.x3dh = x3dh;
  return { state: newState, payload: { v: 2, header, ct } };
}

export async function drDecrypt(state: RatchetState, payload: EncryptedPayload): Promise<{ state: RatchetState; plaintext: string }> {
  const { header, ct } = payload;

  const skipKey = `${header.dhPub}:${header.n}`;
  if (state.mkSkipped[skipKey]) {
    const mk = fromB64(state.mkSkipped[skipKey]);
    const plaintext = await decryptMessage(mk, ct);
    const newState = { ...state, mkSkipped: { ...state.mkSkipped } };
    delete newState.mkSkipped[skipKey];
    return { state: newState, plaintext };
  }

  let cur = { ...state };
  if (header.dhPub !== state.dhrPub) {
    cur = await skipMessageKeys(cur, header.pn);
    cur = await doDHRatchet(cur, header.dhPub);
  }
  cur = await skipMessageKeys(cur, header.n);

  if (!cur.ckr) throw new Error("DR: no receiving chain key");
  const { nextCK, mk } = await kdfCK(fromB64(cur.ckr));
  cur = { ...cur, ckr: toB64(nextCK), nr: cur.nr + 1 };
  const plaintext = await decryptMessage(mk, ct);
  return { state: cur, plaintext };
}

async function skipMessageKeys(state: RatchetState, until: number): Promise<RatchetState> {
  if (!state.ckr || state.nr >= until) return state;
  if (until - state.nr > 1000) throw new Error("DR: too many skipped messages");
  let cur = { ...state, mkSkipped: { ...state.mkSkipped } };
  while (cur.nr < until) {
    const { nextCK, mk } = await kdfCK(fromB64(cur.ckr!));
    cur = { ...cur, ckr: toB64(nextCK), nr: cur.nr + 1, mkSkipped: { ...cur.mkSkipped, [`${cur.dhrPub}:${cur.nr}`]: toB64(mk) } };
  }
  return cur;
}

async function doDHRatchet(state: RatchetState, newDHrPub: string): Promise<RatchetState> {
  const theirPub = await importPublicKey(newDHrPub);
  const ourPriv  = await importPrivateKey(state.dhsPriv);
  const rk       = fromB64(state.rk);
  const dhOut1   = await dh(ourPriv, theirPub);
  const { nextRK: rk2, nextCK: ckr } = await kdfRK(rk, dhOut1);
  const newDHs = await generateKeyPair();
  const dhOut2 = await dh(newDHs.privateKey, theirPub);
  const { nextRK, nextCK: cks } = await kdfRK(rk2, dhOut2);
  return {
    ...state,
    dhsPub: await exportPublicKey(newDHs.publicKey),
    dhsPriv: await exportPrivateKey(newDHs.privateKey),
    dhrPub: newDHrPub,
    rk: toB64(nextRK),
    cks: toB64(cks),
    ckr: toB64(ckr),
    pn: state.ns,
    ns: 0, nr: 0,
  };
}

// --------------- Safety Numbers ---------------

export async function computeFingerprint(myIKPub: string, theirIKPub: string): Promise<string> {
  const mine   = Uint8Array.from(atob(myIKPub), (c) => c.charCodeAt(0));
  const theirs = Uint8Array.from(atob(theirIKPub), (c) => c.charCodeAt(0));
  const combined = new Uint8Array([...mine, ...theirs]);
  const hash = await crypto.subtle.digest("SHA-256", combined);
  const digits = Array.from(new Uint8Array(hash)).map((b) => b.toString().padStart(3, "0")).join("").slice(0, 60);
  const groups: string[] = [];
  for (let i = 0; i < 60; i += 5) groups.push(digits.slice(i, i + 5));
  return groups.join(" ");
}
