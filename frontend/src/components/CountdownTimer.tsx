import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec, ms };
}

/**
 * Live countdown to a target time. Reflows units (days/hours/min/sec).
 * Pulses urgent-red when less than 1 hour, very-urgent when less than 5 min.
 */
export function CountdownTimer({
  target,
  lang = "en",
  compact = false,
}: { target: number | string | Date; lang?: "he" | "en"; compact?: boolean }) {
  const targetMs = typeof target === "number" ? target : new Date(target).getTime();
  const [t, setT] = useState(() => diff(targetMs));

  useEffect(() => {
    const id = setInterval(() => setT(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (t.ms === 0) {
    return <span className="font-bold text-live">{lang === "he" ? "התחיל!" : "STARTED!"}</span>;
  }

  const urgent = t.ms < 60 * 60 * 1000;            // <1h
  const veryUrgent = t.ms < 5 * 60 * 1000;          // <5m

  const labels = lang === "he"
    ? { d: "י", h: "ש", m: "ד", s: "ש" }
    : { d: "d", h: "h", m: "m", s: "s" };

  const Digit = ({ v, l }: { v: number; l: string }) => (
    <span className="inline-flex items-baseline">
      <span key={v} className={`clock-digit font-display font-black ${veryUrgent ? "countdown-urgent" : urgent ? "text-live" : ""}`}>
        {String(v).padStart(2, "0")}
      </span>
      <span className="ms-0.5 text-[10px] font-bold uppercase opacity-70">{l}</span>
    </span>
  );

  return (
    <span className={`inline-flex items-baseline gap-1.5 num ${compact ? "text-sm" : "text-lg"}`}>
      {t.d > 0 && <Digit v={t.d} l={labels.d} />}
      <Digit v={t.h} l={labels.h} />
      <Digit v={t.m} l={labels.m} />
      <Digit v={t.s} l={labels.s} />
    </span>
  );
}
