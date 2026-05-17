import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listDecks, type DeckStatus } from "../api/decks";
import DeckTable from "../components/decks/DeckTable";
import { AlertCircle, Layers, Search } from "lucide-react";

const STATUS_FILTERS: { key: "all" | DeckStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "hidden", label: "Hidden" },
  { key: "deleted", label: "Deleted" },
];

export default function DecksPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | DeckStatus>("all");
  const [pageToken, setPageToken] = useState("");
  const [lookupId, setLookupId] = useState("");

  const statusFilter = filter === "all" ? undefined : filter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["decks", filter, pageToken],
    queryFn: () => listDecks({ pageSize: 20, pageToken, statusFilter }),
  });

  const trimmed = lookupId.trim();

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <Layers size={28} color="var(--accent-primary)" />
            Decks
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Hide, restore, or delete user-created decks.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) navigate(`/decks/${encodeURIComponent(trimmed)}`);
          }}
          style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "0.625rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Jump to deck ID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              style={{ paddingLeft: "2rem", fontFamily: "monospace", fontSize: "0.8125rem", width: 280 }}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={!trimmed}>
            Go
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPageToken("");
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-full)",
              background: filter === f.key ? "var(--accent-primary)" : "var(--bg-surface)",
              color: filter === f.key ? "white" : "var(--text-main)",
              fontWeight: filter === f.key ? 600 : 500,
              fontSize: "0.875rem",
              border: "1px solid",
              borderColor: filter === f.key ? "var(--accent-primary)" : "var(--border-color)",
              transition: "all var(--transition-fast)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (filter !== f.key) e.currentTarget.style.background = "var(--bg-surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (filter !== f.key) e.currentTarget.style.background = "var(--bg-surface)";
            }}
          >
            {f.label}
          </button>
        ))}
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
          <p>Failed to load decks. Make sure you are logged in and the deck service is reachable.</p>
        </div>
      ) : isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <p>Loading decks...</p>
        </div>
      ) : (
        <>
          <DeckTable decks={data?.decks ?? []} />

          {data?.nextPageToken && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
              <button className="btn btn-secondary" onClick={() => setPageToken(data.nextPageToken)}>
                Load Next Page
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
