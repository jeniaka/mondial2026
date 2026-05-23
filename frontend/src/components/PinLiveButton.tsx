import { Pin, PinOff } from "lucide-react";
import { usePinned } from "@/hooks/usePinned";
import { haptic } from "@/hooks/useHaptic";

/**
 * Pin / unpin a match to the floating live tray.
 * - When `liveOnly` and match isn't live, button is disabled with tooltip
 * - Glowing animated ring when pinned
 */
export function PinLiveButton({
  matchId,
  live,
  size = "md",
  showLabel = false,
  lang = "en",
  onChange,
}: {
  matchId: string;
  live: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  lang?: "he" | "en";
  onChange?: (pinned: boolean) => void;
}) {
  const { isPinned, toggle } = usePinned();
  const pinned = isPinned(matchId);

  const sizeCls =
    size === "sm" ? "h-8 w-8 text-xs" :
    size === "lg" ? "h-11 px-4 text-sm" :
    "h-9 w-9 text-sm";

  const label = pinned
    ? (lang === "he" ? "בטל קיבוע" : "Unpin")
    : (lang === "he" ? "קבע חי" : "Pin live");

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        haptic(pinned ? "light" : "medium");
        const next = toggle(matchId);
        onChange?.(next);
      }}
      aria-pressed={pinned}
      aria-label={label}
      title={!live ? (lang === "he" ? "יוצג כשהמשחק חי" : "Will show when live") : label}
      className={`pin-live-btn press ripple inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition-colors duration-200 ${sizeCls} ${pinned
          ? "is-pinned bg-live/15 text-live"
          : live
            ? "bg-primary/15 text-primary"
            : "bg-secondary text-muted-foreground"}`}
    >
      {pinned ? <PinOff className="h-4 w-4" /> : <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
