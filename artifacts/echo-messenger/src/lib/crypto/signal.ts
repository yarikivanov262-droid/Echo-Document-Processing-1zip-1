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
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey("spki", bytes, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
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
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  );
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted as ArrayBuffer), 12);
  return btoa(String.fromCharCode(...result));
}

export async function decryptMessage(keyMaterial: ArrayBuffer, ciphertext: string): Promise<string> {
  const bytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const aesKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ct);
  return new TextDecoder().decode(decrypted);
}

export async function deriveSessionKey(
  myPrivate: CryptoKey,
  theirPublic: CryptoKey
): Promise<ArrayBuffer> {
  const shared = await dh(myPrivate, theirPublic);
  const salt = new Uint8Array(32);
  return hkdf(shared, salt.buffer, "echo-session-key", 32);
}
