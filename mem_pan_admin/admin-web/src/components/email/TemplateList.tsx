import type { EmailTemplate } from "../../types/admin";
import { Mail } from "lucide-react";

interface Props {
  templates: EmailTemplate[];
  selectedId: string | null;
  onSelect: (template: EmailTemplate) => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  email_verification: "Email verification",
  password_reset: "Password reset",
  study_reminder: "Study reminder",
};

export default function TemplateList({ templates, selectedId, onSelect }: Props) {
  if (templates.length === 0) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        No templates found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.5rem" }}>
      {templates.map((t) => {
        const isSelected = t.id === selectedId;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              background: isSelected ? "var(--accent-primary)" : "transparent",
              color: isSelected ? "white" : "var(--text-main)",
              textAlign: "left",
              transition: "all var(--transition-fast)",
              border: "1px solid",
              borderColor: isSelected ? "var(--accent-primary)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = "var(--bg-surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = "transparent";
            }}
          >
            <Mail size={14} style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.7 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                {TEMPLATE_LABELS[t.templateKey] ?? t.templateKey}
              </div>
              <div style={{
                fontSize: "0.6875rem",
                color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
                fontFamily: "monospace",
                marginTop: "0.125rem",
              }}>
                {t.templateKey} · {t.locale} · v{t.version}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
