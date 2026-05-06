import type { Report } from "../../types/admin";
import StatusBadge from "../common/StatusBadge";


interface Props {
  reports: Report[];
  onAction: (report: Report) => void;
}

export default function ReportTable({ reports, onAction }: Props) {
  if (!reports || reports.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <p>No reports found.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border-color)" }}>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Target</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Category</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Date</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>Status</th>
            <th style={{ padding: "1rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.875rem", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.reportId} style={{ borderBottom: "1px solid var(--border-color)", transition: "background var(--transition-fast)" }} 
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "1rem" }}>
                <div style={{ fontWeight: 500 }}>{report.targetType}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.25rem" }}>{report.targetId}</div>
              </td>
              <td style={{ padding: "1rem" }}>
                <span style={{ fontSize: "0.875rem", background: "var(--bg-surface)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  {report.reasonCategory.replace(/_/g, ' ')}
                </span>
              </td>
              <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                {new Date(report.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td style={{ padding: "1rem" }}>
                <StatusBadge status={report.status} />
              </td>
              <td style={{ padding: "1rem", textAlign: "right" }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                  onClick={() => onAction(report)}
                >
                  Process
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
