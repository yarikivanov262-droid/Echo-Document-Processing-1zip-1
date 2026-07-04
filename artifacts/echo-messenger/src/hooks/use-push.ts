import { useEffect, useRef } from "react";
import { useGetVapidPublicKey, useSubscribePush } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { isAuthenticated } = useEchoAuth();
  const { data: vapid } = useGetVapidPublicKey({
    query: { enabled: isAuthenticated && "serviceWorker" in navigator && "PushManager" in window, retry: false },
  } as never);
  const subscribePush = useSubscribePush();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !vapid?.publicKey) return;
    if (attempted.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;

    attempted.current = true;

    void (async () => {
      try {
        if (Notification.permission === "denied") return;

        let permission: NotificationPermission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as unknown as BufferSource,
          });
        }

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        subscribePush.mutate({
          data: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
        });
      } catch {
        // Push subscription is best-effort; ignore failures (e.g. unsupported browser, permission dismissed)
      }
    })();
  }, [isAuthenticated, vapid?.publicKey]);
}
