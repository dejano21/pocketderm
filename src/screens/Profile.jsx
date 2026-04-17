import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Bell, BellOff, Shield, FileText, Lock,
  ChevronRight, LogOut, Stethoscope, Info
} from "lucide-react";
import { userProfile } from "../data/mockData";
import { useState } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [monthlyReminder, setMonthlyReminder] = useState(true);

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} style={{
      width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
      background: on ? "var(--primary)" : "var(--border)", position: "relative",
      transition: "background 0.2s",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: on ? 23 : 3, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  );

  const SettingRow = ({ icon: Icon, label, right, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
        borderBottom: "1px solid var(--border)", cursor: onClick ? "pointer" : "default",
      }}
    >
      <Icon size={20} color="var(--text-secondary)" />
      <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
      {right || <ChevronRight size={18} color="var(--text-muted)" />}
    </div>
  );

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>Profile & Settings</h1>
      </div>

      {/* Desktop: two-column top */}
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        {/* User card */}
        <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <User size={28} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700 }}>{userProfile.name}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{userProfile.email}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Age {userProfile.age} · {userProfile.skinType}
            </p>
          </div>
        </div>

        {/* Dermatologist */}
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "var(--success-light)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Stethoscope size={20} color="var(--success)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{userProfile.dermatologist.name}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{userProfile.dermatologist.clinic}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Last visit: {userProfile.dermatologist.lastVisit}</p>
          </div>
          <span className="badge badge-success">Connected</span>
        </div>
      </div>

      {/* Notifications + Privacy side by side on desktop */}
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div>
          <p className="section-title">Notifications</p>
          <div className="card" style={{ padding: "4px 16px" }}>
            <SettingRow
              icon={Bell}
              label="Push Notifications"
              right={<Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />}
            />
            <SettingRow
              icon={BellOff}
              label="Monthly Check-Up Reminder"
              right={<Toggle on={monthlyReminder} onToggle={() => setMonthlyReminder(!monthlyReminder)} />}
            />
          </div>
        </div>

        <div>
          <p className="section-title">Privacy & Legal</p>
          <div className="card" style={{ padding: "4px 16px" }}>
            <SettingRow icon={Lock} label="Privacy Policy" />
            <SettingRow icon={Shield} label="Data & Consent" />
            <SettingRow icon={FileText} label="Terms of Service" />
            <SettingRow icon={Info} label="About Pocket-Derm" />
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer" style={{ marginBottom: 20, maxWidth: 600 }}>
        Pocket-Derm is a monitoring and informational tool only. It does not provide medical diagnoses.
        Always consult a qualified healthcare professional for clinical evaluation and treatment decisions.
        Your data is stored locally on this device for this prototype.
      </div>

      {/* Logout */}
      <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
        onClick={() => navigate("/")}
      >
        <LogOut size={18} /> Log Out
      </button>
    </div>
  );
}
