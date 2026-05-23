/**
 * Ambient flying soccer balls — decorative SVG, absolute-positioned within
 * the centered app column. Low-opacity drift + spin.
 * Disabled automatically via prefers-reduced-motion (in styles.css).
 */
function BallSvg() {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" width="100%" height="100%">
      <circle cx="32" cy="32" r="30" fill="white" stroke="black" strokeWidth="1.5" />
      <polygon points="32,12 42,20 38,32 26,32 22,20" fill="black" />
      <polygon points="32,52 22,46 26,34 38,34 42,46" fill="black" opacity="0.85" />
      <polygon points="12,28 22,20 26,32 18,40 8,36" fill="black" opacity="0.75" />
      <polygon points="52,28 56,36 46,40 38,32 42,20" fill="black" opacity="0.75" />
    </svg>
  );
}

export function FlyingBall() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="flying-ball flying-ball-1"><BallSvg /></div>
      <div className="flying-ball flying-ball-2"><BallSvg /></div>
      <div className="flying-ball flying-ball-3"><BallSvg /></div>
    </div>
  );
}
