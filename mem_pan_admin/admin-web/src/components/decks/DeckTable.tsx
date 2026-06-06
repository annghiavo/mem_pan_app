import { Link } from "react-router-dom";
import type { Deck, DeckStatus } from "../../api/decks";
import { ExternalLink } from "lucide-react";

interface Props {
  decks: Deck[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.15)", text: "hsl(150, 60%, 45%)" },
  deleted: { bg: "rgba(220,38,38,0.15)", text: "hsl(0, 80%, 65%)" },
};

export default function DeckTable({ decks }: Props) {
  if (!decks || decks.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <p>No decks found.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border-color)" }}>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Deck</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Owner</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Updated</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Status</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {decks.map((deck) => {
            const colors = STATUS_COLORS[deck.status] ?? STATUS_COLORS.active;
            return (
              <tr
                key={deck.deckId}
                style={{ borderBottom: "1px solid var(--border-color)", transition: "background var(--transition-fast)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 500 }}>{deck.name || "(untitled deck)"}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.25rem" }}>
                    {deck.deckId}
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <Link to={`/users/${deck.userId}`} style={{ fontSize: "0.8125rem", fontFamily: "monospace", color: "var(--accent-primary)" }}>
                    {deck.userId}
                  </Link>
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  {new Date(deck.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td style={{ padding: "1rem" }}>
                  <span
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {deck.status}
                  </span>
                </td>
                <td style={{ padding: "1rem", textAlign: "right" }}>
                  <Link
                    to={`/decks/${deck.deckId}`}
                    state={{ deck }}
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
                    <ExternalLink size={14} /> Manage
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
