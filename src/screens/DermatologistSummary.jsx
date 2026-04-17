import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2, AlertTriangle, FileText, Calendar, Flag } from "lucide-react";
import { dermatologistSummary as ds } from "../data/mockData";
import MolePlaceholder from "../components/MolePlaceholder";

export default function DermatologistSummary() {
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>Derm Summary</h1>
      </div>

      {/* Patient info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <FileText size={18} color="var(--primary)" />
          <p style={{ fontSize: 15, fontWeight: 700 }}>Patient Summary</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Name", ds.patientName],
            ["Age", ds.patientAge],
            ["Skin Type", ds.skinType],
            ["Total Scans", ds.totalScans],
            ["Monitored Moles", ds.monitoredMoles],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest image */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Latest Uploaded Image</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MolePlaceholder size={80} overlay />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Left Forearm</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Scanned: 2026-04-10</p>
            <span className="badge badge-success" style={{ marginTop: 6 }}>Low Risk</span>
          </div>
        </div>
      </div>

      {/* Risk flags */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Flag size={18} color="var(--danger)" />
          <p style={{ fontSize: 14, fontWeight: 700 }}>Risk Flags</p>
        </div>
        {ds.riskFlags.map((rf, i) => (
          <div key={i} style={{
            padding: "10px 12px",
            background: rf.flag === "High Priority" ? "var(--danger-light)" : "var(--warning-light)",
            borderRadius: "var(--radius-sm)",
            marginBottom: i < ds.riskFlags.length - 1 ? 8 : 0,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{rf.mole}</p>
              <span className={`badge ${rf.flag === "High Priority" ? "badge-danger" : "badge-warning"}`}>{rf.flag}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rf.detail}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Calendar size={18} color="var(--primary)" />
          <p style={{ fontSize: 14, fontWeight: 700 }}>Scan Timeline</p>
        </div>
        {ds.timeline.map((t, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            paddingBottom: i < ds.timeline.length - 1 ? 10 : 0,
            marginBottom: i < ds.timeline.length - 1 ? 10 : 0,
            borderBottom: i < ds.timeline.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", minWidth: 80 }}>{t.date}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.event}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Clinical Notes</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{ds.notes}</p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1 }}>
          <Download size={18} /> Download PDF
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }}>
          <Share2 size={18} /> Share
        </button>
      </div>
    </div>
  );
}
