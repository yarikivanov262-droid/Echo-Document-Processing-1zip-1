import { HardDrive, Download, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadBackup, useGetLatestBackup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function BackupSettings() {
  const { data: latestBackup, isLoading } = useGetLatestBackup();
  const backupMutation = useUploadBackup();
  const { toast } = useToast();

  const handleBackup = () => {
    backupMutation.mutate({ data: { encryptedData: "mock-encrypted-blob" } }, {
      onSuccess: () => {
        toast({ title: "Vault backed up to network" });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      <div className="flex items-center p-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" /> Encrypted Vault
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-muted/30 border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <HardDrive className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Network Backup</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your messages are encrypted on this device. Create an encrypted backup on the network to restore them on another device.
            </p>
          </div>
          
          <div className="pt-4">
            <Button className="w-full max-w-xs font-mono uppercase tracking-widest" onClick={handleBackup} disabled={backupMutation.isPending}>
              <UploadCloud className="mr-2 h-4 w-4" /> Push to Network
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest mb-4">Latest Backup</h2>
          {isLoading ? (
            <div className="animate-pulse h-10 bg-muted rounded" />
          ) : latestBackup ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">{new Date(latestBackup.createdAt).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">ID: {latestBackup.id}</div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Restore
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No network backups found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
