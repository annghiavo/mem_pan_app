import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDecks, updateDeckStatus, type Deck, type DeckStatus } from "../api/decks";
import { ArrowLeft, AlertCircle, CheckCircle2, Layers, ExternalLink } from "lucide-react";

interface LocationState {
  deck?: Deck;
}

const STATUS_COLORS: Record<DeckStatus, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.15)", text: "hsl(150, 60%, 45%)" },
  deleted: { bg: "rgba(220,38,38,0.15)", text: "hsl(0, 80%, 65%)" },
};

export default function DeckDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const passedDeck = (location.state as LocationState | null)?.deck;
  const qc = useQueryClient();

  // The admin deck service has no single-deck GET endpoint. When we don't have the
  // deck from router state (e.g. deep-linked from a report), scan ListDecks across
  // every status so we still find decks that were already soft-deleted.
  const { data: scannedDeck, isLoading: scanLoading } = useQuery({
    queryKey: ["deck", id],
    queryFn: async () => {
      const statuses: (DeckStatus | undefined)[] = [
        undefined,
        "active",
        "deleted",
      ];
      for (const statusFilter of statuses) {
        let pageToken = "";
        for (let i = 0; i < 20; i++) {
          const res = await listDecks({ pageSize: 100, pageToken, statusFilter });
          const hit = res.decks.find((d) => d.deckId === id);
          if (hit) return hit;
          if (!res.nextPageToken) break;
          pageToken = res.nextPageToken;
        }
      }
      return null;
    },
    enabled: !!id && !passedDeck,
    staleTime: 30_000,
  });

  const deck = passedDeck ?? scannedDeck ?? undefined;
  const initialStatus: DeckStatus = deck?.status ?? "active";

  const [status, setStatus] = useState<DeckStatus>(initialStatus);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (deck) setStatus(deck.status);
  }, [deck]);

  const mutation = useMutation({
    mutationFn: () => updateDeckStatus(id, { status, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["deck", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const noChange = deck ? status === deck.status : false;
  const statusColor = deck ? (STATUS_COLORS[deck.status] || { bg: "rgba(255,255,255,0.1)", text: "var(--text-main)" }) : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          to="/decks"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> Back to decks
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Layers size={28} color="var(--accent-primary)" />
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700 }}>Deck detail</h1>
      </div>

      <div className="glass-panel" style={{ padding: "1.75rem" }}>
        {!deck && scanLoading ? (
          <div style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>Looking up deck...</div>
        ) : !deck ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent-warning)",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
            }}
          >
            <AlertCircle size={16} />
            <span>Couldn't find this deck in the listing — showing the ID-only view.</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{deck.name || "(untitled deck)"}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.25rem" }}>
                {deck.deckId}
              </div>
            </div>
            {statusColor && (
              <span
                style={{
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  padding: "0.375rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                }}
              >
                {deck.status}
              </span>
            )}
          </div>
        )}

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
          <dt style={{ color: "var(--text-muted)" }}>Deck ID</dt>
          <dd style={{ fontFamily: "monospace" }}>{id}</dd>

          {import.meta.env.VITE_MAIN_APP_URL && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Main App</dt>
              <dd>
                <a
                  href={`${import.meta.env.VITE_MAIN_APP_URL}/module/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: "var(--accent-primary)",
                    textDecoration: "none",
                  }}
                >
                  View Deck <ExternalLink size={14} />
                </a>
              </dd>
            </>
          )}

          {deck && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Owner</dt>
              <dd>
                <Link to={`/users/${deck.userId}`} style={{ fontFamily: "monospace" }}>
                  {deck.userId}
                </Link>
              </dd>

              {typeof deck.cardCount === "number" && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>Cards</dt>
                  <dd>{deck.cardCount}</dd>
                </>
              )}

              <dt style={{ color: "var(--text-muted)" }}>Created</dt>
              <dd>
                {new Date(deck.createdAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>

              <dt style={{ color: "var(--text-muted)" }}>Updated</dt>
              <dd>
                {new Date(deck.updatedAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </>
          )}
        </dl>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mutation.isPending && !noChange) mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}
        >
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Change status
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as DeckStatus)} style={{ width: "100%" }}>
              <option value="active">Active</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is the status changing?"
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
              <span>Failed to update the deck. Please try again.</span>
            </div>
          )}

          {mutation.isSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--accent-success)",
                fontSize: "0.875rem",
                background: "rgba(16,185,129,0.08)",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                Deck status is now <strong>{mutation.data?.status}</strong>.
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || noChange}>
              {mutation.isPending ? "Saving..." : "Update status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
