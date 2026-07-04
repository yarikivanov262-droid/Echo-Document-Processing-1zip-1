import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EchoAuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "next-themes";
import { Router as WouterRouter } from "wouter";
import { AppRouter } from "./app-router";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useWsConnect } from "@/hooks/use-ws";
import { PanicButton } from "@/components/panic-button";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("echo_session_token"));

function WsConnector() {
  useWsConnect();
  return null;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <EchoAuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <WsConnector />
              <PanicButton />
              <AppRouter />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </EchoAuthProvider>
    </ThemeProvider>
  );
}

export default App;
