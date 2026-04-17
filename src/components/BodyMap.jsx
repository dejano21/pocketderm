import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { moleHistory, classificationTypes, getAreaGrowth } from "../data/mockData";

const markerColor = {
  common: "#10b981",
  congenital: "#0891b2",
  blue: "#6366f1",
  atypical: "#f59e0b",
  spitz: "#f59e0b",
  suspicious: "#ef4444",
};

const markerRing = {
  stable: "transparent",
  change: "#f59e0b",
  alert: "#ef4444",
};

// SVG body silhouette paths (simplified front/back human outline)
const BodyFront = () => (
  <g fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2">
    {/* Head */}
    <ellipse cx="50" cy="12" rx="8" ry="9.5" />
    {/* Neck */}
    <rect x="46" y="21" width="8" height="5" rx="2" />
    {/* Torso */}
    <path d="M34 26 Q34 24 38 24 L62 24 Q66 24 66 26 L68 52 Q68 56 64 56 L36 56 Q32 56 32 52 Z" />
    {/* Left arm */}
    <path d="M34 26 Q28 28 24 38 L20 52 Q18 56 22 56 L28 44 Q30 38 34 34 Z" />
    {/* Right arm */}
    <path d="M66 26 Q72 28 76 38 L80 52 Q82 56 78 56 L72 44 Q70 38 66 34 Z" />
    {/* Pelvis */}
    <path d="M36 56 L34 64 Q34 66 38 66 L62 66 Q66 66 66 64 L64 56 Z" />
    {/* Left leg */}
    <path d="M38 66 L36 88 Q35 94 38 94 L44 94 Q46 94 46 88 L46 66 Z" />
    {/* Right leg */}
    <path d="M54 66 L54 88 Q54 94 56 94 L62 94 Q65 94 64 88 L62 66 Z" />
  </g>
);

const BodyBack = () => (
  <g fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2">
    <ellipse cx="50" cy="12" rx="8" ry="9.5" />
    <rect x="46" y="21" width="8" height="5" rx="2" />
    <path d="M34 26 Q34 24 38 24 L62 24 Q66 24 66 26 L68 52 Q68 56 64 56 L36 56 Q32 56 32 52 Z" />
    <path d="M34 26 Q28 28 24 38 L20 52 Q18 56 22 56 L28 44 Q30 38 34 34 Z" />
    <path d="M66 26 Q72 28 76 38 L80 52 Q82 56 78 56 L72 44 Q70 38 66 34 Z" />
    <path d="M36 56 L34 64 Q34 66 38 66 L62 66 Q66 66 66 64 L64 56 Z" />
    <path d="M38 66 L36 88 Q35 94 38 94 L44 94 Q46 94 46 88 L46 66 Z" />
    <path d="M54 66 L54 88 Q54 94 56 94 L62 94 Q65 94 64 88 L62 66 Z" />
    {/* Spine line for back view distinction */}
    <line x1="50" y1="24" x2="50" y2="56" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" />
  </g>
);

export default function BodyMap({ filter = "all" }) {
  const [view, setView] = useState("front");
  const [tooltip, setTooltip] = useState(null);
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const molesInView = moleHistory.filter((m) => {
    if (m.bodyPosition.view !== view) return false;
    if (filter === "all") return true;
    if (filter === "high-risk") return m.trendType === "alert" || m.classification === "suspicious";
    if (filter === "recent") {
      const latest = new Date(m.scans[0].date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return latest >= thirtyDaysAgo;
    }
    return true;
  });

  const handleMarkerClick = (mole) => {
    navigate(`/history/${mole.id}`);
  };

  const handleMarkerEnter = (mole, e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ mole, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* View toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
      }}>
        <p style={{ fontSize: 14, fontWeight: 700 }}>Body Map</p>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {["front", "back"].map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setTooltip(null); }}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: view === v ? "white" : "transparent",
                color: view === v ? "var(--text)" : "var(--text-muted)",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s", textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Body SVG with markers */}
      <div
        ref={mapRef}
        style={{ position: "relative", padding: "16px", display: "flex", justifyContent: "center" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <svg viewBox="0 0 100 100" style={{ width: "100%", maxWidth: 260, height: "auto" }}>
          {view === "front" ? <BodyFront /> : <BodyBack />}

          {/* Mole markers */}
          {molesInView.map((mole) => {
            const { x, y } = mole.bodyPosition;
            const color = markerColor[mole.classification] || "#94a3b8";
            const ring = markerRing[mole.trendType] || "transparent";
            const growth = getAreaGrowth(mole.scans);
            const isSignificant = growth !== null && growth > 20;
            const pulse = mole.trendType === "alert" || mole.classification === "suspicious";

            return (
              <g
                key={mole.id}
                style={{ cursor: "pointer" }}
                onClick={() => handleMarkerClick(mole)}
                onMouseEnter={(e) => handleMarkerEnter(mole, e.nativeEvent)}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Pulse ring for alerts */}
                {pulse && (
                  <circle cx={x} cy={y} r="4.5" fill="none" stroke={color} strokeWidth="0.6" opacity="0.4">
                    <animate attributeName="r" from="3" to="6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Outer ring */}
                <circle cx={x} cy={y} r="3.2" fill={ring !== "transparent" ? ring : "white"} opacity={ring !== "transparent" ? 0.3 : 0.8} />
                {/* Main dot */}
                <circle cx={x} cy={y} r="2.2" fill={color} stroke="white" strokeWidth="0.6" />
                {/* Growth indicator */}
                {isSignificant && (
                  <text x={x + 3.5} y={y - 1} fontSize="3.5" fill="var(--danger)" fontWeight="700">↑</text>
                )}
              </g>
            );
          })}

          {/* View label */}
          <text x="50" y="99" textAnchor="middle" fontSize="3.5" fill="var(--text-muted)" fontWeight="500" style={{ textTransform: "capitalize" }}>
            {view} view
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: Math.min(tooltip.x + 10, 220),
            top: Math.max(tooltip.y - 10, 0),
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            boxShadow: "var(--shadow-md)",
            zIndex: 10,
            minWidth: 160,
            pointerEvents: "none",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{tooltip.mole.name}</p>
            <span style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 10,
              fontSize: 10, fontWeight: 600, marginBottom: 6,
              background: markerColor[tooltip.mole.classification] + "20",
              color: markerColor[tooltip.mole.classification],
            }}>
              {classificationTypes[tooltip.mole.classification]?.label}
            </span>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
              <span>⌀ {tooltip.mole.scans[0].diameterMm}mm</span>
              <span>{tooltip.mole.scans[0].areaMm2} mm²</span>
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              {tooltip.mole.scans[0].date} · Click to view
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", padding: "10px 16px",
        borderTop: "1px solid var(--border)", justifyContent: "center",
      }}>
        {[
          { color: "#10b981", label: "Low Risk" },
          { color: "#f59e0b", label: "Needs Review" },
          { color: "#ef4444", label: "High Risk" },
          { color: "#6366f1", label: "Blue Nevus" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
