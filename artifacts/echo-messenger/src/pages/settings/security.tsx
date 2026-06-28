import { ShieldAlert, Key, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetSessions, useTerminateSession, useDeleteAccount } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export function SecuritySettings() {
  const { data: sessions } = useGetSessions();
  const terminateMutation = useTerminateSession();
  const deleteMutation = useDeleteAccount();
  const { logout } = useEchoAuth();
  const { toast } = useToast();

  const handleTerminate = (deviceId: string) => {
    terminateMutation.mutate({ data: { deviceId } }, {
      onSuccess: () => {
        toast({ title: "Session terminated" });
      }
    });
  };

  const handleBurnAccount = () => {
    // In reality, require confirmation + password
    deleteMutation.mutate({ data: { seedHash: "dummy" } }, {
      onSuccess: () => {
        toast({ title: "Account burned", variant: "destructive" });
        logout();
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      <div className="flex items-center p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold font-mono tracking-tight text-destructive flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" /> Security Center
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Active Sessions</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {(sessions || [{ deviceId: "current-dev", isCurrent: true, lastUsed: "Now", userAgent: "Echo Web Client" }]).map(s => (
              <div key={s.deviceId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.userAgent || "Unknown Device"}</span>
                      {s.isCurrent && <span className="bg-primary/20 text-primary text-[10px] uppercase font-mono px-2 py-0.5 rounded">Current</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      Last seen: {s.lastUsed} • ID: {s.deviceId.substring(0, 8)}...
                    </div>
                  </div>
                </div>
                {!s.isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => handleTerminate(s.deviceId)} disabled={terminateMutation.isPending}>
                    Terminate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest text-destructive">Danger Zone</h2>
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Burning your account deletes all keys, chats, and metadata from the network. This action is cryptographically irreversible.
            </p>
            <Button 
              variant="destructive" 
              className="w-full font-mono uppercase tracking-widest"
              onClick={handleBurnAccount}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Initiate Protocol: Burn
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
