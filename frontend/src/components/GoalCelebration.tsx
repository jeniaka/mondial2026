import { useEffect, useState } from "react";
import { BurstConfetti } from "@/components/BurstConfetti";

/**
 * Fullscreen "GOAL!" celebration overlay. Triggered when `trigger` changes.
 * Auto-dismisses after 1.6s.
 */
export function GoalCelebration({ trigger, text = "GOAL!" }: { trigger: unknown; text?: string }) {
  const [active, setActive] = useState<number>(0);
  useEffect(() => {
    if (!trigger) return;
    setActive((n) => n + 1);
    const id = setTimeout(() => setActive(0), 1700);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!active) return null;

  return (
    <div key={active} className="goal-overlay" aria-live="assertive">
      <BurstConfetti trigger={active} count={48} />
      <div className="goal-text">{text}</div>
    </div>
  );
}
