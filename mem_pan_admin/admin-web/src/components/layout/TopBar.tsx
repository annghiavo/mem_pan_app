export default function TopBar() {
  return (
    <header style={{
      height: 64,
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem"
    }}>
      <div>
        {/* Placeholder for breadcrumbs or title */}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-full)",
          background: "var(--bg-surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border-color)"
        }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>A</span>
        </div>
      </div>
    </header>
  );
}
