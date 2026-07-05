import { useState, useEffect } from "react";
import { Download, FileText, Film, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lightbox } from "./lightbox";

interface MediaMessageProps {
  fileId: string;
  fileName?: string;
  isSelf: boolean;
  token: string;
}

type FileMeta = {
  mimeType: string;
  size: number;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fetches a file using the Authorization header and returns a blob URL.
 * The blob URL is safe (no token in query string) and is revoked on component unmount.
 */
function useSecureFileUrl(fileId: string, token: string) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId || !token) return;
    let revoked = false;
    let url: string | null = null;

    fetch(`/api/files/${fileId}/raw`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        const blob = await r.blob();
        if (revoked) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => { if (!revoked) setError(true); });

    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId, token]);

  return { objectUrl, error };
}

export function MediaMessage({ fileId, fileName, isSelf, token }: MediaMessageProps) {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { objectUrl, error: fetchError } = useSecureFileUrl(fileId, token);

  // Fetch metadata (no binary data, just mimeType + size)
  useEffect(() => {
    if (!fileId || !token) return;
    fetch(`/api/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: unknown) => {
        const data = d as { mimeType?: string; size?: number };
        if (data?.mimeType) setMeta({ mimeType: data.mimeType, size: data.size ?? 0 });
      })
      .catch(() => {});
  }, [fileId, token]);

  const mimeType = meta?.mimeType ?? "";
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const displayName = fileName || fileId.slice(0, 12);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = displayName;
    a.click();
  };

  if (fetchError) {
    return (
      <div className={cn("text-[13px] italic", isSelf ? "text-white/50" : "text-muted-foreground")}>
        Не удалось загрузить файл
      </div>
    );
  }

  // Loading placeholder while blob URL is being fetched
  const isLoading = !objectUrl;

  // ── Image ──────────────────────────────────────────────────────────────────
  if (isImage && objectUrl) {
    return (
      <>
        <div className="relative group cursor-pointer rounded-xl overflow-hidden max-w-[260px]" onClick={() => setLightboxOpen(true)}>
          <img
            src={objectUrl}
            alt={displayName}
            className="w-full object-cover block rounded-xl"
            style={{ maxHeight: 300 }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
          {meta?.size && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
              {formatBytes(meta.size)}
            </div>
          )}
        </div>
        {lightboxOpen && (
          <Lightbox src={objectUrl} alt={displayName} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  if (isVideo && objectUrl) {
    return (
      <div className="rounded-xl overflow-hidden max-w-[280px]">
        <video
          src={objectUrl}
          controls
          preload="metadata"
          className="w-full rounded-xl"
          style={{ maxHeight: 300 }}
        />
        {meta?.size && (
          <div className={cn("text-[12px] mt-1 flex items-center gap-1.5", isSelf ? "text-white/70" : "text-muted-foreground")}>
            <Film className="h-3 w-3" />
            {displayName} · {formatBytes(meta.size)}
          </div>
        )}
      </div>
    );
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  if (isAudio && objectUrl) {
    return (
      <div className="space-y-1">
        <audio src={objectUrl} controls className="w-full max-w-[260px]" preload="metadata" />
        <div className={cn("text-[12px] flex items-center gap-1.5", isSelf ? "text-white/70" : "text-muted-foreground")}>
          <Music className="h-3 w-3" />
          {displayName}{meta?.size ? ` · ${formatBytes(meta.size)}` : ""}
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 max-w-[260px] animate-pulse",
        isSelf ? "bg-white/10" : "bg-muted"
      )}>
        <div className={cn("h-10 w-10 rounded-lg shrink-0", isSelf ? "bg-white/20" : "bg-muted-foreground/20")} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className={cn("h-3 rounded w-3/4", isSelf ? "bg-white/20" : "bg-muted-foreground/20")} />
          <div className={cn("h-2.5 rounded w-1/2", isSelf ? "bg-white/15" : "bg-muted-foreground/15")} />
        </div>
      </div>
    );
  }

  // ── Document / Unknown ─────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleDownload}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 max-w-[260px] w-full transition-colors text-left",
        isSelf ? "bg-white/15 hover:bg-white/25" : "bg-muted hover:bg-muted/70"
      )}
    >
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isSelf ? "bg-white/20" : "bg-primary/15")}>
        <FileText className={cn("h-5 w-5", isSelf ? "text-white" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[14px] font-medium truncate", isSelf ? "text-white" : "text-foreground")}>
          {displayName}
        </div>
        <div className={cn("text-[12px]", isSelf ? "text-white/60" : "text-muted-foreground")}>
          {meta ? formatBytes(meta.size) : "..."}
        </div>
      </div>
      <Download className={cn("h-4 w-4 shrink-0", isSelf ? "text-white/70" : "text-muted-foreground")} />
    </button>
  );
}
