import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, AlertCircle, Minus } from "lucide-react";
import { moleHistory } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import MolePlaceholder from "../components/MolePlaceholder";

const trendIcon = {
  stable: <Minus size={16} color="var(--success)" />,
  change: <TrendingUp size={16} color="var(--warning)" />,
  alert: <AlertCircle size={16} color="var(--danger)" />,
};

export default function MoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mole = moleHistory.find((m) => m.id === id);

  if (!mole) return <div className="screen"><p>Mole not found.</p></div>;

  const hasPrevious = mole.scans.length > 1;

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>{mole.name}</h1>
      </div>

      {/* Desktop: comparison + trend side by side */}
      <div className="grid-cards" style={{ marginBottom: 20 }}>
        {/* Visual comparison */}
        {hasPrevious && (
          <div>
            <p className="section-title">Visual Comparison</p>
            <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <MolePlaceholder size={100} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{mole.scans[1].date}</p>
                <p style={{ fontSize: 11, fontWeight: 600 }}>Previous</p>
              </div>
              <div style={{ fontSize: 20, color: "var(--text-muted)" }}>→</div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <MolePlaceholder size={100} overlay />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{mole.scans[0].date}</p>
                <p style={{ fontSize: 11, fontWeight: 600 }}>Current</p>
              </div>
            </div>
          </div>
        )}

        {/* Trend + timeline */}
        <div>
          <p className="section-title">Trend</p>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            {trendIcon[mole.trendType]}
            <span style={{ fontSize: 14, fontWeight: 600 }}>{mole.trend}</span>
          </div>

          <p className="section-title">Scan Timeline</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Confidence: {scan.confidence}%</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{scan.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={() => navigate("/capture")}>
        New Scan for {mole.name}
      </button>
    </div>
  );
}
