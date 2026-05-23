/**
 * Animated radar chart (SVG). 5 axes.
 * Values normalized 0..1; rendered as colored polygon over grid.
 */
export function StatsRadar({
  values,
  size = 200,
}: {
  values: Array<{ label: string; value: number }>;  // value 0..1
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const n = values.length;
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;

  const grid = (frac: number) =>
    Array.from({ length: n })
      .map((_, i) => {
        const x = cx + Math.cos(angle(i)) * r * frac;
        const y = cy + Math.sin(angle(i)) * r * frac;
        return `${x},${y}`;
      })
      .join(" ");

  const polyPoints = values
    .map((v, i) => {
      const x = cx + Math.cos(angle(i)) * r * Math.max(0.04, Math.min(1, v.value));
      const y = cy + Math.sin(angle(i)) * r * Math.max(0.04, Math.min(1, v.value));
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="block">
      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={grid(f)} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.18" />
      ))}
      {/* Spokes */}
      {Array.from({ length: n }).map((_, i) => {
        const x = cx + Math.cos(angle(i)) * r;
        const y = cy + Math.sin(angle(i)) * r;
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.18" />;
      })}
      {/* Value polygon */}
      <polygon
        className="radar-poly"
        points={polyPoints}
        fill="var(--primary)"
        fillOpacity="0.32"
        stroke="var(--primary)"
        strokeWidth="2"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Vertex dots */}
      {values.map((v, i) => {
        const x = cx + Math.cos(angle(i)) * r * Math.max(0.04, Math.min(1, v.value));
        const y = cy + Math.sin(angle(i)) * r * Math.max(0.04, Math.min(1, v.value));
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" />;
      })}
      {/* Labels */}
      {values.map((v, i) => {
        const x = cx + Math.cos(angle(i)) * (r + 14);
        const y = cy + Math.sin(angle(i)) * (r + 14);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="700"
            fill="currentColor"
            opacity="0.78"
          >
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}
