import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MessageTextProps {
  text: string;
  isSelf?: boolean;
  className?: string;
  id?: string;
}

// ── Segment types ─────────────────────────────────────────────────────────────
type Segment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "strike"; value: string }
  | { kind: "spoiler"; value: string }
  | { kind: "url"; value: string; href: string }
  | { kind: "mention"; value: string; username: string }
  | { kind: "hashtag"; value: string; tag: string };

// ── Parser ────────────────────────────────────────────────────────────────────
// Order matters: longer/more-specific patterns first.
// NOTE: All sub-patterns compiled into one RegExp with "gi" flags.
// The "i" flag applies to hashtag matching and is intentional for the whole pattern.
const PATTERN = new RegExp(
  [
    /\|\|(.+?)\|\|/,          // ||spoiler||
    /\*\*(.+?)\*\*/,          // **bold**
    /~~(.+?)~~/,              // ~~strike~~
    /`([^`]+)`/,              // `code`
    /\*([^*\n]+?)\*/,         // *italic*
    /_([^_\n]+?)_/,           // _italic_
    /https?:\/\/[^\s<>"']+/,  // URL (no capture group — matched via full)
    /@([a-zA-Z0-9_]{1,32})/,  // @mention
    /#([а-яёa-z0-9_]{1,64})/, // #hashtag (case-insensitive via "i" flag on whole PATTERN)
  ]
    .map(r => r.source)
    .join("|"),
  "gi"  // "g" for repeated matching, "i" for case-insensitive hashtags/mentions
);

function parseText(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  PATTERN.lastIndex = 0;

  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }

    const [full, spoiler, bold, strike, code, italic1, italic2, , mention, hashtag] = match;

    if (spoiler !== undefined)       segments.push({ kind: "spoiler", value: spoiler });
    else if (bold !== undefined)     segments.push({ kind: "bold",    value: bold });
    else if (strike !== undefined)   segments.push({ kind: "strike",  value: strike });
    else if (code !== undefined)     segments.push({ kind: "code",    value: code });
    else if (italic1 !== undefined)  segments.push({ kind: "italic",  value: italic1 });
    else if (italic2 !== undefined)  segments.push({ kind: "italic",  value: italic2 });
    else if (full.startsWith("http")) segments.push({ kind: "url",    value: full, href: full });
    else if (mention !== undefined)  segments.push({ kind: "mention", value: full, username: mention });
    else if (hashtag !== undefined)  segments.push({ kind: "hashtag", value: full, tag: hashtag });
    else                             segments.push({ kind: "text",    value: full });

    lastIndex = PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

// ── Spoiler inline component ──────────────────────────────────────────────────
function Spoiler({ text, isSelf }: { text: string; isSelf?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setRevealed(v => !v); }}
      className={cn(
        "cursor-pointer rounded px-0.5 transition-all select-none",
        revealed
          ? "bg-transparent"
          : isSelf ? "bg-white/30 text-transparent" : "bg-foreground/20 text-transparent"
      )}
      title={revealed ? "скрыть" : "показать"}
    >
      {text}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MessageText({ text, isSelf, className, id }: MessageTextProps) {
  const [, setLocation] = useLocation();

  const segments = parseText(text);

  const linkClass = isSelf
    ? "underline underline-offset-2 text-white/90 hover:text-white"
    : "underline underline-offset-2 text-primary hover:opacity-80";

  return (
    <p id={id} className={cn("break-words whitespace-pre-wrap pr-14 scroll-mt-20 chat-msg-text", className)}>
      {segments.map((seg, i) => {
        switch (seg.kind) {
          case "text":
            return <span key={i}>{seg.value}</span>;

          case "bold":
            return <strong key={i} className="font-semibold">{seg.value}</strong>;

          case "italic":
            return <em key={i} className="italic">{seg.value}</em>;

          case "code":
            return (
              <code
                key={i}
                className={cn(
                  "font-mono text-[0.88em] px-1 py-0.5 rounded",
                  isSelf ? "bg-white/20 text-white" : "bg-muted text-foreground"
                )}
              >
                {seg.value}
              </code>
            );

          case "strike":
            return <s key={i} className="opacity-70">{seg.value}</s>;

          case "spoiler":
            return <Spoiler key={i} text={seg.value} isSelf={isSelf} />;

          case "url":
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

          case "mention":
            return (
              <button
                key={i}
                className={cn(linkClass, "font-medium")}
                onClick={(e) => { e.stopPropagation(); setLocation(`/profile/${seg.username}`); }}
              >
                {seg.value}
              </button>
            );

          case "hashtag":
            return (
              <button
                key={i}
                className={cn(linkClass, "font-medium")}
                onClick={(e) => { e.stopPropagation(); setLocation(`/search?q=${encodeURIComponent(seg.tag)}`); }}
              >
                {seg.value}
              </button>
            );

          default:
            return null;
        }
      })}
    </p>
  );
}

// ── Format helpers (used by input toolbar) ────────────────────────────────────
export function wrapSelection(
  value: string,
  selStart: number,
  selEnd: number,
  marker: string,
  closeMarker?: string
): { newValue: string; newStart: number; newEnd: number } {
  const close = closeMarker ?? marker;
  const selected = value.slice(selStart, selEnd);
  const newValue = value.slice(0, selStart) + marker + selected + close + value.slice(selEnd);
  return {
    newValue,
    newStart: selStart + marker.length,
    newEnd: selEnd + marker.length,
  };
}
