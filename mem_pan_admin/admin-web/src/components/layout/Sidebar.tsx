import { Link, useLocation } from "react-router-dom";
import { Flag, Users, Layers, LogOut, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface NavLink {
  to: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
}

const LINKS: NavLink[] = [
  { to: "/reports", icon: Flag, label: "Reports" },
  { to: "/appeals", icon: ShieldAlert, label: "Appeals" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/decks", icon: Layers, label: "Decks" },
  { to: "/email-templates", icon: Mail, label: "Email Templates", adminOnly: true },
  { to: "/moderators", icon: ShieldCheck, label: "Moderators", adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  const visibleLinks = LINKS.filter((l) => !l.adminOnly || role === "admin");

  return (
    <aside className="glass-panel" style={{
      width: 280,
      margin: "1rem 0 1rem 1rem",
      borderRadius: "var(--radius-lg)",
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--border-color)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative glow inside sidebar */}
      <div style={{
        position: "absolute",
        top: -50,
        left: -50,
        width: 150,
        height: 150,
        background: "var(--accent-glow)",
        filter: "blur(50px)",
        borderRadius: "50%",
        pointerEvents: "none"
      }} />
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color)" }}>
        <h2 style={{
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "var(--text-main)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          letterSpacing: "-0.02em"
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--accent-primary), hsl(var(--primary-hue), 80%, 55%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: "1.2rem",
            boxShadow: "var(--glow-primary)",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)"
          }}>
            M
          </div>
          Admin Panel
        </h2>
      </div>

      <nav style={{
        flex: 1,
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        overflowY: "auto",
      }}>
        {visibleLinks.map(({ to, icon: Icon, label, adminOnly }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                color: isActive ? "var(--text-main)" : "var(--text-muted)",
                background: isActive ? "linear-gradient(90deg, var(--bg-surface-hover), transparent)" : "transparent",
                borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.95rem",
                transition: "all var(--transition-normal)",
                textShadow: isActive ? "0 0 10px rgba(255,255,255,0.3)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-main)";
                  e.currentTarget.style.background = "var(--bg-surface-hover)";
                  e.currentTarget.style.transform = "translateX(4px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {adminOnly && (
                <span style={{
                  fontSize: "0.625rem",
                  padding: "0.0625rem 0.375rem",
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-surface)",
                  color: isActive ? "white" : "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}>
                  admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "1rem", borderTop: "1px solid var(--border-color)" }}>
        <button
          onClick={logout}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "flex-start",
            color: "var(--text-muted)",
            background: "transparent",
            padding: "0.625rem 0.875rem",
            fontSize: "0.875rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent-danger)";
            e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
