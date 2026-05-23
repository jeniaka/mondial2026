import {
  BallTelstar, BallTango, BallBrazuca, BallTelstar18, BallAlRihla, BallTrionda,
} from "@/components/BallDesigns";

/**
 * Ambient flying World Cup balls — 6 iconic designs, varied sizes/speeds/paths.
 * Decorative only; disabled via prefers-reduced-motion in styles.css.
 */
export function FlyingBall() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Soft liquid blobs behind balls */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <div className="flying-ball flying-ball-1"><BallTrionda className="h-full w-full" /></div>
      <div className="flying-ball flying-ball-2"><BallTelstar className="h-full w-full" /></div>
      <div className="flying-ball flying-ball-3"><BallBrazuca className="h-full w-full" /></div>
      <div className="flying-ball flying-ball-4"><BallTango className="h-full w-full" /></div>
      <div className="flying-ball flying-ball-5"><BallTelstar18 className="h-full w-full" /></div>
      <div className="flying-ball flying-ball-6"><BallAlRihla className="h-full w-full" /></div>
    </div>
  );
}
