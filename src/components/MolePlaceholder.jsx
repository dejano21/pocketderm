export default function MolePlaceholder({ size = 120, overlay = false }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "var(--radius)",
      background: "linear-gradient(135deg, #fde8d8 0%, #f5d0b0 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Fake mole dot */}
      <div style={{
        width: size * 0.35,
        height: size * 0.3,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, #8B6914 0%, #6B4E12 60%, #5a3e0e 100%)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }} />
      {overlay && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: size * 0.45,
            height: size * 0.4,
            borderRadius: "50%",
            border: "2px dashed var(--primary)",
            opacity: 0.8,
          }} />
        </div>
      )}
    </div>
  );
}
