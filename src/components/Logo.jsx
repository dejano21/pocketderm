export default function Logo({ size = 36 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <path
        d="M30 15 L30 5 Q30 2 33 2 L55 2 Q80 2 80 30 L80 60 Q80 90 55 90 L33 90 Q30 90 30 87 L30 55 Q30 50 35 50 L55 50 Q60 50 60 45 L60 30 Q60 15 55 15 Z"
        fill="none" stroke="#7D9B8C" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />
      <line x1="30" y1="50" x2="60" y2="50" stroke="#7D9B8C" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="72" r="5" fill="#C4908A" />
    </svg>
  );
}
