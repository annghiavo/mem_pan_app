import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, AlertCircle } from "lucide-react";
import { listAppeals, type Appeal, type AppealStatus } from "../api/appeals";
import AppealTable from "../components/appeals/AppealTable";
import DecideAppealModal from "../components/appeals/DecideAppealModal";

const STATUS_FILTERS: (AppealStatus | "")[] = [
  "",
  "submitted",
  "pending",
  "approved",
  "rejected",
];
const FILTER_LABELS = ["All", "Submitted", "Pending", "Approved", "Rejected"];

export default function AppealsPage() {
  const [statusFilter, setStatusFilter] = useState<AppealStatus | "">(
    "submitted",
  );
  const [pageToken, setPageToken] = useState("");
  const [selected, setSelected] = useState<Appeal | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appeals", statusFilter, pageToken],
    queryFn: () =>
      listAppeals({
        pageSize: 20,
        pageToken,
        statusFilter,
      }),
  });

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
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
            <ShieldAlert size={28} color="var(--accent-primary)" />
            Deck Appeals
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Review appeals filed by deck owners after their deck was removed.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        {STATUS_FILTERS.map((f, i) => (
          <button
            key={f || "all"}
            onClick={() => {
              setStatusFilter(f);
              setPageToken("");
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-full)",
              background:
                statusFilter === f
                  ? "var(--accent-primary)"
                  : "var(--bg-surface)",
              color: statusFilter === f ? "white" : "var(--text-main)",
              fontWeight: statusFilter === f ? 600 : 500,
              fontSize: "0.875rem",
              border: "1px solid",
              borderColor:
                statusFilter === f
                  ? "var(--accent-primary)"
                  : "var(--border-color)",
              transition: "all var(--transition-fast)",
              whiteSpace: "nowrap",
            }}
          >
            {FILTER_LABELS[i]}
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
          <p>Failed to load appeals.</p>
        </div>
      ) : isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "3rem",
            color: "var(--text-muted)",
          }}
        >
          <p>Loading appeals...</p>
        </div>
      ) : (
        <>
          <AppealTable
            appeals={data?.appeals ?? []}
            onReview={setSelected}
          />

          {data?.nextPageToken && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "1.5rem",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setPageToken(data.nextPageToken)}
              >
                Load Next Page
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <DecideAppealModal
          appeal={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
