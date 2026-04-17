import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, TrendingUp, AlertCircle, Minus, ArrowUpRight, ShieldAlert, Ruler } from "lucide-react";
import { moleHistory, classificationTypes, getAreaGrowth, hasClassificationEscalation } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import MolePlaceholder from "../components/MolePlaceholder";

const trendIcon = {
  stable: <Minus size={14} color="var(--success)" />,
  change: <TrendingUp size={14} color="var(--warning)" />,
  alert: <AlertCircle size={14} color="var(--danger)" />,
};

const trendColor = {
  stable: "var(--success)",
  change: "var(--warning)",
  alert: "var(--danger)",
};

const classColor = {
  common: "#059669",
  congenital: "#0891b2",
  blue: "#6366f1",
  atypical: "#d97706",
  spitz: "#d97706",
  suspicious: "#ef4444",
};

const classBg = {
  common: "var(--success-light)",
  congenital: "var(--primary-light)",
  blue: "#eef2ff",
  atypical: "var(--warning-light)",
  spitz: "var(--warning-light)",
  suspicious: "var(--danger-light)",
};

export default function MoleHistory() {
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>Mole History</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        {moleHistory.length} moles tracked · Tap for details
      </p>

      <div className="grid-cards">
        {moleHistory.map((mole) => {
          const latest = mole.scans[0];
          const growth = getAreaGrowth(mole.scans);
          const significantGrowth = growth !== null && growth > 20;
          const escalated = hasClassificationEscalation(mole);
          const cls = classificationTypes[mole.classification];

          return (
            <div
              key={mole.id}
              className="card"
              style={{ cursor: "pointer", transition: "box-shadow 0.15s", padding: 16 }}
              onClick={() => navigate(`/history/${mole.id}`)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow)"}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <MolePlaceholder size={64} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{mole.name}</p>
                    <StatusBadge status={latest.status} />
                  </div>
                  {/* Classification badge */}
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px", borderRadius: 12,
                    fontSize: 11, fontWeight: 600,
                    background: classBg[mole.classification],
                    color: classColor[mole.classification],
                    marginBottom: 6,
                  }}>
                    {cls.label}
                  </span>
                  {/* Measurements */}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span>⌀ {latest.diameterMm} mm</span>
                    <span>{latest.areaMm2} mm²</span>
                    <span>{mole.scans.length} scan{mole.scans.length > 1 ? "s" : ""}</span>
                  </div>
                  {/* Trend */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {trendIcon[mole.trendType]}
                    <span style={{ fontSize: 12, color: trendColor[mole.trendType], fontWeight: 500 }}>
                      {mole.trend}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>

              {/* Alert flags */}
              {(significantGrowth || escalated) && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {significantGrowth && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 8,
                      background: "var(--danger-light)", fontSize: 11, fontWeight: 600, color: "var(--danger)",
                    }}>
                      <ArrowUpRight size={13} />
                      +{growth.toFixed(1)}% area growth
                    </div>
                  )}
                  {escalated && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 8,
                      background: "var(--warning-light)", fontSize: 11, fontWeight: 600, color: "#92400e",
                    }}>
                      <ShieldAlert size={13} />
                      {classificationTypes[mole.previousClassification].label} → {cls.label}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
