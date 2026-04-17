import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Camera, Image, RotateCcw, ChevronRight, Sun, Focus, Ruler,
  Upload, Loader, ShieldCheck, AlertTriangle, Circle, Save, Clock,
  MessageCircle, Share2
} from "lucide-react";
import { classificationTypes } from "../data/mockData";
import { runMockAnalysis } from "../utils/mockAnalysis";
import StatusBadge from "../components/StatusBadge";

const tips = [
  { icon: Sun, text: "Use natural or bright, even lighting" },
  { icon: Focus, text: "Hold phone 10–15 cm from the mole" },
  { icon: Ruler, text: "Center the mole in the frame" },
];

const STEPS = { UPLOAD: 0, PREVIEW: 1, ANALYZING: 2, RESULTS: 3, SAVED: 4 };

const classColor = {
  common: "#059669", congenital: "#0891b2", blue: "#6366f1",
  atypical: "#d97706", spitz: "#d97706", suspicious: "#ef4444",
};
const classBg = {
  common: "var(--success-light)", congenital: "var(--primary-light)", blue: "#eef2ff",
  atypical: "var(--warning-light)", spitz: "var(--warning-light)", suspicious: "var(--danger-light)",
};

export default function Capture() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [moleName, setMoleName] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImageUrl(url);
    setStep(STEPS.PREVIEW);
  }, []);

  const handleFileInput = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleRetake = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageFile(null);
    setResult(null);
    setStep(STEPS.UPLOAD);
  };

  const handleAnalyze = async () => {
    setStep(STEPS.ANALYZING);
    const analysisResult = await runMockAnalysis();
    setResult(analysisResult);
    setStep(STEPS.RESULTS);
  };

  const handleSave = () => {
    // In a real app this would persist to state/DB
    setStep(STEPS.SAVED);
  };

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>{step <= STEPS.PREVIEW ? "New Scan" : step === STEPS.ANALYZING ? "Analyzing..." : "Scan Results"}</h1>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      {/* ===== STEP: UPLOAD ===== */}
      {step === STEPS.UPLOAD && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {/* Camera area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%", maxWidth: 380, aspectRatio: "3/4",
              borderRadius: "var(--radius)",
              background: "linear-gradient(180deg, #1e293b 0%, #334155 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", flexShrink: 0,
              border: "2px dashed rgba(255,255,255,0.2)",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
          >
            <Upload size={40} color="rgba(255,255,255,0.5)" />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 12, fontWeight: 500 }}>
              Tap to upload or drag an image
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 4 }}>
              JPG, PNG, HEIC supported
            </p>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            {/* Tips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {tips.map(({ icon: Icon, text }) => (
                <div key={text} style={{
                  flex: "1 1 120px", display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6, padding: "12px 8px", background: "var(--primary-light)",
                  borderRadius: "var(--radius-sm)", textAlign: "center",
                }}>
                  <Icon size={16} color="var(--primary)" />
                  <span style={{ fontSize: 12, color: "var(--primary-dark)", lineHeight: 1.3 }}>{text}</span>
                </div>
              ))}
            </div>

            <div className="btn-row">
              <button className="btn btn-primary btn-full-desktop" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={18} /> Take Photo
              </button>
              <button className="btn btn-secondary btn-full-desktop" onClick={() => fileInputRef.current?.click()}>
                <Image size={18} /> Upload from Gallery
              </button>
            </div>

            <div className="disclaimer" style={{ marginTop: 20 }}>
              Ensure the mole is clearly visible and in focus. Good lighting and a steady hand help produce the best results for analysis.
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: PREVIEW ===== */}
      {step === STEPS.PREVIEW && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div style={{
            width: "100%", maxWidth: 380, borderRadius: "var(--radius)",
            overflow: "hidden", position: "relative", flexShrink: 0,
            background: "#1e293b",
          }}>
            <img
              src={imageUrl}
              alt="Mole preview"
              style={{ width: "100%", display: "block", borderRadius: "var(--radius)" }}
            />
            <div style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, color: "white", display: "flex", alignItems: "center", gap: 6,
            }}>
              <Camera size={14} /> Image ready for analysis
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Image Details</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                File: {imageFile?.name || "camera capture"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Size: {imageFile ? (imageFile.size / 1024).toFixed(0) + " KB" : "—"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Type: {imageFile?.type || "image/*"}
              </p>
            </div>

            <div className="btn-row">
              <button className="btn btn-primary btn-full-desktop" onClick={handleAnalyze}>
                Analyze Image <ChevronRight size={18} />
              </button>
              <button className="btn btn-outline btn-full-desktop" onClick={handleRetake}>
                <RotateCcw size={18} /> Choose Different Image
              </button>
            </div>

            <div className="disclaimer" style={{ marginTop: 16 }}>
              Analysis is a prototype simulation and does not constitute a medical diagnosis. Results are for demonstration purposes only.
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: ANALYZING ===== */}
      {step === STEPS.ANALYZING && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "60px 20px", textAlign: "center",
        }}>
          <div style={{
            width: 200, height: 200, borderRadius: "var(--radius)",
            overflow: "hidden", marginBottom: 28, position: "relative",
          }}>
            <img src={imageUrl} alt="Analyzing" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* Scanning overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(8,145,178,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 120, height: 120, borderRadius: "50%",
                border: "2px solid var(--primary)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            </div>
          </div>
          <style>{`@keyframes pulse { 0%,100% { transform: scale(0.9); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } }`}</style>

          <Loader size={28} color="var(--primary)" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Analyzing your image...</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 300 }}>
            Running preliminary detection, segmentation, and classification. This usually takes a few seconds.
          </p>
        </div>
      )}

      {/* ===== STEP: RESULTS ===== */}
      {step === STEPS.RESULTS && result && (
        <ResultsView
          imageUrl={imageUrl}
          result={result}
          moleName={moleName}
          setMoleName={setMoleName}
          onSave={handleSave}
          onRetake={handleRetake}
          navigate={navigate}
        />
      )}

      {/* ===== STEP: SAVED ===== */}
      {step === STEPS.SAVED && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "60px 20px", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--success-light)", display: "flex",
            alignItems: "center", justifyContent: "center", marginBottom: 20,
          }}>
            <ShieldCheck size={36} color="var(--success)" />
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Scan Saved</p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 320, marginBottom: 28 }}>
            {moleName ? `"${moleName}"` : "Your scan"} has been saved to your mole history with today's analysis results.
          </p>
          <div className="btn-row" style={{ width: "100%", maxWidth: 340 }}>
            <button className="btn btn-primary btn-full-desktop" onClick={() => navigate("/history")}>
              <Clock size={18} /> View Mole History
            </button>
            <button className="btn btn-secondary btn-full-desktop" onClick={handleRetake}>
              <Camera size={18} /> Scan Another Mole
            </button>
            <button className="btn btn-outline btn-full-desktop" onClick={() => navigate("/home")}>
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function ResultsView({ imageUrl, result, moleName, setMoleName, onSave, onRetake, navigate }) {
  const cls = classificationTypes[result.clinicalType];

  return (
    <>
      {/* Image + classification */}
      <div className="grid-cards" style={{ marginBottom: 16 }}>
        <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            width: 110, height: 110, borderRadius: "var(--radius)",
            overflow: "hidden", position: "relative", flexShrink: 0,
          }}>
            <img src={imageUrl} alt="Scan" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* Segmentation overlay */}
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: "60%", height: "55%", borderRadius: "50%",
                border: "2px dashed var(--primary)", opacity: 0.7,
              }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Risk Assessment</p>
            <StatusBadge status={result.classification} />
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Confidence</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{
                    width: `${result.confidence}%`, height: "100%", borderRadius: 4,
                    background: "linear-gradient(90deg, var(--accent), var(--primary))",
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{result.confidence}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical classification */}
        <div className="card">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Clinical Classification</p>
          <span style={{
            display: "inline-block", padding: "4px 12px", borderRadius: 14,
            fontSize: 13, fontWeight: 700, marginBottom: 8,
            background: classBg[result.clinicalType], color: classColor[result.clinicalType],
          }}>
            {cls.label}
          </span>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cls.description}</p>
        </div>
      </div>

      {/* Measurements */}
      <div className="grid-cards" style={{ marginBottom: 16 }}>
        <div className="card">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Measurements</p>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, textAlign: "center", padding: "12px 0", background: "#f8fafc", borderRadius: "var(--radius-sm)" }}>
              <Ruler size={18} color="var(--primary)" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 20, fontWeight: 700 }}>{result.diameterMm}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Diameter (mm)</p>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "12px 0", background: "#f8fafc", borderRadius: "var(--radius-sm)" }}>
              <Circle size={18} color="var(--primary)" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 20, fontWeight: 700 }}>{result.areaMm2}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Area (mm²)</p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={18} color="var(--success)" />
            <p style={{ fontSize: 14, fontWeight: 700 }}>Explanation</p>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.explanation}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recommendations</p>
        {result.recommendations.map((rec, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < result.recommendations.length - 1 ? 8 : 0 }}>
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
      <div className="disclaimer" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 20, maxWidth: 600 }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Preliminary analysis — not a medical diagnosis. This is a prototype simulation. Always consult a qualified dermatologist for clinical evaluation.</span>
      </div>

      {/* Save section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Save to Mole History</p>
        <input
          value={moleName}
          onChange={(e) => setMoleName(e.target.value)}
          placeholder="Name this mole (e.g., Left Forearm)"
          style={{ marginBottom: 12 }}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
          Saving will store the image, measurements, classification, and timestamp.
        </p>
        <button className="btn btn-primary btn-full-desktop" onClick={onSave}>
          <Save size={18} /> Save Scan
        </button>
      </div>

      {/* Other actions */}
      <div className="btn-row">
        <button className="btn btn-outline btn-full-desktop" onClick={onRetake}>
          <RotateCcw size={18} /> Upload Another Image
        </button>
        <button className="btn btn-secondary btn-full-desktop" onClick={() => navigate("/dermatologist")}>
          <Share2 size={18} /> Share with Dermatologist
        </button>
        <button className="btn btn-ghost btn-full-desktop" onClick={() => navigate("/chat")}>
          <MessageCircle size={18} /> Ask GenA
        </button>
      </div>
    </>
  );
}
