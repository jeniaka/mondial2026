import { useCallback, useEffect, useState } from "react";

const KEY = "pinned";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

/**
 * Shared hook for pinned-match ids, synced across components via storage events
 * and a custom event for same-tab updates.
 */
export function usePinned() {
  const [ids, setIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : read()));

  useEffect(() => {
    const refresh = () => setIds(read());
    window.addEventListener("storage", refresh);
    window.addEventListener("pinned:change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pinned:change", refresh);
    };
  }, []);

  const isPinned = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("pinned:change"));
    setIds(next);
    return next.includes(id);
  }, []);

  const pin = useCallback((id: string) => {
    const cur = read();
    if (cur.includes(id)) return;
    const next = [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("pinned:change"));
    setIds(next);
  }, []);

  const unpin = useCallback((id: string) => {
    const cur = read();
    if (!cur.includes(id)) return;
    const next = cur.filter((x) => x !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("pinned:change"));
    setIds(next);
  }, []);

  return { ids, isPinned, toggle, pin, unpin };
}
