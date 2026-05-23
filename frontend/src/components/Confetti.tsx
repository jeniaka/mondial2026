import type { CSSProperties } from "react";

/**
 * CSS-only confetti burst. Looping. Disabled via prefers-reduced-motion.
 */
const COLORS = [
  "#F9A825", "#FFD54F", "#E53935", "#1976D2", "#43A047",
  "#9C27B0", "#FF6F00", "#00ACC1", "#EC407A",
];

export function Confetti({ count = 18 }: { count?: number }) {
  return (
    <div className="confetti-host" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * (100 / count)) + (Math.sin(i) * 6);
        const cx = (Math.sin(i * 1.7) * 60).toFixed(0) + "px";
        const dur = (1.8 + ((i * 7) % 16) / 10).toFixed(2) + "s";
        const delay = ((i * 13) % 24 / 10).toFixed(2) + "s";
        const color = COLORS[i % COLORS.length];
        const tilt = (((i * 41) % 60) - 30) + "deg";
        const style = {
          left: `${left}%`,
          background: color,
          transform: `rotate(${tilt})`,
          "--cx": cx,
          "--dur": dur,
          "--delay": delay,
        } as CSSProperties;
        return <span key={i} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}
