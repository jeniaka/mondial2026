import { useState, type ReactNode } from "react";
import { haptic } from "@/hooks/useHaptic";

/**
 * 3D flip card. Click toggles between front and back faces.
 */
export function FlipCard({
  front,
  back,
  className = "",
  minHeight = 80,
}: { front: ReactNode; back: ReactNode; className?: string; minHeight?: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className={`flip-3d ${className}`}
      style={{ minHeight }}
      onClick={() => { haptic("light"); setFlipped((v) => !v); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setFlipped((v) => !v); }}
    >
      <div className={`flip-3d-inner ${flipped ? "is-flipped" : ""}`} style={{ minHeight }}>
        <div className="flip-face front">{front}</div>
        <div className="flip-face back">{back}</div>
      </div>
    </div>
  );
}
