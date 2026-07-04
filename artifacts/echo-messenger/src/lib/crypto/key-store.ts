const DB_NAME = "echo_keys";
const DB_VERSION = 1;
const STORE = "keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(id: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(id: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function storePrivateKey(userId: number, pkcs8B64: string): Promise<void> {
  await idbSet(`identity_private_${userId}`, pkcs8B64);
}

export async function loadPrivateKey(userId: number): Promise<string | null> {
  return idbGet<string>(`identity_private_${userId}`);
}

export async function storeKeyPair(label: string, pub: string, priv: string): Promise<void> {
  await idbSet(`keypair_${label}`, { pub, priv });
}

export async function loadKeyPair(label: string): Promise<{ pub: string; priv: string } | null> {
  return idbGet<{ pub: string; priv: string }>(`keypair_${label}`);
}

export async function storeSessionState(chatId: number, state: unknown): Promise<void> {
  await idbSet(`session_${chatId}`, state);
}

export async function loadSessionState<T>(chatId: number): Promise<T | null> {
  return idbGet<T>(`session_${chatId}`);
}

export async function clearAllKeys(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
