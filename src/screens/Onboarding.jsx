import { useNavigate } from "react-router-dom";
import { Camera, TrendingUp, ShieldCheck, MessageCircle } from "lucide-react";
import Logo from "../components/Logo";

const features = [
  { icon: Camera, title: "Capture", desc: "Photograph suspicious moles with guided instructions" },
  { icon: TrendingUp, title: "Monitor", desc: "Track changes over time with visual comparisons" },
  { icon: ShieldCheck, title: "Assess", desc: "Get risk assessments and next-step guidance" },
  { icon: MessageCircle, title: "Communicate", desc: "Share structured summaries with your dermatologist" },
];

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      background: "linear-gradient(180deg, #dbeafe 0%, var(--bg) 40%)",
      textAlign: "center",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 20 }}>
        <Logo size={72} />
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>
        Derma Pocket
      </h1>
      <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 420, lineHeight: 1.5, marginBottom: 40 }}>
        Monitor suspicious moles over time. Stay informed. Stay ahead.
      </p>

      {/* Feature cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 14, width: "100%", maxWidth: 860, marginBottom: 44,
      }}
        className="onboarding-features"
      >
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card" style={{ textAlign: "left", padding: 16 }}>
            <Icon size={22} color="var(--primary)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn btn-primary" style={{ minWidth: 200 }} onClick={() => navigate("/home")}>
          Get Started
        </button>
        <button className="btn btn-ghost" style={{ minWidth: 200 }} onClick={() => navigate("/home")}>
          Log In
        </button>
      </div>
    </div>
  );
}
