import { useLocation, useNavigate } from "react-router-dom";
import { Home, Camera, Clock, MessageCircle, User, FileText } from "lucide-react";
import Logo from "./Logo";

const links = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/capture", icon: Camera, label: "New Scan" },
  { path: "/history", icon: Clock, label: "Mole History" },
  { path: "/dermatologist", icon: FileText, label: "Derm Summary" },
  { path: "/chat", icon: MessageCircle, label: "GenA Assistant" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside style={{
      width: "var(--sidebar-width)",
      minHeight: "100vh",
      background: "white",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      position: "sticky",
      top: 0,
      height: "100vh",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div
        onClick={() => navigate("/home")}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 20px", marginBottom: 32, cursor: "pointer",
        }}
      >
        <Logo size={34} />
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Derma Pocket</span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {links.map(({ path, icon: Icon, label }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 20px",
                background: active ? "var(--primary-light)" : "transparent",
                border: "none", cursor: "pointer",
                borderRight: active ? "3px solid var(--primary)" : "3px solid transparent",
                color: active ? "var(--primary-dark)" : "var(--text-secondary)",
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: "all 0.15s",
                textAlign: "left",
                width: "100%",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "0 20px" }}>
        <div style={{
          padding: "12px 14px", borderRadius: "var(--radius-sm)",
          background: "var(--bg)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5,
        }}>
          Derma Pocket Prototype<br />
          For demo purposes only
        </div>
      </div>
    </aside>
  );
}
