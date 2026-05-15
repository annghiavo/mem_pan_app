import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEmailTemplates } from "../api/emailTemplates";
import TemplateList from "../components/email/TemplateList";
import TemplateEditor from "../components/email/TemplateEditor";
import type { EmailTemplate } from "../types/admin";
import { Mail, AlertCircle, ShieldX } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function EmailTemplatesPage() {
  const role = useAuthStore((s) => s.role);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: templates = [], isLoading, isError, error } = useQuery({
    queryKey: ["email-templates"],
    queryFn: listEmailTemplates,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selected: EmailTemplate | undefined = templates.find((t) => t.id === selectedId);

  if (role && role !== "admin") {
    return (
      <div className="animate-fade-in glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
        <ShieldX size={36} color="var(--accent-danger)" style={{ marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Admin only</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Email template management is restricted to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px - 4rem)" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <Mail size={28} color="var(--accent-primary)" />
          Email templates
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Edit transactional emails, preview with sample data, and send a test send.
        </p>
      </div>

      {isError ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--accent-danger)",
          background: "rgba(220,38,38,0.1)",
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(220,38,38,0.2)",
        }}>
          <AlertCircle size={20} />
          <p>
            Failed to load templates.
            {error && typeof error === "object" && "message" in error ? ` (${(error as Error).message})` : ""}
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: "1rem",
          flex: 1,
          minHeight: 0,
        }}>
          <aside className="glass-panel" style={{ overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Loading...
              </div>
            ) : (
              <TemplateList
                templates={templates}
                selectedId={selectedId}
                onSelect={(t) => setSelectedId(t.id)}
              />
            )}
          </aside>

          <section style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
            {selected ? (
              <TemplateEditor key={selected.id} template={selected} />
            ) : (
              <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                {isLoading ? "Loading..." : "Select a template from the list."}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
