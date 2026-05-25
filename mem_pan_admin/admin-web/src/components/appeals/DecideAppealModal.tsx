import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  decideAppeal,
  type Appeal,
  type AppealDecision,
} from "../../api/appeals";
import {
  X,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Props {
  appeal: Appeal;
  onClose: () => void;
}

export default function DecideAppealModal({ appeal, onClose }: Props) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<AppealDecision | null>(null);
  const [note, setNote] = useState("");

  const readOnly = appeal.status !== "submitted";

  const mutation = useMutation({
    mutationFn: () => {
      if (!decision) throw new Error("no decision");
      return decideAppeal(appeal.appealId, { decision, note: note || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appeals"] });
      onClose();
    },
  });

  return (
    <ModalShell
      onClose={onClose}
      title={readOnly ? "Appeal details" : "Review appeal"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          <Row label="Deck">
            <span style={{ fontWeight: 500 }}>{appeal.deckName}</span>
            <Link
              to={`/decks/${encodeURIComponent(appeal.deckId)}`}
              onClick={onClose}
              style={linkStyle}
            >
              {appeal.deckId.slice(0, 8)}…
              <ExternalLink size={12} />
            </Link>
          </Row>
          <Row label="Owner">
            <Link
              to={`/users/${encodeURIComponent(appeal.userId)}`}
              onClick={onClose}
              style={linkStyle}
            >
              {appeal.userId.slice(0, 8)}…
              <ExternalLink size={12} />
            </Link>
          </Row>
          <Row label="Removal reason">
            <span style={{ fontSize: "0.875rem" }}>
              {appeal.moderationReason || "—"}
            </span>
          </Row>
          <Row label="Status">
            <span
              style={{
                padding: "0.125rem 0.5rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: "var(--bg-surface)",
              }}
            >
              {appeal.status}
            </span>
          </Row>
        </div>

        {appeal.userMessage ? (
          <div>
            <label style={labelStyle}>User's appeal message</label>
            <p
              style={{
                background: "var(--bg-surface)",
                padding: "0.875rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem",
                border: "1px solid var(--border-color)",
                whiteSpace: "pre-wrap",
              }}
            >
              {appeal.userMessage}
            </p>
            {appeal.submittedAt && (
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                Submitted {new Date(appeal.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            The user has not submitted their appeal yet — they still have the
            email link.
          </p>
        )}

        {readOnly && appeal.decisionNote && (
          <div>
            <label style={labelStyle}>Moderator note</label>
            <p
              style={{
                background: "var(--bg-surface)",
                padding: "0.875rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem",
                border: "1px solid var(--border-color)",
                whiteSpace: "pre-wrap",
              }}
            >
              {appeal.decisionNote}
            </p>
            {appeal.decidedAt && (
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                Decided {new Date(appeal.decidedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {!readOnly && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={labelStyle}>Decision</label>
              <ActionButton
                active={decision === "approve"}
                onClick={() => setDecision("approve")}
                tone="success"
                icon={<CheckCircle2 size={16} />}
                title="Approve appeal"
                desc="Restore the deck to active. The user is emailed."
              />
              <ActionButton
                active={decision === "reject"}
                onClick={() => setDecision("reject")}
                tone="danger"
                icon={<XCircle size={16} />}
                title="Reject appeal"
                desc="Keep the deck removed. The user is emailed."
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={labelStyle}>
                Note to the user (included in their email)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Explain your reasoning…"
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
                <span>Failed to record decision. Please try again.</span>
              </div>
            )}
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--border-color)",
            marginTop: "0.5rem",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button
              className="btn btn-primary"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !decision}
            >
              {mutation.isPending ? "Working…" : "Submit decision"}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <span
        style={{
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          minWidth: 110,
        }}
      >
        {label}:
      </span>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  tone,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  tone: "success" | "danger";
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const color =
    tone === "success" ? "var(--accent-success, #34d399)" : "var(--accent-danger, #f87171)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "0.875rem 1rem",
        background: active ? "var(--bg-surface-hover)" : "var(--bg-surface)",
        border: "1px solid",
        borderColor: active ? color : "var(--border-color)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}
    >
      <span style={{ marginTop: "0.125rem", color }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {desc}
        </div>
      </span>
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  display: "block",
  marginBottom: "0.375rem",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent-primary)",
  fontSize: "0.875rem",
  fontFamily: "monospace",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
};

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
      }}
    >
      <div
        className="glass-panel"
        style={{
          background: "var(--bg-base)",
          width: "100%",
          maxWidth: 540,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
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
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "1.5rem", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
