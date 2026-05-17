import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listReports } from "../api/reports";
import ReportTable from "../components/reports/ReportTable";
import ProcessReportModal from "../components/reports/ProcessReportModal";
import type { Report } from "../types/admin";
import { AlertCircle, FileWarning } from "lucide-react";

const STATUS_FILTERS = ["", "pending", "resolved", "dismissed"] as const;
const FILTER_LABELS = ["All", "Pending", "Resolved", "Dismissed"];

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pageToken, setPageToken] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", statusFilter, pageToken],
    queryFn: () => listReports({ pageSize: 20, pageToken, statusFilter }),
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <FileWarning size={28} color="var(--accent-primary)" />
            Reports
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Manage and review user-submitted reports.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {STATUS_FILTERS.map((f, i) => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPageToken(""); }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-full)",
              background: statusFilter === f ? "var(--accent-primary)" : "var(--bg-surface)",
              color: statusFilter === f ? "white" : "var(--text-main)",
              fontWeight: statusFilter === f ? 600 : 500,
              fontSize: "0.875rem",
              border: "1px solid",
              borderColor: statusFilter === f ? "var(--accent-primary)" : "var(--border-color)",
              transition: "all var(--transition-fast)",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={e => {
              if (statusFilter !== f) {
                e.currentTarget.style.background = "var(--bg-surface-hover)";
              }
            }}
            onMouseLeave={e => {
              if (statusFilter !== f) {
                e.currentTarget.style.background = "var(--bg-surface)";
              }
            }}
          >
            {FILTER_LABELS[i]}
          </button>
        ))}
      </div>

      {isError ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", background: "rgba(220,38,38,0.1)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertCircle size={20} />
          <p>Failed to load reports. Make sure you are logged in and the server is running.</p>
        </div>
      ) : isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <p>Loading reports...</p>
        </div>
      ) : (
        <>
          <ReportTable
            reports={data?.reports ?? []}
            onAction={setSelected}
          />
          
          {data?.nextPageToken && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
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
        <ProcessReportModal
          report={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
