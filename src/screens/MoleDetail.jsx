import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, AlertCircle, Minus, ArrowUpRight, ShieldAlert, Ruler, Circle } from "lucide-react";
import { moleHistory, classificationTypes, getAreaGrowth, hasClassificationEscalation } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import MolePlaceholder from "../components/MolePlaceholder";

const trendIcon = {
  stable: <Minus size={16} color="var(--success)" />,
  change: <TrendingUp size={16} color="var(--warning)" />,
  alert: <AlertCircle size={16} color="var(--danger)" />,
};

const classColor = {
  common: "#059669", congenital: "#0891b2", blue: "#6366f1",
  atypical: "#d97706", spitz: "#d97706", suspicious: "#ef4444",
};
const classBg = {
  common: "var(--success-light)", congenital: "var(--primary-light)", blue: "#eef2ff",
  atypical: "var(--warning-light)", spitz: "var(--warning-light)", suspicious: "var(--danger-light)",
};

export default function MoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mole = moleHistory.find((m) => m.id === id);

  if (!mole) return <div className="screen"><p>Mole not found.</p></div>;

  const hasPrevious = mole.scans.length > 1;
  const growth = getAreaGrowth(mole.scans);
  const significantGrowth = growth !== null && growth > 20;
  const escalated = hasClassificationEscalation(mole);
  const cls = classificationTypes[mole.classification];

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>{mole.name}</h1>
      </div>

      {/* Classification + Measurements card */}
      <div className="grid-cards" style={{ marginBottom: 20 }}>
        <div className="card">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Clinical Classification</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              padding: "4px 12px", borderRadius: 14, fontSize: 13, fontWeight: 700,
              background: classBg[mole.classification], color: classColor[mole.classification],
            }}>
              {cls.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cls.description}</p>

          {/* Classification escalation alert */}
          {escalated && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 12,
              padding: "8px 12px", borderRadius: "var(--radius-sm)",
              background: "var(--warning-light)", border: "1px solid #fde68a",
            }}>
              <ShieldAlert size={16} color="#92400e" />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>Classification Changed</p>
                <p style={{ fontSize: 11, color: "#a16207" }}>
                  {classificationTypes[mole.previousClassification].label} → {cls.label}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Measurements */}
        <div className="card">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Latest Measurements</p>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, textAlign: "center", padding: "12px 0", background: "#f8fafc", borderRadius: "var(--radius-sm)" }}>
              <Ruler size={18} color="var(--primary)" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{mole.scans[0].diameterMm}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Diameter (mm)</p>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "12px 0", background: "#f8fafc", borderRadius: "var(--radius-sm)" }}>
              <Circle size={18} color="var(--primary)" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{mole.scans[0].areaMm2}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Area (mm²)</p>
            </div>
          </div>

          {/* Growth alert */}
          {significantGrowth && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 12,
              padding: "8px 12px", borderRadius: "var(--radius-sm)",
              background: "var(--danger-light)", border: "1px solid #fecaca",
            }}>
              <ArrowUpRight size={16} color="var(--danger)" />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>Significant Growth Detected</p>
                <p style={{ fontSize: 11, color: "#991b1b" }}>
                  Area increased {growth.toFixed(1)}% ({mole.scans[1].areaMm2} → {mole.scans[0].areaMm2} mm²)
                </p>
              </div>
            </div>
          )}
          {growth !== null && !significantGrowth && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
              Area change: {growth > 0 ? "+" : ""}{growth.toFixed(1)}% — within normal range
            </p>
          )}
        </div>
      </div>

      {/* Visual comparison */}
      <div className="grid-cards" style={{ marginBottom: 20 }}>
        {hasPrevious && (
          <div>
            <p className="section-title">Visual Comparison</p>
            <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <MolePlaceholder size={100} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{mole.scans[1].date}</p>
                <p style={{ fontSize: 11, fontWeight: 600 }}>Previous</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {mole.scans[1].diameterMm}mm · {mole.scans[1].areaMm2} mm²
                </p>
              </div>
              <div style={{ fontSize: 20, color: "var(--text-muted)" }}>→</div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <MolePlaceholder size={100} overlay />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{mole.scans[0].date}</p>
                <p style={{ fontSize: 11, fontWeight: 600 }}>Current</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {mole.scans[0].diameterMm}mm · {mole.scans[0].areaMm2} mm²
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trend + area progression */}
        <div>
          <p className="section-title">Trend</p>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            {trendIcon[mole.trendType]}
            <span style={{ fontSize: 14, fontWeight: 600 }}>{mole.trend}</span>
          </div>

          {/* Area progression bar chart */}
          {mole.scans.length > 1 && (
            <>
              <p className="section-title">Area Progression</p>
              <div className="card" style={{ marginBottom: 16 }}>
                {[...mole.scans].reverse().map((scan, i) => {
                  const maxArea = Math.max(...mole.scans.map(s => s.areaMm2));
                  const pct = (scan.areaMm2 / maxArea) * 100;
                  return (
                    <div key={i} style={{ marginBottom: i < mole.scans.length - 1 ? 10 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                        <span>{scan.date}</span>
                        <span>{scan.areaMm2} mm²</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: 4,
                          background: i === mole.scans.length - 1
                            ? "linear-gradient(90deg, var(--accent), var(--primary))"
                            : "var(--primary-light)",
                          transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scan timeline */}
      <p className="section-title">Scan Timeline</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
        {mole.scans.map((scan, i) => (
          <div key={i} style={{ display: "flex", gap: 14, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: i === 0 ? "var(--primary)" : "var(--border)",
                border: i === 0 ? "3px solid var(--primary-light)" : "none",
                flexShrink: 0, marginTop: 4,
              }} />
              {i < mole.scans.length - 1 && (
                <div style={{ width: 2, flex: 1, background: "var(--border)" }} />
              )}
            </div>
            <div className="card" style={{ flex: 1, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{scan.date}</p>
                <StatusBadge status={scan.status} />
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                <span>⌀ {scan.diameterMm} mm</span>
                <span>{scan.areaMm2} mm²</span>
                <span>Confidence: {scan.confidence}%</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{scan.notes}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={() => navigate("/capture")}>
        New Scan for {mole.name}
      </button>
    </div>
  );
}
