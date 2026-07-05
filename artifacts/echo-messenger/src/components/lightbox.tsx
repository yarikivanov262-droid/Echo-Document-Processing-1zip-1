import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Download, RotateCw } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(5, Math.max(0.5, s - e.deltaY * 0.001)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const nx = e.clientX - dragStart.current.x;
    const ny = e.clientY - dragStart.current.y;
    dragOffset.current = { x: nx, y: ny };
    setOffset({ x: nx, y: ny });
  };

  const handlePointerUp = () => { dragStart.current = null; };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "image";
    a.click();
  };

  const reset = () => { setScale(1); setRotation(0); setOffset({ x: 0, y: 0 }); dragOffset.current = { x: 0, y: 0 }; };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onWheel={handleWheel}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-white/70 text-sm truncate max-w-xs">{alt}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.min(5, s + 0.5))} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={() => setRotation(r => r + 90)} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <RotateCw className="h-4 w-4" />
            </button>
            <button onClick={handleDownload} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image */}
        <motion.img
          src={src}
          alt={alt}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? "grab" : "default",
            maxWidth: "90vw",
            maxHeight: "88vh",
            objectFit: "contain",
            userSelect: "none",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={reset}
          draggable={false}
        />

        {/* Scale hint */}
        {scale !== 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
            {Math.round(scale * 100)}% · нажмите для сброса
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
