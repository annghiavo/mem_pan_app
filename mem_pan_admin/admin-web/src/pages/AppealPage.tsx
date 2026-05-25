import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Hourglass,
  XCircle,
} from "lucide-react";
import {
  getAppealByToken,
  submitAppealByToken,
  type Appeal,
} from "../api/appeals";

// Public page reached from the deck-deletion email. Token in the URL
// authorizes both the lookup and the submission — no login required.
export default function AppealPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadError("Missing appeal token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getAppealByToken(token)
      .then((data) => {
        setAppeal(data);
        setLoadError(null);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) {
          setLoadError("This appeal link is invalid or has been removed.");
        } else {
          setLoadError("We could not load this appeal. Please try again later.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appeal) return;
    setSubmitting(true);
    setSubmitError(null);
    submitAppealByToken(token, message.trim())
      .then((updated) => setAppeal(updated))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 400) {
          setSubmitError("Please write a short explanation before submitting.");
        } else if (status === 412 || status === 409) {
          setSubmitError(
            "This appeal has already been submitted or decided. Refresh to see the current status.",
          );
        } else {
          setSubmitError("Submission failed. Please try again in a moment.");
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "var(--bg-base)",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "2rem",
        }}
      >
        <header style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
            }}
          >
            MemPan deck appeal
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Ask a moderator to review the removal of your deck.
          </p>
        </header>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading appeal…</p>
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : appeal ? (
          <AppealView
            appeal={appeal}
            message={message}
            setMessage={setMessage}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "var(--accent-danger)",
        background: "rgba(220,38,38,0.1)",
        padding: "1rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(220,38,38,0.2)",
      }}
    >
      <AlertCircle size={20} />
      <span>{message}</span>
    </div>
  );
}

interface ViewProps {
  appeal: Appeal;
  message: string;
  setMessage: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

function AppealView({
  appeal,
  message,
  setMessage,
  submitting,
  submitError,
  onSubmit,
}: ViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
            Deck
          </div>
          <div style={{ fontWeight: 600 }}>{appeal.deckName}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
            Removal reason
          </div>
          <div style={{ fontSize: "0.9375rem" }}>
            {appeal.moderationReason || "—"}
          </div>
        </div>
      </div>

      {appeal.status === "pending" && (
        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Your message to the moderator
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Explain why you believe your deck should be restored…"
            required
            minLength={5}
            style={{ width: "100%", resize: "vertical" }}
          />
          {submitError && (
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
              <span>{submitError}</span>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit appeal"}
          </button>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            You can only submit this appeal once. A moderator will email you
            with the final decision.
          </p>
        </form>
      )}

      {appeal.status === "submitted" && (
        <StatusCard
          icon={<Hourglass size={20} />}
          tone="info"
          title="Appeal submitted"
          body="A moderator will review your case and email you with the final decision. There is nothing more to do for now."
          details={
            appeal.userMessage
              ? `Your message: ${appeal.userMessage}`
              : undefined
          }
        />
      )}

      {appeal.status === "approved" && (
        <StatusCard
          icon={<CheckCircle2 size={20} />}
          tone="success"
          title="Appeal approved"
          body="A moderator approved your appeal. Your deck has been restored."
          details={appeal.decisionNote || undefined}
        />
      )}

      {appeal.status === "rejected" && (
        <StatusCard
          icon={<XCircle size={20} />}
          tone="danger"
          title="Appeal rejected"
          body="A moderator reviewed your appeal and the deletion stands."
          details={appeal.decisionNote || undefined}
        />
      )}
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  title,
  body,
  details,
}: {
  icon: React.ReactNode;
  tone: "info" | "success" | "danger";
  title: string;
  body: string;
  details?: string;
}) {
  const color =
    tone === "success"
      ? "#34d399"
      : tone === "danger"
        ? "#f87171"
        : "#60a5fa";
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        display: "flex",
        gap: "0.75rem",
      }}
    >
      <div style={{ color }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color }}>{title}</div>
        <p style={{ marginTop: "0.25rem", fontSize: "0.9375rem" }}>{body}</p>
        {details && (
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              whiteSpace: "pre-wrap",
            }}
          >
            {details}
          </p>
        )}
      </div>
    </div>
  );
}

