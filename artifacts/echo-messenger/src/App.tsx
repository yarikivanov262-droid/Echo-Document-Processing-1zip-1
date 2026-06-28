import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EchoAuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "next-themes";
import { Router as WouterRouter } from "wouter";
import { AppRouter } from "./app-router";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const queryClient = new QueryClient();

// Configure the api client to use our localStorage token
setAuthTokenGetter(() => localStorage.getItem("echo_session_token"));

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <EchoAuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
