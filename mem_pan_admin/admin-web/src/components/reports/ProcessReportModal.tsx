import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { processReport } from "../../api/reports";
import type { Report } from "../../types/admin";
import { X, AlertCircle } from "lucide-react";

interface Props {
  report: Report;
  onClose: () => void;
}

export default function ProcessReportModal({ report, onClose }: Props) {
  const qc = useQueryClient();
  const [action, setAction] = useState<"resolve" | "dismiss" | "review">("review");
  const [resolution, setRes] = useState<string>("");
  const [adminNote, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      processReport(report.reportId, {
        action,
        resolution: action === "resolve" ? (resolution as any) : undefined,
        adminNote: adminNote || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      onClose();
    },
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease-out"
    }}>
      <div className="glass-panel" style={{
        background: "var(--bg-base)",
        width: "100%", maxWidth: 500,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Process Report</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Target:</span>
              <span style={{ fontWeight: 500 }}>{report.targetType}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontFamily: "monospace", marginLeft: "auto" }}>{report.targetId}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Category:</span>
              <span style={{ fontWeight: 500 }}>{report.reasonCategory.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.25rem" }}>Description:</span>
              <p style={{ background: "var(--bg-surface)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", border: "1px solid var(--border-color)", minHeight: "3rem" }}>
                {report.description || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description provided.</span>}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value as any)} style={{ width: "100%" }}>
              <option value="review">Mark as Reviewing</option>
              <option value="resolve">Resolve</option>
              <option value="dismiss">Dismiss</option>
            </select>
          </div>

          {action === "resolve" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", animation: "fadeIn 0.2s ease-out" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Resolution</label>
              <select value={resolution} onChange={(e) => setRes(e.target.value)} style={{ width: "100%" }}>
                <option value="">— Select an outcome —</option>
                <option value="banned">Ban User</option>
                <option value="deleted">Delete Content</option>
                <option value="warned">Warn User</option>
                <option value="no_action">No Action</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Admin Note (Internal)</label>
            <textarea 
              value={adminNote} 
              onChange={(e) => setNote(e.target.value)} 
              rows={3} 
              placeholder="Add your investigation notes here..."
              style={{ width: "100%", resize: "vertical" }} 
            />
          </div>

          {mutation.isError && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", fontSize: "0.875rem", background: "rgba(220,38,38,0.1)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <AlertCircle size={16} />
              <span>Failed to process report. Please try again.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1.25rem 1.5rem", borderTop: "1px solid var(--border-color)", background: "var(--bg-surface)" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || (action === 'resolve' && !resolution)}
          >
            {mutation.isPending ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
