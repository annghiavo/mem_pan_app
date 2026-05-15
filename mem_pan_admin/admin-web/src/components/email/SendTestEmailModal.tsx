import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendTestEmail } from "../../api/emailTemplates";
import type { EmailTemplate } from "../../types/admin";
import VariablesInput from "./VariablesInput";
import { X, Send, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  template: EmailTemplate;
  initialData: Record<string, string>;
  onClose: () => void;
}

function defaultsFor(variables: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variables) out[v] = "";
  return out;
}

export default function SendTestEmailModal({ template, initialData, onClose }: Props) {
  const [to, setTo] = useState("");
  const [data, setData] = useState<Record<string, string>>({
    ...defaultsFor(template.variables ?? []),
    ...initialData,
  });

  const mutation = useMutation({
    mutationFn: () =>
      sendTestEmail(template.templateKey, {
        locale: template.locale,
        to: to.trim(),
        data,
      }),
  });

  const isValid = to.trim().length > 0 && /\S+@\S+\.\S+/.test(to.trim());

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-base)",
          width: "100%", maxWidth: 480,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Send test email</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
              Template <code style={{ fontFamily: "monospace" }}>{template.templateKey}</code> · {template.locale}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Recipient</label>
            <input
              type="email"
              placeholder="qa@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Template variables</label>
            <VariablesInput
              variables={template.variables ?? []}
              values={data}
              onChange={setData}
            />
          </div>

          {mutation.isError && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", fontSize: "0.875rem", background: "rgba(220,38,38,0.1)", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <AlertCircle size={16} />
              <span>
                Failed to send. Check that SMTP is configured on the notification service.
              </span>
            </div>
          )}

          {mutation.isSuccess && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-success)", fontSize: "0.875rem", background: "rgba(16,185,129,0.1)", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <CheckCircle2 size={16} />
              <span>{mutation.data?.message ?? `Sent to ${to.trim()}.`}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1.25rem 1.5rem", borderTop: "1px solid var(--border-color)", background: "var(--bg-surface)" }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            style={{ opacity: !isValid || mutation.isPending ? 0.6 : 1 }}
          >
            <Send size={16} />
            {mutation.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
