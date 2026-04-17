import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Share2, MessageCircle, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { mockAnalysisResult } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import MolePlaceholder from "../components/MolePlaceholder";

export default function AnalysisResults() {
  const navigate = useNavigate();
  const r = mockAnalysisResult;

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>Analysis Results</h1>
      </div>

      {/* Image + segmentation overlay */}
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <MolePlaceholder size={110} overlay />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Classification</p>
          <StatusBadge status={r.classification} />
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Confidence</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                flex: 1, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden",
              }}>
                <div style={{
                  width: `${r.confidence}%`, height: "100%", borderRadius: 4,
                  background: "linear-gradient(90deg, var(--accent), var(--primary))",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{r.confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmentation note */}
      <div className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, background: "var(--primary-light)", border: "1px solid #a5f3fc" }}>
        <Info size={18} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-dark)", marginBottom: 2 }}>Segmentation Preview</p>
          <p style={{ fontSize: 12, color: "var(--primary-dark)", lineHeight: 1.4 }}>
            The dashed outline on the image highlights the detected mole region used for analysis.
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ShieldCheck size={18} color="var(--success)" />
          <p style={{ fontSize: 14, fontWeight: 700 }}>Explanation</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.explanation}</p>
      </div>

      {/* Recommendations */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recommendations</p>
        {r.recommendations.map((rec, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < r.recommendations.length - 1 ? 8 : 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "var(--primary-light)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
              fontSize: 11, fontWeight: 700, color: "var(--primary)",
            }}>{i + 1}</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{rec}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="disclaimer" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 20 }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>This is not a medical diagnosis. Results are for informational purposes only. Always consult a qualified dermatologist for clinical evaluation.</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-primary" onClick={() => navigate("/history")}>
          <Clock size={18} /> Monitor Over Time
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/dermatologist")}>
          <Share2 size={18} /> Share with Dermatologist
        </button>
        <button className="btn btn-outline" onClick={() => navigate("/chat")}>
          <MessageCircle size={18} /> Ask GenA
        </button>
      </div>
    </div>
  );
}
