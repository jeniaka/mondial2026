import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PictureInPicture2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/Flag";
import type { Match } from "@/server/matches.functions";

type WithDocPiP = typeof window & {
  documentPictureInPicture?: {
    requestWindow: (opts: { width: number; height: number }) => Promise<Window>;
    window?: Window | null;
  };
};

function FloatingScoreContent({ match }: { match: Match }) {
  const live = match.status === "LIVE" || match.status === "IN_PLAY" || match.status === "PAUSED";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, color: "#0b1f12" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>
          {match.competition}
        </span>
        {live && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e11d48", color: "white", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, background: "white", borderRadius: 999 }} />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28 }}><Flag country={match.homeTeam} size="lg" /></div>
          <div style={{ marginTop: 4, fontWeight: 700, fontSize: 14 }}>{match.homeTeam}</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {match.homeScore ?? 0}<span style={{ opacity: 0.4 }}> : </span>{match.awayScore ?? 0}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28 }}><Flag country={match.awayTeam} size="lg" /></div>
          <div style={{ marginTop: 4, fontWeight: 700, fontSize: 14 }}>{match.awayTeam}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Picture-in-Picture floating live score (Chromium Document PiP).
 * Falls back to a fixed-position floating panel when API is unavailable.
 */
export function FloatingScore({ match, label }: { match: Match; label: string }) {
  const [open, setOpen] = useState(false);
  const [supportsPip, setSupportsPip] = useState(false);
  const pipWinRef = useRef<Window | null>(null);
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    setSupportsPip(typeof window !== "undefined" && !!(window as WithDocPiP).documentPictureInPicture);
  }, []);

  // Re-render PiP when match data changes
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.render(<FloatingScoreContent match={match} />);
    }
  }, [match]);

  const closePip = () => {
    rootRef.current?.unmount();
    rootRef.current = null;
    pipWinRef.current?.close();
    pipWinRef.current = null;
    setOpen(false);
  };

  const openPip = async () => {
    if (supportsPip) {
      try {
        const w = (window as WithDocPiP).documentPictureInPicture!;
        const pipWin = await w.requestWindow({ width: 360, height: 200 });
        // Copy stylesheets so styles work inside PiP
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const css = Array.from(sheet.cssRules).map((r) => r.cssText).join("");
            const style = pipWin.document.createElement("style");
            style.textContent = css;
            pipWin.document.head.appendChild(style);
          } catch {
            // External stylesheet — copy as link
            if (sheet.href) {
              const link = pipWin.document.createElement("link");
              link.rel = "stylesheet";
              link.href = sheet.href;
              pipWin.document.head.appendChild(link);
            }
          }
        }
        pipWin.document.title = `${match.homeTeam} vs ${match.awayTeam}`;
        const container = pipWin.document.createElement("div");
        pipWin.document.body.style.margin = "0";
        pipWin.document.body.style.background = "#fff";
        pipWin.document.body.appendChild(container);
        const root = createRoot(container);
        rootRef.current = root;
        pipWinRef.current = pipWin;
        root.render(<FloatingScoreContent match={match} />);
        pipWin.addEventListener("pagehide", closePip);
        setOpen(true);
      } catch (e) {
        console.warn("PiP failed, falling back", e);
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={open ? closePip : openPip}
        variant="secondary"
        className="gap-2"
        title={label}
      >
        <PictureInPicture2 className="h-4 w-4" />
        {open ? "✕" : label}
      </Button>

      {/* In-page floating fallback (used when PiP API unavailable or as preview) */}
      {open && !supportsPip && (
        <div className="fixed bottom-6 right-6 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-warm">
          <div className="flex items-center justify-between bg-gradient-warm px-3 py-1.5 text-primary-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Live</span>
            <button onClick={closePip} className="text-primary-foreground/80 hover:text-primary-foreground">✕</button>
          </div>
          <FloatingScoreContent match={match} />
        </div>
      )}
    </>
  );
}
