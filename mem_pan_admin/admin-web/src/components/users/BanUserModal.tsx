import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { banUser } from "../../api/users";
import type { User } from "../../types/admin";
import { X, AlertCircle, Ban, ShieldCheck } from "lucide-react";

interface Props {
  user: User;
  onClose: () => void;
}

export default function BanUserModal({ user, onClose }: Props) {
  const qc = useQueryClient();
  const ban = !user.isBanned;
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => banUser(user.id, { ban, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", user.id] });
      onClose();
    },
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="glass-panel"
        style={{
          background: "var(--bg-base)",
          width: "100%",
          maxWidth: 480,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {ban ? <Ban size={18} color="var(--accent-danger)" /> : <ShieldCheck size={18} color="var(--accent-success)" />}
            {ban ? "Ban user" : "Unban user"}
          </h2>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ fontWeight: 500 }}>{user.username}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{user.email}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.5rem" }}>{user.id}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Reason {ban ? "(recommended)" : "(optional)"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={ban ? "Why is this user being banned?" : "Why is this ban being lifted?"}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {mutation.isError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--accent-danger)",
                fontSize: "0.875rem",
                background: "rgba(220,38,38,0.1)",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <AlertCircle size={16} />
              <span>Failed to update the user. Please try again.</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1.25rem 1.5rem",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : ban ? "Ban user" : "Unban user"}
          </button>
        </div>
      </div>
    </div>
  );
}
