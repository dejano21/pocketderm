import { useLocation, useNavigate } from "react-router-dom";
import { Home, Camera, Clock, MessageCircle, User } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";

const tabs = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/capture", icon: Camera, label: "Scan" },
  { path: "/history", icon: Clock, label: "History" },
  { path: "/chat", icon: MessageCircle, label: "GenA" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) return null;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "var(--nav-height)",
      background: "white",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 100,
      paddingBottom: 4,
    }}>
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? "var(--primary)" : "var(--text-muted)",
              fontSize: 11,
              fontWeight: active ? 600 : 400,
              transition: "color 0.2s",
              padding: "6px 12px",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
