import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewProps {
  url: string;
  isSelf: boolean;
  token: string;
}

type PreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

// Simple cache to avoid refetching the same URL
const previewCache = new Map<string, PreviewData | null>();

export function LinkPreview({ url, isSelf, token }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null | undefined>(undefined);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url) ?? null);
      return;
    }

    let cancelled = false;
    fetch(`/api/links/preview?url=${encodeURIComponent(url)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: unknown) => {
        if (cancelled) return;
        const result = d as PreviewData | null;
        const hasContent = result?.title || result?.description || result?.image;
        const final = hasContent ? result : null;
        previewCache.set(url, final);
        setData(final);
      })
      .catch(() => {
        if (!cancelled) { previewCache.set(url, null); setData(null); }
      });

    return () => { cancelled = true; };
  }, [url, token]);

  // Not ready yet or no data
  if (data === undefined || data === null) return null;

  const hostname = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "mt-1.5 block rounded-xl overflow-hidden border transition-opacity hover:opacity-85 no-underline max-w-[260px]",
        isSelf ? "border-white/20 bg-white/10" : "border-border bg-card"
      )}
    >
      {data.image && (
        <img
          src={data.image}
          alt={data.title}
          className="w-full object-cover"
          style={{ maxHeight: 140 }}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="px-3 py-2.5 space-y-0.5">
        <div className={cn("text-[11px] font-medium uppercase tracking-wide", isSelf ? "text-white/50" : "text-muted-foreground")}>
          {data.siteName ?? hostname}
        </div>
        {data.title && (
          <div className={cn("text-[13px] font-semibold leading-snug line-clamp-2", isSelf ? "text-white" : "text-foreground")}>
            {data.title}
          </div>
        )}
        {data.description && (
          <div className={cn("text-[12px] leading-snug line-clamp-2", isSelf ? "text-white/65" : "text-muted-foreground")}>
            {data.description}
          </div>
        )}
        <div className={cn("flex items-center gap-1 text-[11px] pt-0.5", isSelf ? "text-white/40" : "text-muted-foreground/70")}>
          <ExternalLink className="h-2.5 w-2.5" />
          {hostname}
        </div>
      </div>
    </a>
  );
}

// Extract the first URL from plain text (same as the pattern in message-text.tsx)
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function extractFirstUrl(text: string): string | null {
  URL_PATTERN.lastIndex = 0;
  const match = URL_PATTERN.exec(text);
  return match ? match[0] : null;
}
