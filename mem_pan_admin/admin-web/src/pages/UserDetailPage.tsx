import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../api/users";
import BanUserModal from "../components/users/BanUserModal";
import type { User } from "../types/admin";
import { ArrowLeft, AlertCircle, Ban, ShieldCheck, User as UserIcon } from "lucide-react";

interface LocationState {
  user?: User;
}

export default function UserDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const passedUser = (location.state as LocationState | null)?.user;
  const [openBan, setOpenBan] = useState(false);

  // Fall back to scanning ListUsers when the user wasn't passed via router state.
  // The auth service hasn't exposed a single-user GET; this keeps the page useful
  // when navigating via direct URL or from a report deep link.
  const { data: scannedUser, isLoading, isError } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      let pageToken = "";
      for (let i = 0; i < 20; i++) {
        const res = await listUsers({ pageSize: 100, pageToken });
        const hit = res.users.find((u) => u.id === id);
        if (hit) return hit;
        if (!res.nextPageToken) return null;
        pageToken = res.nextPageToken;
      }
      return null;
    },
    enabled: !!id && !passedUser,
    staleTime: 30_000,
  });

  const user = passedUser ?? scannedUser ?? undefined;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          to="/users"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> Back to users
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <UserIcon size={28} color="var(--accent-primary)" />
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700 }}>User detail</h1>
      </div>

      {isError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--accent-danger)",
            background: "rgba(220,38,38,0.1)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          <AlertCircle size={20} />
          <p>Failed to load the user list.</p>
        </div>
      ) : !user && isLoading ? (
        <div className="glass-panel" style={{ padding: "2rem", color: "var(--text-muted)" }}>
          Looking up user...
        </div>
      ) : !user ? (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent-warning)",
              marginBottom: "1rem",
            }}
          >
            <AlertCircle size={18} />
            <span>Couldn't find a full profile for this user — showing the ID-only view.</span>
          </div>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              rowGap: "0.75rem",
              columnGap: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--text-muted)" }}>User ID</dt>
            <dd style={{ fontFamily: "monospace" }}>{id}</dd>
          </dl>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{user.email}</div>
            </div>
            {user.isBanned ? (
              <span
                style={{
                  backgroundColor: "rgba(220,38,38,0.15)",
                  color: "hsl(0, 80%, 65%)",
                  padding: "0.375rem 0.75rem",
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
                  padding: "0.375rem 0.75rem",
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
          </div>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              rowGap: "0.75rem",
              columnGap: "1.5rem",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            <dt style={{ color: "var(--text-muted)" }}>User ID</dt>
            <dd style={{ fontFamily: "monospace" }}>{user.id}</dd>

            <dt style={{ color: "var(--text-muted)" }}>Email</dt>
            <dd>{user.email}</dd>

            <dt style={{ color: "var(--text-muted)" }}>Joined</dt>
            <dd>
              {new Date(user.createdAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </dd>
          </dl>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={() => setOpenBan(true)}>
              {user.isBanned ? "Unban user" : "Ban user"}
            </button>
          </div>
        </div>
      )}

      {user && openBan && <BanUserModal user={user} onClose={() => setOpenBan(false)} />}
    </div>
  );
}
