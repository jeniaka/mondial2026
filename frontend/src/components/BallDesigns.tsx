/**
 * Iconic World Cup balls — stylized SVGs (not photorealistic).
 * All 64×64 viewBox. Pass className for sizing.
 */

export function BallTelstar({ className }: { className?: string }) {
  // 1970 Telstar — classic B&W with pentagonal panels
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="30" fill="#FAFAFA" stroke="#0a0a0a" strokeWidth="1.5" />
      <polygon points="32,12 42,20 38,32 26,32 22,20" fill="#0a0a0a" />
      <polygon points="32,52 22,46 26,34 38,34 42,46" fill="#0a0a0a" opacity="0.92" />
      <polygon points="12,28 22,20 26,32 18,40 8,36" fill="#0a0a0a" opacity="0.85" />
      <polygon points="52,28 56,36 46,40 38,32 42,20" fill="#0a0a0a" opacity="0.85" />
    </svg>
  );
}

export function BallTango({ className }: { className?: string }) {
  // 1978 Tango — black triads on white
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="tg-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#d8d8d8" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#tg-shade)" stroke="#0a0a0a" strokeWidth="1.4" />
      <g fill="none" stroke="#0a0a0a" strokeWidth="2.6" strokeLinecap="round">
        <path d="M22 16 Q32 24 42 16" />
        <path d="M22 48 Q32 40 42 48" />
        <path d="M14 22 Q22 32 14 42" />
        <path d="M50 22 Q42 32 50 42" />
        <circle cx="32" cy="32" r="6" fill="#0a0a0a" stroke="none" />
      </g>
    </svg>
  );
}

export function BallBrazuca({ className }: { className?: string }) {
  // 2014 Brazuca — neon multicolor swirls (Brazil)
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="bz-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bz-shade)" />
      <path d="M32 4 Q48 18 32 32 Q16 46 32 60" stroke="#FFB300" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M4 32 Q18 16 32 32 Q46 48 60 32" stroke="#00B8D4" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M14 14 Q32 28 50 14" stroke="#76FF03" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M14 50 Q32 36 50 50" stroke="#FF3D00" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#0a0a0a" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function BallTelstar18({ className }: { className?: string }) {
  // 2018 Telstar 18 — modern gray with black panels + red dot
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="t18-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="100%" stopColor="#9e9e9e" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#t18-shade)" stroke="#0a0a0a" strokeWidth="1.2" />
      <polygon points="32,8 46,16 44,32 32,40 20,32 18,16" fill="#1a1a1a" opacity="0.95" />
      <polygon points="32,40 44,32 50,46 36,56 28,52" fill="#1a1a1a" opacity="0.85" />
      <polygon points="20,32 14,46 28,52 32,40" fill="#1a1a1a" opacity="0.85" />
      <circle cx="32" cy="24" r="3" fill="#E53935" />
    </svg>
  );
}

export function BallAlRihla({ className }: { className?: string }) {
  // 2022 Al Rihla — pink/teal/red sweeping panels (Qatar)
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="ar-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#eee" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#ar-shade)" />
      <path d="M2 32 Q16 18 32 24 Q48 30 62 22 L62 32 Q48 26 32 32 Q16 38 2 36 Z" fill="#FF4081" opacity="0.85" />
      <path d="M14 50 Q28 38 44 46 Q54 50 60 44 L60 56 Q44 60 28 56 Q18 54 12 58 Z" fill="#00ACC1" opacity="0.75" />
      <path d="M8 14 Q24 6 38 12" stroke="#E53935" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#0a0a0a" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function BallTrionda({ className }: { className?: string }) {
  // 2026 Trionda — red/green/blue triangles for USA·CAN·MEX
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="tr-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#tr-shade)" />
      <polygon points="32,6 50,22 40,32 32,28 24,32 14,22" fill="#D32F2F" opacity="0.95" />
      <polygon points="14,22 24,32 22,46 10,42 6,30" fill="#2E7D32" opacity="0.92" />
      <polygon points="50,22 58,30 54,42 42,46 40,32" fill="#1565C0" opacity="0.92" />
      <polygon points="22,46 32,38 42,46 36,58 28,58" fill="#0a0a0a" opacity="0.65" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#0a0a0a" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
