import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { moleHistory, classificationTypes, getAreaGrowth } from "../data/mockData";

/* ── Color maps ── */
const MC = {
  common: "#10b981",
  congenital: "#0891b2",
  blue: "#6366f1",
  atypical: "#f59e0b",
  spitz: "#f59e0b",
  suspicious: "#ef4444",
};

/* ── Filter config ── */
const FILTERS = [
  { value: "all", label: "All", dot: "#64748b" },
  { value: "low", label: "Low Risk", dot: "#10b981" },
  { value: "review", label: "Review", dot: "#f59e0b" },
  { value: "high", label: "High Risk", dot: "#ef4444" },
];

/* ── Legend items ── */
const LEGEND = [
  { color: "#10b981", label: "Common / Low Risk" },
  { color: "#0891b2", label: "Congenital" },
  { color: "#6366f1", label: "Blue Nevus" },
  { color: "#f59e0b", label: "Atypical / Review" },
  { color: "#ef4444", label: "Suspicious / High" },
];

/* ── Refined body SVG ── */
const BodySilhouette = ({ back }) => (
  <g>
    {/* Soft body shadow */}
    <ellipse cx="50" cy="92" rx="22" ry="2.5" fill="#e2e8f0" opacity="0.5" />

    {/* Body fill with gradient */}
    <defs>
      <linearGradient id={back ? "bodyGradBack" : "bodyGradFront"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={back ? "#e8ecf1" : "#edf0f4"} />
        <stop offset="100%" stopColor={back ? "#d5dbe3" : "#dde2ea"} />
      </linearGradient>
      <filter id="bodyShadow">
        <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#94a3b8" floodOpacity="0.2" />
      </filter>
    </defs>

    <g fill={`url(#${back ? "bodyGradBack" : "bodyGradFront"})`} stroke="#c1c9d4" strokeWidth="0.7" strokeLinejoin="round" filter="url(#bodyShadow)">
      {/* Head */}
      <ellipse cx="50" cy="10.5" rx="7.5" ry="9" />
      {/* Neck */}
      <path d="M46 19 Q46 21 47 22 L53 22 Q54 21 54 19 Z" />
      {/* Shoulders + Torso */}
      <path d="M47 22 L36 24 Q32 25 31 27 L30 30 Q30 32 32 32 L34 31 L34 26 Q35 25 38 24.5
               L38 55 Q38 58 40 59 L42 60 L42 63 Q42 65 44 65
               L56 65 Q58 65 58 63 L58 60 L60 59 Q62 58 62 55
               L62 24.5 Q65 25 66 26 L66 31 L68 32 Q70 32 70 30
               L69 27 Q68 25 64 24 L53 22 Z" />
      {/* Left arm */}
      <path d="M34 26 L32 32 L30 30 Q28 32 26 38 L23 48 Q22 52 21 54
               Q20 56 22 57 L24 56 Q25 55 25.5 53 L28 44 Q29 40 30 38
               L32 34 L34 31 Z" />
      {/* Right arm */}
      <path d="M66 26 L68 32 L70 30 Q72 32 74 38 L77 48 Q78 52 79 54
               Q80 56 78 57 L76 56 Q75 55 74.5 53 L72 44 Q71 40 70 38
               L68 34 L66 31 Z" />
      {/* Left leg */}
      <path d="M44 65 L42 63 L42 60 L40 59 Q39 60 38.5 62
               L37 72 L36 82 Q35.5 86 36 88 L37 90 Q38 91 39 90
               L40 89 Q41 88 41 86 L42 78 L43 72 L44 68 Z" />
      {/* Right leg */}
      <path d="M56 65 L58 63 L58 60 L60 59 Q61 60 61.5 62
               L63 72 L64 82 Q64.5 86 64 88 L63 90 Q62 91 61 90
               L60 89 Q59 88 59 86 L58 78 L57 72 L56 68 Z" />
    </g>

    {/* Anatomical details */}
    {!back ? (
      <g stroke="#bcc5d0" strokeWidth="0.4" fill="none" opacity="0.6">
        {/* Collar line */}
        <path d="M40 25 Q50 28 60 25" />
        {/* Chest line */}
        <path d="M44 32 Q50 34 56 32" />
        {/* Navel */}
        <circle cx="50" cy="48" r="0.8" fill="#bcc5d0" />
        {/* Waist */}
        <path d="M40 55 Q50 53 60 55" />
      </g>
    ) : (
      <g stroke="#bcc5d0" strokeWidth="0.4" fill="none" opacity="0.6">
        {/* Spine */}
        <path d="M50 23 L50 55" strokeDasharray="1.5 1.5" />
        {/* Shoulder blades */}
        <path d="M42 28 Q44 32 42 36" />
        <path d="M58 28 Q56 32 58 36" />
        {/* Lower back */}
        <path d="M44 50 Q50 48 56 50" />
      </g>
    )}
  </g>
);

/* ── Main component ── */
export default function BodyMap({ filter: externalFilter }) {
  const [view, setView] = useState("front");
  const [filter, setFilter] = useState(externalFilter || "all");
  const [tooltip, setTooltip] = useState(null);
  const [focused, setFocused] = useState(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Sync external filter if provided
  const activeFilter = externalFilter !== undefined ? externalFilter : filter;

  const molesInView = moleHistory.filter((m) => {
    if (m.bodyPosition.view !== view) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "low") return m.trendType === "stable" && m.classification !== "suspicious";
    if (activeFilter === "review") return m.classification === "atypical" || m.trendType === "change";
    if (activeFilter === "high" || activeFilter === "high-risk") return m.trendType === "alert" || m.classification === "suspicious";
    if (activeFilter === "recent") {
      const d = new Date(m.scans[0].date);
      const ago = new Date(); ago.setDate(ago.getDate() - 30);
      return d >= ago;
    }
    return true;
  });

  const handleMarkerClick = (mole, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (focused === mole.id) {
      navigate(`/history/${mole.id}`);
    } else {
      setFocused(mole.id);
      showTooltip(mole, e);
    }
  };

  const showTooltip = (mole, e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Support both mouse and touch events
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setTooltip({ mole, x, y });
  };

  const clearFocus = () => {
    setFocused(null);
    setTooltip(null);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "visible", border: "1px solid var(--border)" }}>

      {/* ── Header: toggle + filters ── */}
      <div style={{ padding: "14px 16px 0" }}>
        {/* View toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
        }}>
          <div style={{
            display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
          }}>
            {["front", "back"].map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); clearFocus(); }}
                style={{
                  padding: "7px 22px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.01em",
                  background: view === v ? "white" : "transparent",
                  color: view === v ? "var(--primary)" : "var(--text-muted)",
                  boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s ease", textTransform: "capitalize",
                }}
              >
                {v} View
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        {externalFilter === undefined && (
          <div style={{
            display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
            marginBottom: 8,
          }}>
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => { setFilter(f.value); clearFocus(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    background: active ? `${f.dot}15` : "#f8fafc",
                    color: active ? f.dot : "var(--text-muted)",
                    outline: active ? `1.5px solid ${f.dot}` : "1px solid var(--border)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: f.dot, opacity: active ? 1 : 0.4,
                  }} />
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Body SVG ── */}
      <div
        ref={containerRef}
        style={{
          position: "relative", padding: "8px 16px 12px",
          display: "flex", justifyContent: "center",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          minHeight: 320,
        }}
        onClick={clearFocus}
        onTouchEnd={(e) => { if (e.target === containerRef.current) clearFocus(); }}
      >
        {/* Dim overlay when focused */}
        {focused && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,23,42,0.08)",
            borderRadius: 0, zIndex: 1, pointerEvents: "none",
            transition: "opacity 0.3s",
          }} />
        )}

        <svg viewBox="0 0 100 96" style={{
          width: "100%", maxWidth: 300, height: "auto",
          transition: "opacity 0.3s",
        }}>
          <BodySilhouette back={view === "back"} />

          {/* Mole markers */}
          {molesInView.map((mole) => {
            const { x, y } = mole.bodyPosition;
            const color = MC[mole.classification] || "#94a3b8";
            const growth = getAreaGrowth(mole.scans);
            const isGrowth = growth !== null && growth > 20;
            const isAlert = mole.trendType === "alert" || mole.classification === "suspicious";
            const isFocused = focused === mole.id;

            return (
              <g
                key={mole.id}
                style={{ cursor: "pointer", zIndex: isFocused ? 10 : 2 }}
                onClick={(e) => handleMarkerClick(mole, e.nativeEvent)}
                onTouchEnd={(e) => { e.stopPropagation(); handleMarkerClick(mole, e.nativeEvent); }}
                onMouseEnter={(e) => { if (!focused) showTooltip(mole, e.nativeEvent); }}
                onMouseLeave={() => { if (!focused) setTooltip(null); }}
              >
                {/* Invisible touch target — large enough for fingers (min 44px equivalent) */}
                <circle cx={x} cy={y} r="6" fill="transparent" stroke="none" />
                {/* Glow halo */}
                <circle cx={x} cy={y} r={isFocused ? "5" : "3.8"} fill={color} opacity={isFocused ? 0.18 : 0.12}
                  style={{ transition: "r 0.2s, opacity 0.2s" }} />

                {/* Pulse animation for alerts */}
                {isAlert && (
                  <>
                    <circle cx={x} cy={y} r="2.5" fill="none" stroke={color} strokeWidth="0.5" opacity="0">
                      <animate attributeName="r" from="2.5" to="6" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="2.5" fill="none" stroke={color} strokeWidth="0.4" opacity="0">
                      <animate attributeName="r" from="2.5" to="6" dur="2s" begin="0.7s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0" dur="2s" begin="0.7s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* White ring */}
                <circle cx={x} cy={y} r={isFocused ? "2.8" : "2.3"} fill="white" opacity="0.9"
                  style={{ transition: "r 0.15s" }} />

                {/* Main marker */}
                <circle cx={x} cy={y} r={isFocused ? "2.2" : "1.7"} fill={color}
                  stroke="white" strokeWidth="0.5"
                  style={{ transition: "r 0.15s", filter: isAlert ? `drop-shadow(0 0 1.5px ${color})` : "none" }} />

                {/* Growth arrow */}
                {isGrowth && (
                  <g transform={`translate(${x + 2.5}, ${y - 2.5})`}>
                    <circle r="2" fill="white" />
                    <text textAnchor="middle" dy="0.8" fontSize="2.8" fill="var(--danger)" fontWeight="800">↑</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: Math.max(8, Math.min(tooltip.x - 80, containerRef.current ? containerRef.current.offsetWidth - 180 : 200)),
              top: Math.max(4, tooltip.y - 90),
              background: "white",
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
              border: "1px solid var(--border)",
              zIndex: 20,
              minWidth: 170,
              pointerEvents: "none",
              animation: "tooltipIn 0.15s ease",
            }}
          >
            <style>{`@keyframes tooltipIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: MC[tooltip.mole.classification], flexShrink: 0 }} />
              <p style={{ fontSize: 14, fontWeight: 700 }}>{tooltip.mole.name}</p>
            </div>
            <span style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 10,
              fontSize: 10, fontWeight: 600, marginBottom: 8,
              background: MC[tooltip.mole.classification] + "18",
              color: MC[tooltip.mole.classification],
            }}>
              {classificationTypes[tooltip.mole.classification]?.label}
            </span>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
              <span>⌀ {tooltip.mole.scans[0].diameterMm} mm</span>
              <span>{tooltip.mole.scans[0].areaMm2} mm²</span>
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {tooltip.mole.scans[0].date} · {focused ? "Click again to open" : "Click to focus"}
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", padding: "12px 16px",
        justifyContent: "center", background: "white",
        borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)",
      }}>
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 9, height: 9, borderRadius: "50%", background: color,
              boxShadow: `0 0 4px ${color}40`,
            }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
