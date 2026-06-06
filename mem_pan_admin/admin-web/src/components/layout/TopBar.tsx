import { useAuthStore } from "../../store/authStore";

export default function TopBar() {
  const role = useAuthStore((s) => s.role);

  return (
    <header className="glass-panel" style={{
      height: 72,
      margin: "1rem 1rem 1rem 1rem",
      borderRadius: "var(--radius-lg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle top bar glow */}
      <div style={{
        position: "absolute",
        top: -30,
        right: 100,
        width: 200,
        height: 60,
        background: "var(--accent-glow)",
        filter: "blur(40px)",
        pointerEvents: "none"
      }} />
      <div />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {role && (
          <span style={{
            fontSize: "0.75rem",
            padding: "0.3rem 0.8rem",
            borderRadius: "var(--radius-full)",
            background: role === "admin" ? "rgba(100, 108, 255, 0.15)" : "rgba(59, 130, 246, 0.15)",
            color: role === "admin" ? "var(--accent-primary-hover)" : "hsl(217, 90%, 75%)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            border: "1px solid",
            borderColor: role === "admin" ? "rgba(100, 108, 255, 0.4)" : "rgba(59, 130, 246, 0.4)",
            boxShadow: role === "admin" ? "0 0 10px rgba(100, 108, 255, 0.2)" : "0 0 10px rgba(59, 130, 246, 0.2)",
          }}>
            {role}
          </span>
        )}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-full)",
          background: "var(--bg-surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(4px)",
          boxShadow: "var(--shadow-sm)",
          cursor: "pointer",
          transition: "all var(--transition-fast)"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-primary)";
          e.currentTarget.style.boxShadow = "var(--glow-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
            {role ? role[0].toUpperCase() : "A"}
          </span>
        </div>
      </div>
    </header>
  );
}
