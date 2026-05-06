import { Link, useLocation } from "react-router-dom";
import { Flag, Users, Layers, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore(s => s.logout);

  const links = [
    { to: "/reports", icon: Flag, label: "Reports" },
    { to: "/users", icon: Users, label: "Users" },
    { to: "/decks", icon: Layers, label: "Decks" },
  ];

  return (
    <aside style={{
      width: 250,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>M</div>
          Admin Panel
        </h2>
      </div>

      <nav style={{ flex: 1, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                color: isActive ? "white" : "var(--text-muted)",
                background: isActive ? "var(--accent-primary)" : "transparent",
                fontWeight: isActive ? 600 : 500,
                transition: "all var(--transition-fast)"
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = "var(--text-main)"; e.currentTarget.style.background = "var(--bg-surface-hover)"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "1.5rem 1rem", borderTop: "1px solid var(--border-color)" }}>
        <button
          onClick={logout}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "flex-start",
            color: "var(--text-muted)",
            background: "transparent",
            padding: "0.75rem 1rem"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-danger)"; e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
