import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const COLORS = [
  "#F9A825", "#FFD54F", "#E53935", "#1976D2", "#43A047",
  "#9C27B0", "#FF6F00", "#00ACC1", "#EC407A",
];

/**
 * One-shot confetti burst. Triggers when `trigger` value changes.
 * Pieces explode outward from center, fade and rotate.
 */
export function BurstConfetti({ trigger, count = 28 }: { trigger: unknown; count?: number }) {
  const [key, setKey] = useState(0);
  useEffect(() => { setKey((k) => k + 1); }, [trigger]);

  return (
    <div key={key} className="pointer-events-none absolute inset-0 z-30" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 80 + ((i * 17) % 60);
        const bx = `${Math.cos(angle) * dist}px`;
        const by = `${Math.sin(angle) * dist - 30}px`;
        const color = COLORS[i % COLORS.length];
        const tilt = ((i * 31) % 90) - 45;
        const style = {
          background: color,
          transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
          "--bx": bx,
          "--by": by,
          animationDelay: `${(i % 5) * 20}ms`,
        } as CSSProperties;
        return <span key={i} className="burst-piece" style={style} />;
      })}
    </div>
  );
}
