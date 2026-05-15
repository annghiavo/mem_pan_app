import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { promoteModerator } from "../api/moderator";
import { useAuthStore } from "../store/authStore";
import {
  ShieldCheck,
  ShieldX,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: { message?: string };
  };
}

function parseError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong.";
  const e = err as AxiosLikeError;
  const status = e.response?.status;
  const serverMessage = e.response?.data?.message;
  if (status === 400) return serverMessage || "Email is required.";
  if (status === 403) return "You don't have permission to promote moderators.";
  if (status === 404) return "User not found.";
  return serverMessage || "Failed to promote user. Try again.";
}

export default function ModeratorsPage() {
  const role = useAuthStore((s) => s.role);
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => promoteModerator(email.trim()),
    onSuccess: () => setEmail(""),
  });

  if (role && role !== "admin") {
    return (
      <div className="animate-fade-in glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
        <ShieldX size={36} color="var(--accent-danger)" style={{ marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Admin only</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Only administrators can promote users to moderators.
        </p>
      </div>
    );
  }

  const trimmed = email.trim();
  const isValid = trimmed.length > 0 && /\S+@\S+\.\S+/.test(trimmed);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <ShieldCheck size={28} color="var(--accent-primary)" />
          Moderators
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Grant a user the <code style={{ fontFamily: "monospace" }}>moderator</code> role.
          They will be able to triage reports.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "1.75rem" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid && !mutation.isPending) mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>User email</label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{
                  position: "absolute", left: "0.75rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
                }}
              />
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
                autoComplete="off"
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              The user must already have an account.
            </p>
          </div>

          {mutation.isError && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent-danger)",
              fontSize: "0.875rem",
              background: "rgba(220,38,38,0.1)",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}>
              <AlertCircle size={16} />
              <span>{parseError(mutation.error)}</span>
            </div>
          )}

          {mutation.isSuccess && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent-success)",
              fontSize: "0.875rem",
              background: "rgba(16,185,129,0.08)",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}>
              <CheckCircle2 size={16} />
              <span>
                Promoted <strong>{mutation.data?.username || mutation.data?.email}</strong> to moderator.
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || mutation.isPending}
              style={{
                opacity: !isValid || mutation.isPending ? 0.6 : 1,
              }}
            >
              {mutation.isPending ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <ShieldCheck size={16} />
              )}
              {mutation.isPending ? "Promoting..." : "Promote to moderator"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
