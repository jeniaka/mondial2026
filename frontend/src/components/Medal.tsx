type Rank = 1 | 2 | 3;

const MEDAL: Record<Rank, { face: string; faceHi: string; ring: string; ribbon: string; ribbon2: string }> = {
  1: { face: "#FFD54F", faceHi: "#FFF59D", ring: "#F9A825", ribbon: "#E53935", ribbon2: "#1A237E" },
  2: { face: "#E0E0E0", faceHi: "#F5F5F5", ring: "#9E9E9E", ribbon: "#1565C0", ribbon2: "#0D47A1" },
  3: { face: "#D7A06B", faceHi: "#E8C9A5", ring: "#8D5524", ribbon: "#2E7D32", ribbon2: "#1B5E20" },
};

export function Medal({ rank, size = 48 }: { rank: Rank; size?: number }) {
  const c = MEDAL[rank];
  return (
    <div className="relative inline-block medal-sway" style={{ width: size, height: size * 1.4 }}>
      <svg viewBox="0 0 48 68" width={size} height={size * 1.4} xmlns="http://www.w3.org/2000/svg">
        {/* Ribbon left + right */}
        <polygon points="8,0 20,0 18,28 8,16" fill={c.ribbon} />
        <polygon points="28,0 40,0 40,16 30,28" fill={c.ribbon2} />
        <polygon points="20,0 28,0 28,12 20,12" fill={c.ribbon} opacity="0.8" />
        {/* Medal disc */}
        <circle cx="24" cy="46" r="20" fill={c.ring} />
        <circle cx="24" cy="46" r="17" fill={c.face} />
        <circle cx="24" cy="46" r="13" fill="none" stroke={c.ring} strokeWidth="0.8" opacity="0.6" />
        {/* Highlight */}
        <ellipse cx="19" cy="40" rx="5" ry="3" fill={c.faceHi} opacity="0.8" />
        {/* Star or number */}
        {rank === 1 ? (
          <polygon points="24,36 26.5,42 33,42 27.8,45.8 30,52 24,48.4 18,52 20.2,45.8 15,42 21.5,42"
                   fill="#fff" opacity="0.95" />
        ) : (
          <text x="24" y="51" textAnchor="middle" fontFamily="ui-sans-serif, system-ui"
                fontWeight="900" fontSize="16" fill="#fff" opacity="0.95">{rank}</text>
        )}
      </svg>
      {/* Shine sweep overlay */}
      <span className="medal-shine" style={{ borderRadius: 9999 }} />
    </div>
  );
}
