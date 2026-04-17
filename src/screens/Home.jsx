import { useNavigate } from "react-router-dom";
import { Camera, Clock, FileText, MessageCircle, Bell, Shield, ChevronRight } from "lucide-react";
import { dashboardStats, userProfile } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import BodyMap from "../components/BodyMap";

const actions = [
  { icon: Camera, label: "New Scan", path: "/capture", color: "var(--primary)" },
  { icon: Clock, label: "History", path: "/history", color: "var(--accent)" },
  { icon: FileText, label: "Derm Summary", path: "/dermatologist", color: "#8b5cf6" },
  { icon: MessageCircle, label: "Ask GenA", path: "/chat", color: "#f59e0b" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingTop: 8 }}>
        <div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Welcome back,</p>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>{userProfile.name.split(" ")[0]}</h1>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Shield size={22} color="white" />
        </div>
      </div>

      {/* Top row: stats + dermatologist */}
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Monitored Moles</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>{dashboardStats.totalMoles}</p>
          </div>
          <div className="card">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Last Scan</p>
            <StatusBadge status={dashboardStats.recentScanStatus} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{dashboardStats.lastScanDate}</p>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "var(--success-light)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <FileText size={18} color="var(--success)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{userProfile.dermatologist.name}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{userProfile.dermatologist.clinic}</p>
          </div>
          <span className="badge badge-success">Connected</span>
        </div>
      </div>

      {/* Body Map section */}
      <p className="section-title">Your Body Map</p>
      <div style={{ marginBottom: 28 }}>
        <BodyMap />
      </div>

      {/* Quick actions */}
      <p className="section-title">Quick Actions</p>
      <div className="grid-2 grid-2-to-4" style={{ marginBottom: 28 }}>
        {actions.map(({ icon: Icon, label, path, color }) => (
          <button
            key={path}
            className="card"
            onClick={() => navigate(path)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              cursor: "pointer", border: "1px solid var(--border)", padding: "20px 12px",
              transition: "transform 0.15s, box-shadow 0.15s", textAlign: "center",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow)"}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={22} color={color} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Reminder card */}
      <p className="section-title">Reminders</p>
      <div
        className="card"
        style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer",
          maxWidth: 600,
        }}
        onClick={() => navigate("/capture")}
      >
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "#dbeafe",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Bell size={18} color="#3b82f6" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1e40af" }}>Monthly Check-Up Due</p>
          <p style={{ fontSize: 12, color: "#3b82f6" }}>Your next scan is recommended by May 10, 2026</p>
        </div>
        <ChevronRight size={18} color="#3b82f6" />
      </div>
    </div>
  );
}
