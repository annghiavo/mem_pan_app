import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { processReport, type ProcessReportResponse } from "../../api/reports";
import type { Report, ReportAction } from "../../types/admin";
import { X, AlertCircle, ExternalLink, Ban, EyeOff, Trash2, CheckCircle2 } from "lucide-react";

function targetHref(report: Report): string | null {
  if (report.targetType === "user") return `/users/${encodeURIComponent(report.targetId)}`;
  if (report.targetType === "deck") return `/decks/${encodeURIComponent(report.targetId)}`;
  return null;
}

interface ActionOption {
  action: ReportAction;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: "danger" | "warning" | "secondary";
}

function actionsForTarget(targetType: Report["targetType"]): ActionOption[] {
  if (targetType === "user") {
    return [
      { action: "ban_user", label: "Ban user", description: "Permanently bar the user from MemPan.", icon: <Ban size={16} />, variant: "danger" },
      { action: "dismiss",  label: "Dismiss report", description: "No violation. Notify reporters that no action was taken.", icon: <CheckCircle2 size={16} />, variant: "secondary" },
    ];
  }
  return [
    { action: "hide_deck",   label: "Hide deck",     description: "Make the deck invisible to other users.", icon: <EyeOff size={16} />, variant: "warning" },
    { action: "delete_deck", label: "Delete deck",   description: "Remove the deck (and its cards) from the platform.", icon: <Trash2 size={16} />, variant: "danger" },
    { action: "dismiss",     label: "Dismiss report", description: "No violation. Notify reporters that no action was taken.", icon: <CheckCircle2 size={16} />, variant: "secondary" },
  ];
}

interface Props {
  report: Report;
  onClose: () => void;
}

export default function ProcessReportModal({ report, onClose }: Props) {
  const qc = useQueryClient();
  const [action, setAction] = useState<ReportAction | null>(null);
  const [adminNote, setNote] = useState("");
  const [result, setResult] = useState<ProcessReportResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!action) throw new Error("no action");
      return processReport(report.reportId, { action, adminNote: adminNote || undefined });
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const options = actionsForTarget(report.targetType);

  if (result) {
    return (
      <ModalShell onClose={onClose} title="Report processed">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--accent-success, #34d399)" }}>
            <CheckCircle2 size={20} />
            <strong>Action applied successfully.</strong>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <div><span style={{ color: "var(--text-muted)" }}>Reports resolved for this target:</span> <strong>{result.affectedReports}</strong></div>
            <div><span style={{ color: "var(--text-muted)" }}>Reporters being notified by email:</span> <strong>{result.notifiedReporters}</strong></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Process Report">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Target summary */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Target:</span>
            <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{report.targetType}</span>
            {(() => {
              const href = targetHref(report);
              if (!href) {
                return (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontFamily: "monospace", marginLeft: "auto" }}>
                    {report.targetId}
                  </span>
                );
              }
              return (
                <Link
                  to={href}
                  onClick={onClose}
                  style={{ color: "var(--accent-primary)", fontSize: "0.875rem", fontFamily: "monospace", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  {report.targetId}
                  <ExternalLink size={12} />
                </Link>
              );
            })()}
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

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Choose an action</label>
          {options.map((o) => (
            <button
              key={o.action}
              type="button"
              onClick={() => setAction(o.action)}
              style={{
                textAlign: "left",
                padding: "0.875rem 1rem",
                background: action === o.action ? "var(--bg-surface-hover)" : "var(--bg-surface)",
                border: "1px solid",
                borderColor: action === o.action ? "var(--accent-primary)" : "var(--border-color)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <span style={{ marginTop: "0.125rem", color: variantColor(o.variant) }}>{o.icon}</span>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{o.label}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{o.description}</div>
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Admin note (internal, optional)</label>
          <textarea
            value={adminNote}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add your reasoning for audit/history…"
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          All pending reports for this same target will be resolved together, and every reporter will be emailed.
        </p>

        {mutation.isError && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", fontSize: "0.875rem", background: "rgba(220,38,38,0.1)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
            <AlertCircle size={16} />
            <span>Failed to process report. Please try again.</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)", marginTop: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !action}
          >
            {mutation.isPending ? "Working…" : "Apply action"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function variantColor(variant: ActionOption["variant"]): string {
  switch (variant) {
    case "danger":  return "var(--accent-danger, #f87171)";
    case "warning": return "var(--accent-warning, #fbbf24)";
    case "secondary": return "var(--text-muted)";
  }
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        width: "100%", maxWidth: 540,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
        maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
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
