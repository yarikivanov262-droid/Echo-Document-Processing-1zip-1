import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MessageTextProps {
  text: string;
  isSelf?: boolean;
  className?: string;
  id?: string;
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string; href: string }
  | { kind: "mention"; value: string; username: string }
  | { kind: "hashtag"; value: string; tag: string }
  | { kind: "command"; value: string };

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const MENTION_RE = /@([a-zA-Z0-9_]{1,32})/g;
const HASHTAG_RE = /#([а-яёa-z0-9_]{1,64})/gi;
const COMMAND_RE = /\/([a-z_]{1,32})(?:\s|$)/gi;

function parseText(text: string): Segment[] {
  const segments: Segment[] = [];
  const combined = new RegExp(
    `(https?:\\/\\/[^\\s<>"']+)|(@[a-zA-Z0-9_]{1,32})|(#[а-яёa-z0-9_]{1,64})|(\/[a-z_]{1,32}(?=\\s|$))`,
    "gi"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];

    if (match[1]) {
      segments.push({ kind: "url", value: raw, href: raw });
    } else if (match[2]) {
      segments.push({ kind: "mention", value: raw, username: raw.slice(1) });
    } else if (match[3]) {
      segments.push({ kind: "hashtag", value: raw, tag: raw.slice(1) });
    } else if (match[4]) {
      segments.push({ kind: "command", value: raw });
    }

    lastIndex = combined.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function MessageText({ text, isSelf, className }: MessageTextProps) {
  const [, setLocation] = useLocation();

  const segments = parseText(text);

  const linkClass = isSelf
    ? "underline underline-offset-2 text-white/90 hover:text-white"
    : "underline underline-offset-2 text-primary hover:opacity-80";

  return (
    <p className={cn("break-words whitespace-pre-wrap pr-14 scroll-mt-20", className)}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }

        if (seg.kind === "url") {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              onClick={(e) => e.stopPropagation()}
            >
              {seg.value}
            </a>
          );
        }

        if (seg.kind === "mention") {
          return (
            <button
              key={i}
              className={cn(linkClass, "font-medium")}
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/profile/${seg.username}`);
              }}
            >
              {seg.value}
            </button>
          );
        }

        if (seg.kind === "hashtag") {
          return (
            <button
              key={i}
              className={cn(linkClass, "font-medium")}
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/search?q=${encodeURIComponent(seg.tag)}`);
              }}
            >
              {seg.value}
            </button>
          );
        }

        if (seg.kind === "command") {
          return (
            <span key={i} className={cn(linkClass, "font-mono text-[13px] font-semibold")}>
              {seg.value}
            </span>
          );
        }

        return null;
      })}
    </p>
  );
}
