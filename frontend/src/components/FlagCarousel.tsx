import { useEffect, useRef } from "react";
import { Flag } from "@/components/Flag";
import { haptic } from "@/hooks/useHaptic";

/**
 * Horizontal scroll-snap carousel of country flags. Selected one scales up + glows.
 */
export function FlagCarousel({
  options,
  value,
  onChange,
  disabled = false,
}: { options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Scroll selected into view on first mount or value change
  useEffect(() => {
    if (!value || !ref.current) return;
    const node = ref.current.querySelector<HTMLElement>(`[data-flag="${CSS.escape(value)}"]`);
    if (node) node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  return (
    <div
      ref={ref}
      className="snap-x scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-2"
    >
      {options.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            data-flag={c}
            disabled={disabled}
            onClick={() => { haptic("light"); onChange(c); }}
            className={`snap-center flag-wave press shrink-0 rounded-2xl border px-3 py-2.5 transition-all duration-300 ${active ? "border-primary bg-primary/15 scale-110 shadow-warm" : "border-border bg-card opacity-70"}`}
          >
            <div className="text-2xl"><Flag country={c} size="lg" /></div>
            <div className="mt-1 max-w-[70px] truncate text-[10px] font-bold">{c}</div>
          </button>
        );
      })}
    </div>
  );
}
