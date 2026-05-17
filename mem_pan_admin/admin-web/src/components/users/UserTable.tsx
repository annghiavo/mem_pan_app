import { Link } from "react-router-dom";
import type { User } from "../../types/admin";
import { Ban, ShieldCheck, ExternalLink } from "lucide-react";

interface Props {
  users: User[];
  onAction: (user: User) => void;
}

export default function UserTable({ users, onAction }: Props) {
  if (!users || users.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <p>No users found.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border-color)" }}>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>User</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Email</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Joined</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Status</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              style={{ borderBottom: "1px solid var(--border-color)", transition: "background var(--transition-fast)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "1rem" }}>
                <div style={{ fontWeight: 500 }}>{user.username}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.25rem" }}>
                  {user.id}
                </div>
              </td>
              <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{user.email}</td>
              <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td style={{ padding: "1rem" }}>
                {user.isBanned ? (
                  <span
                    style={{
                      backgroundColor: "rgba(220,38,38,0.15)",
                      color: "hsl(0, 80%, 65%)",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Ban size={12} /> Banned
                  </span>
                ) : (
                  <span
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "hsl(150, 60%, 45%)",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <ShieldCheck size={12} /> Active
                  </span>
                )}
              </td>
              <td style={{ padding: "1rem", textAlign: "right" }}>
                <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                  <Link
                    to={`/users/${user.id}`}
                    state={{ user }}
                    className="btn btn-secondary"
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.375rem 0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={14} /> View
                  </Link>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                    onClick={() => onAction(user)}
                  >
                    {user.isBanned ? "Unban" : "Ban"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
