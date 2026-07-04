import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  src: string;
  isSelf: boolean;
  id?: string;
}

const BARS = 30;
const SPEED_OPTIONS = [1, 1.5, 2] as const;

export function VoiceMessagePlayer({ src, isSelf, id }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [bars, setBars] = useState<number[]>(() => generateFakeBars());
  const [realBars, setRealBars] = useState<number[] | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Generate fake waveform for immediate display
  function generateFakeBars(): number[] {
    const result: number[] = [];
    for (let i = 0; i < BARS; i++) {
      result.push(0.2 + Math.random() * 0.8);
    }
    return result;
  }

  // Decode real waveform via Web Audio API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = new AudioContext();
        const resp = await fetch(src);
        const buf = await resp.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        if (cancelled) return;
        const data = decoded.getChannelData(0);
        const blockSize = Math.floor(data.length / BARS);
        const computed: number[] = [];
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(data[i * blockSize + j]);
          }
          computed.push(sum / blockSize);
        }
        const max = Math.max(...computed, 0.001);
        setRealBars(computed.map(v => Math.max(0.08, v / max)));
        void ctx.close();
      } catch {
        // keep fake bars on error
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    if (realBars) setBars(realBars);
  }, [realBars]);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a || a.duration === 0) return;
    setProgress(a.currentTime / a.duration);
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handlePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      a.playbackRate = speed;
      void a.play();
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(tick);
    }
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = ratio * a.duration;
    setProgress(ratio);
  };

  const cycleSpeed = () => {
    const next = SPEED_OPTIONS[(SPEED_OPTIONS.indexOf(speed) + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const playedBars = Math.round(progress * BARS);
  const primary = isSelf ? "#ffffff" : "var(--color-primary, #38bdf8)";
  const muted = isSelf ? "rgba(255,255,255,0.35)" : "rgba(148,163,184,0.5)";

  return (
    <div className="flex items-center gap-2 py-1" id={id}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }}
      />

      {/* Play / Pause */}
      <button
        onClick={handlePlay}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all",
          isSelf ? "bg-white/20 hover:bg-white/30" : "bg-primary/15 hover:bg-primary/25"
        )}
      >
        {isPlaying
          ? <Pause className="h-4 w-4 fill-current" style={{ color: primary }} />
          : <Play className="h-4 w-4 fill-current" style={{ color: primary }} />
        }
      </button>

      {/* Waveform bars */}
      <div
        className="flex items-center gap-[2px] flex-1 cursor-pointer select-none"
        style={{ height: 28, minWidth: 100 }}
        onClick={handleBarClick}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: 2.5,
              height: `${Math.max(8, h * 28)}px`,
              borderRadius: 2,
              background: i < playedBars ? primary : muted,
              transition: "background 0.1s",
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Duration + speed */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[11px] font-mono" style={{ color: primary }}>
          {progress > 0
            ? formatTime(progress * (duration || 0))
            : formatTime(duration)}
        </span>
        <button
          onClick={cycleSpeed}
          className="text-[10px] font-semibold px-1 rounded"
          style={{ color: primary, opacity: 0.75 }}
        >
          {speed}×
        </button>
      </div>
    </div>
  );
}
