import { Link } from "react-router-dom";
import { Eye, ExternalLink } from "lucide-react";
import type { Appeal, AppealStatus } from "../../api/appeals";

interface Props {
  appeals: Appeal[];
  onReview: (a: Appeal) => void;
}

const STATUS_STYLES: Record<AppealStatus, { bg: string; color: string }> = {
  pending: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  submitted: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  approved: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  rejected: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
};

export default function AppealTable({ appeals, onReview }: Props) {
  if (appeals.length === 0) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--text-muted)",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      >
        No appeals match this filter.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        overflowX: "auto",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              background: "var(--bg-surface-hover)",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            <th style={cellStyle}>Deck</th>
            <th style={cellStyle}>Reason</th>
            <th style={cellStyle}>User message</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Submitted</th>
            <th style={cellStyle} />
          </tr>
        </thead>
        <tbody>
          {appeals.map((a) => {
            const style = STATUS_STYLES[a.status];
            return (
              <tr
                key={a.appealId}
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600 }}>{a.deckName}</div>
                  <Link
                    to={`/decks/${encodeURIComponent(a.deckId)}`}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: "var(--accent-primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {a.deckId.slice(0, 8)}…
                    <ExternalLink size={12} />
                  </Link>
                </td>
                <td style={{ ...cellStyle, maxWidth: 220 }}>
                  <span style={{ fontSize: "0.875rem" }}>
                    {a.moderationReason || (
                      <em style={{ color: "var(--text-muted)" }}>—</em>
                    )}
                  </span>
                </td>
                <td style={{ ...cellStyle, maxWidth: 280 }}>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {a.userMessage || (
                      <em style={{ color: "var(--text-muted)" }}>
                        Not submitted yet
                      </em>
                    )}
                  </span>
                </td>
                <td style={cellStyle}>
                  <span
                    style={{
                      background: style.bg,
                      color: style.color,
                      padding: "0.25rem 0.625rem",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {a.status}
                  </span>
                </td>
                <td
                  style={{
                    ...cellStyle,
                    color: "var(--text-muted)",
                    fontSize: "0.8125rem",
                  }}
                >
                  {a.submittedAt
                    ? new Date(a.submittedAt).toLocaleString()
                    : "—"}
                </td>
                <td style={cellStyle}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onReview(a)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      padding: "0.4rem 0.75rem",
                    }}
                  >
                    <Eye size={14} />
                    {a.status === "submitted" ? "Review" : "View"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "0.875rem 1rem",
  textAlign: "left",
  verticalAlign: "top",
};
