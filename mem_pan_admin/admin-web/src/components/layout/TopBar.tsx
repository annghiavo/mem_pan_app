import { useAuthStore } from "../../store/authStore";

export default function TopBar() {
  const role = useAuthStore((s) => s.role);

  return (
    <header style={{
      height: 64,
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
    }}>
      <div />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {role && (
          <span style={{
            fontSize: "0.6875rem",
            padding: "0.25rem 0.625rem",
            borderRadius: "var(--radius-full)",
            background: role === "admin" ? "rgba(100, 108, 255, 0.15)" : "rgba(59, 130, 246, 0.15)",
            color: role === "admin" ? "var(--accent-primary)" : "hsl(217, 90%, 65%)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
            border: "1px solid",
            borderColor: role === "admin" ? "rgba(100, 108, 255, 0.3)" : "rgba(59, 130, 246, 0.3)",
          }}>
            {role}
          </span>
        )}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-full)",
          background: "var(--bg-surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border-color)",
        }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {role ? role[0].toUpperCase() : "A"}
          </span>
        </div>
      </div>
    </header>
  );
}
