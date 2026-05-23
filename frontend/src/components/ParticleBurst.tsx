import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const GOAL_COLORS = ["var(--accent)", "var(--primary)", "var(--primary-glow)", "#FFD54F", "#FF6F00"];

/**
 * Goal particle burst — explodes from center on trigger change. Used for live
 * score updates ("goooal!" effect).
 */
export function ParticleBurst({ trigger, count = 16 }: { trigger: unknown; count?: number }) {
  const [key, setKey] = useState(0);
  useEffect(() => { setKey((k) => k + 1); }, [trigger]);

  return (
    <div key={key} className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 50 + ((i * 11) % 32);
        const gx = `${Math.cos(angle) * dist}px`;
        const gy = `${Math.sin(angle) * dist}px`;
        const color = GOAL_COLORS[i % GOAL_COLORS.length];
        const style = {
          background: color,
          "--gx": gx,
          "--gy": gy,
          animationDelay: `${(i % 4) * 18}ms`,
        } as CSSProperties;
        return <span key={i} className="goal-particle" style={style} />;
      })}
    </div>
  );
}
