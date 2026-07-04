const DB_NAME = "echo_secure";
const STORE = "secure_kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "k" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class SecureStorage {
  private key: CryptoKey | null = null;

  async init(seedPhrase: string, userId: number): Promise<void> {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw", enc.encode(seedPhrase), "PBKDF2", false, ["deriveKey"]
    );
    this.key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(`echo-${userId}`), iterations: 200_000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async set(k: string, value: unknown): Promise<void> {
    if (!this.key) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      new TextEncoder().encode(JSON.stringify(value))
    );
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        k,
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(enc)),
      });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async get<T>(k: string): Promise<T | null> {
    if (!this.key) return null;
    const db = await openDb();
    const stored = await new Promise<{ iv: number[]; data: number[] } | null>((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(k);
      req.onsuccess = () => res(req.result as { iv: number[]; data: number[] } | null);
      req.onerror = () => rej(req.error);
    });
    if (!stored) return null;
    try {
      const dec = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(stored.iv) },
        this.key,
        new Uint8Array(stored.data)
      );
      return JSON.parse(new TextDecoder().decode(dec)) as T;
    } catch {
      return null;
    }
  }

  async delete(k: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(k);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
}

export const secureStorage = new SecureStorage();
