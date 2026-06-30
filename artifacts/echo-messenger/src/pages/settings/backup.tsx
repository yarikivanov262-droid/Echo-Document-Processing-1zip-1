import { HardDrive, Download, UploadCloud, CheckCircle } from "lucide-react";
import { useUploadBackup, useGetLatestBackup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function generateFakeEncryptedData() {
  const bytes = new Uint8Array(128);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function BackupSettings() {
  const { data: latestBackup, isLoading, refetch } = useGetLatestBackup();
  const backupMutation = useUploadBackup();
  const { toast } = useToast();

  const handleBackup = () => {
    backupMutation.mutate({ data: { encryptedData: generateFakeEncryptedData() } }, {
      onSuccess: () => {
        toast({ title: "Резервная копия создана" });
        refetch();
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось создать резервную копию", variant: "destructive" });
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-center px-4 pt-3 pb-2 shrink-0">
        <h1 className="text-[17px] font-semibold">Шифрованный архив</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Status card */}
        <div className="rounded-[12px] bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-5">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HardDrive className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[17px] font-bold">Сетевой архив</div>
              <div className="text-[13px] text-muted-foreground mt-0.5">
                Сообщения зашифрованы на устройстве. Архив позволяет восстановить их на новом устройстве.
              </div>
            </div>
          </div>

          {/* Latest backup info */}
          <div className="px-4 py-3 border-t border-border/60">
            {isLoading ? (
              <div className="animate-pulse h-5 bg-muted rounded w-1/2" />
            ) : latestBackup ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#34c759]" />
                  <div>
                    <div className="text-[14px] font-medium">Последний архив</div>
                    <div className="text-[12px] text-muted-foreground">
                      {new Date(latestBackup.createdAt).toLocaleString("ru")}
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-primary text-[14px] hover:opacity-70">
                  <Download className="h-4 w-4" />
                  Восстановить
                </button>
              </div>
            ) : (
              <div className="text-[13px] text-muted-foreground">Нет сохранённых архивов</div>
            )}
          </div>
        </div>

        {/* Push button */}
        <button
          onClick={handleBackup}
          disabled={backupMutation.isPending}
          className={cn(
            "w-full py-3.5 rounded-[12px] flex items-center justify-center gap-2 text-[16px] font-medium transition-opacity",
            backupMutation.isPending ? "opacity-50" : "hover:opacity-90",
            "bg-primary text-white"
          )}
        >
          <UploadCloud className="h-5 w-5" />
          {backupMutation.isPending ? "Загрузка..." : "Сохранить в сеть"}
        </button>

        {/* Info rows */}
        <div className="rounded-[12px] overflow-hidden bg-card divide-y divide-border/60">
          {[
            { label: "Шифрование", value: "AES-256 E2E" },
            { label: "Хранилище", value: "Децентрализованное" },
            { label: "Автоархив", value: "Выкл." },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px]">{row.label}</span>
              <span className="text-[14px] text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
