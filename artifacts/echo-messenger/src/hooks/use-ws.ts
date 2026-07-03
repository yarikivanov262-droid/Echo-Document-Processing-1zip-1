import { useEffect, useCallback } from "react";
import { echoWs, type WsServerEvent } from "@/lib/ws-client";
import { useEchoAuth } from "@/lib/auth-context";

export function useWsConnect() {
  const { sessionToken } = useEchoAuth();

  useEffect(() => {
    if (sessionToken) {
      echoWs.connect(sessionToken);
    } else {
      echoWs.disconnect();
    }
    return () => {
      // keep WS alive across route changes, only disconnect on logout
    };
  }, [sessionToken]);
}

export function useWsEvent(handler: (event: WsServerEvent) => void, deps: unknown[] = []) {
  const stableHandler = useCallback(handler, deps);
  useEffect(() => {
    const off = echoWs.on(stableHandler);
    return () => { off(); };
  }, [stableHandler]);
}
