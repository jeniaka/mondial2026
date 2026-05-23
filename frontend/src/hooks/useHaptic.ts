/**
 * Lightweight haptic feedback. Uses navigator.vibrate where supported.
 * No-op on unsupported devices (most desktop, iOS Safari without permission).
 */
export type HapticIntensity = "light" | "medium" | "heavy" | "success" | "error";

const PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  success: [10, 40, 18],
  error: [24, 40, 24, 40, 24],
};

export function haptic(intensity: HapticIntensity = "light") {
  try {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(PATTERNS[intensity]);
  } catch {
    /* ignore */
  }
}

export function useHaptic() {
  return haptic;
}
