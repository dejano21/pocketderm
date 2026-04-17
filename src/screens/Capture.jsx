import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image, RotateCcw, ChevronRight, Sun, Focus, Ruler } from "lucide-react";

const tips = [
  { icon: Sun, text: "Use natural or bright, even lighting" },
  { icon: Focus, text: "Hold phone 10–15 cm from the mole" },
  { icon: Ruler, text: "Center the mole in the frame" },
];

export default function Capture() {
  const navigate = useNavigate();
  const [captured, setCaptured] = useState(false);

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>Capture Mole</h1>
      </div>

      {/* Camera preview mock */}
      <div style={{
        width: "100%",
        aspectRatio: "3/4",
        borderRadius: "var(--radius)",
        background: captured
          ? "linear-gradient(135deg, #fde8d8 0%, #f5d0b0 100%)"
          : "linear-gradient(180deg, #1e293b 0%, #334155 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        marginBottom: 16,
      }}>
        {!captured ? (
          <>
            {/* Crosshair / guide circle */}
            <div style={{
              width: 160, height: 160, borderRadius: "50%",
              border: "2px dashed rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.7)",
              }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 16 }}>
              Position the mole inside the circle
            </p>
            {/* Fake camera UI elements */}
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, color: "white",
            }}>
              1x
            </div>
          </>
        ) : (
          <>
            {/* Captured image mock */}
            <div style={{
              width: 120, height: 100, borderRadius: "50%",
              background: "radial-gradient(ellipse, #8B6914 0%, #6B4E12 60%, #5a3e0e 100%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }} />
            <div style={{
              position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, color: "white",
            }}>
              Photo captured
            </div>
          </>
        )}
      </div>

      {/* Tips */}
      {!captured && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {tips.map(({ icon: Icon, text }) => (
            <div key={text} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 6, padding: "10px 6px", background: "var(--primary-light)",
              borderRadius: "var(--radius-sm)", textAlign: "center",
            }}>
              <Icon size={16} color="var(--primary)" />
              <span style={{ fontSize: 11, color: "var(--primary-dark)", lineHeight: 1.3 }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      {!captured ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setCaptured(true)}>
            <Camera size={18} /> Take Photo
          </button>
          <button className="btn btn-secondary" onClick={() => setCaptured(true)}>
            <Image size={18} /> Upload from Gallery
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate("/results")}>
            Continue <ChevronRight size={18} />
          </button>
          <button className="btn btn-outline" onClick={() => setCaptured(false)}>
            <RotateCcw size={18} /> Retake
          </button>
        </div>
      )}

      <div className="disclaimer" style={{ marginTop: 16 }}>
        Ensure the mole is clearly visible and in focus. Good lighting and a steady hand help produce the best results for analysis.
      </div>
    </div>
  );
}
