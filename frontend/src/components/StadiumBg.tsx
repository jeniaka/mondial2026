/**
 * Decorative stadium silhouette SVG. Low-opacity, used as match detail bg.
 */
export function StadiumBg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="sb-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.0" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {/* Stadium curve */}
      <path
        d="M0 200 L0 130 Q40 80 100 70 Q200 50 300 70 Q360 80 400 130 L400 200 Z"
        fill="url(#sb-fade)"
      />
      {/* Crowd dots */}
      {Array.from({ length: 28 }).map((_, i) => {
        const x = 20 + (i * 380) / 28 + ((i * 7) % 9);
        const y = 100 + ((i * 13) % 18);
        return <circle key={i} cx={x} cy={y} r="1.5" fill="currentColor" opacity="0.4" />;
      })}
      {/* Floodlight beams */}
      <path d="M60 60 L40 0 L80 0 Z" fill="currentColor" opacity="0.08" />
      <path d="M340 60 L320 0 L360 0 Z" fill="currentColor" opacity="0.08" />
      {/* Pitch lines */}
      <path d="M100 150 L300 150" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
      <ellipse cx="200" cy="155" rx="36" ry="10" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}
