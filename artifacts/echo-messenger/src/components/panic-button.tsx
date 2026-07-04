import { useEffect, useRef } from "react";
import { useEchoAuth } from "@/lib/auth-context";
import { clearAllKeys } from "@/lib/crypto/key-store";

export function PanicButton() {
  const { logout, sessionToken } = useEchoAuth();
  const shakeCount = useRef(0);
  const lastShake = useRef(0);

  const triggerPanic = async () => {
    try {
      await clearAllKeys();
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    const cookies = document.cookie.split(";");
    cookies.forEach((c) => {
      const key = c.split("=")[0].trim();
      document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    try {
      await fetch("/api/sessions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch {}
    window.location.href = "/";
  };

  useEffect(() => {
    const THRESHOLD = 20;
    const REQUIRED = 5;

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.acceleration;
      if (!acc) return;
      const magnitude = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      const now = Date.now();
      if (magnitude > THRESHOLD && now - lastShake.current > 200) {
        shakeCount.current++;
        lastShake.current = now;
        if (shakeCount.current >= REQUIRED) {
          shakeCount.current = 0;
          void triggerPanic();
        }
      }
      if (now - lastShake.current > 2000) shakeCount.current = 0;
    };

    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, []);

  return null;
}
