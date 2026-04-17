import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, TrendingUp, AlertCircle, Minus } from "lucide-react";
import { moleHistory } from "../data/mockData";
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
          return (
            <div
              key={mole.id}
              className="card"
              style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onClick={() => navigate(`/history/${mole.id}`)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow)"}
            >
              <MolePlaceholder size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{mole.name}</p>
                  <StatusBadge status={latest.status} />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                  Last scan: {latest.date} · {mole.scans.length} scan{mole.scans.length > 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {trendIcon[mole.trendType]}
                  <span style={{ fontSize: 12, color: trendColor[mole.trendType], fontWeight: 500 }}>
                    {mole.trend}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
