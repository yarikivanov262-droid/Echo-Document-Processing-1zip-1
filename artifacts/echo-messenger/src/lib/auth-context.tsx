import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface EchoAuthContextType {
  sessionToken: string | null;
  userId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, id: number, user: string) => void;
  logout: () => void;
}

const EchoAuthContext = createContext<EchoAuthContextType | undefined>(undefined);

export function EchoAuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("echo_session_token");
    const id = localStorage.getItem("echo_user_id");
    const user = localStorage.getItem("echo_username");
    if (token && id && user) {
      setSessionToken(token);
      setUserId(parseInt(id, 10));
      setUsername(user);
    }
    setIsLoaded(true);
  }, []);

  const login = (token: string, id: number, user: string) => {
    localStorage.setItem("echo_session_token", token);
    localStorage.setItem("echo_user_id", id.toString());
    localStorage.setItem("echo_username", user);
    setSessionToken(token);
    setUserId(id);
    setUsername(user);
  };

  const logout = () => {
    localStorage.removeItem("echo_session_token");
    localStorage.removeItem("echo_user_id");
    localStorage.removeItem("echo_username");
    setSessionToken(null);
    setUserId(null);
    setUsername(null);
    setLocation("/");
  };

  if (!isLoaded) return null;

  return (
    <EchoAuthContext.Provider
      value={{ sessionToken, userId, username, isAuthenticated: !!sessionToken, login, logout }}
    >
      {children}
    </EchoAuthContext.Provider>
  );
}

export function useEchoAuth() {
  const ctx = useContext(EchoAuthContext);
  if (!ctx) throw new Error("useEchoAuth must be used within EchoAuthProvider");
  return ctx;
}
