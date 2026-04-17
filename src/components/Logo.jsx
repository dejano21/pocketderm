export default function Logo({ size = 36 }) {
  return (
    <svg viewBox="0 0 80 90" width={size} height={size * (90/80)} style={{ display: "block" }}>
      {/* D shape: vertical left stroke + rounded right side */}
      {/* Left vertical line */}
      <line x1="18" y1="8" x2="18" y2="82" stroke="#7D9B8C" strokeWidth="8" strokeLinecap="round" />

      {/* Top horizontal + right curve down to bottom + bottom curve back */}
      <path
        d="M18 8 L48 8 Q62 8 62 22 L62 38"
        fill="none" stroke="#7D9B8C" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Bottom rounded part */}
      <path
        d="M18 82 L40 82 Q62 82 62 60 L62 50"
        fill="none" stroke="#7D9B8C" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Horizontal divider line in the middle */}
      <line x1="18" y1="45" x2="62" y2="45" stroke="#7D9B8C" strokeWidth="8" strokeLinecap="round" />

      {/* Small square cutout area top-right (visual gap between top bar and middle bar) */}
      {/* This is achieved by the gap between the top path ending at y=38 and the middle line at y=45 */}

      {/* Mole dot */}
      <circle cx="38" cy="66" r="4" fill="#C4908A" />
    </svg>
  );
}
