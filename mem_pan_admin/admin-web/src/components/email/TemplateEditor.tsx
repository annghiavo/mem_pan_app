import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  previewEmailTemplate,
  updateEmailTemplate,
} from "../../api/emailTemplates";
import type { EmailTemplate, PreviewEmailTemplateResponse } from "../../types/admin";
import VariablesInput from "./VariablesInput";
import SendTestEmailModal from "./SendTestEmailModal";
import {
  Save,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Info,
  Code,
  Eye,
} from "lucide-react";

interface Props {
  template: EmailTemplate;
}

type PreviewMode = "html" | "text";

function sampleValuesFor(variables: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variables) {
    const key = v.toLowerCase();
    if (key.includes("url")) out[v] = "https://mempan.example.com/sample";
    else if (key === "username") out[v] = "Alice";
    else if (key === "duecount") out[v] = "12";
    else out[v] = "Sample";
  }
  return out;
}

export default function TemplateEditor({ template }: Props) {
  const qc = useQueryClient();

  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [textBody, setTextBody] = useState(template.textBody);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("html");
  const [previewData, setPreviewData] = useState<Record<string, string>>(() =>
    sampleValuesFor(template.variables ?? []),
  );
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    setSubject(template.subject);
    setHtmlBody(template.htmlBody);
    setTextBody(template.textBody);
    setPreviewData(sampleValuesFor(template.variables ?? []));
  }, [template.id, template.subject, template.htmlBody, template.textBody, template.variables]);

  const isDirty =
    subject !== template.subject ||
    htmlBody !== template.htmlBody ||
    textBody !== template.textBody;

  const updateMutation = useMutation({
    mutationFn: () =>
      updateEmailTemplate(template.templateKey, {
        locale: template.locale,
        subject,
        htmlBody,
        textBody,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(["email-templates"], (old: EmailTemplate[] | undefined) =>
        old?.map((t) =>
          t.templateKey === updated.templateKey && t.locale === updated.locale
            ? updated
            : t,
        ),
      );
      qc.invalidateQueries({ queryKey: ["email-template-preview", updated.templateKey, updated.locale] });
    },
  });

  const previewQuery = useQuery<PreviewEmailTemplateResponse>({
    queryKey: ["email-template-preview", template.templateKey, template.locale, previewData],
    queryFn: () =>
      previewEmailTemplate(template.templateKey, {
        locale: template.locale,
        data: previewData,
      }),
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1rem",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 600 }}>{template.templateKey}</h2>
            <span style={{
              fontSize: "0.6875rem",
              padding: "0.125rem 0.5rem",
              borderRadius: "var(--radius-full)",
              background: "var(--bg-surface-hover)",
              color: "var(--text-muted)",
              fontFamily: "monospace",
            }}>
              {template.locale} · v{template.version}
            </span>
            {!template.isActive && (
              <span style={{
                fontSize: "0.6875rem",
                padding: "0.125rem 0.5rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(220, 38, 38, 0.15)",
                color: "var(--accent-danger)",
              }}>
                inactive
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
            Last updated {template.updatedAt}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowTestModal(true)}
            style={{ fontSize: "0.875rem" }}
            title="Send a test email"
          >
            <Send size={14} />
            Test send
          </button>
          <button
            className="btn btn-primary"
            onClick={() => updateMutation.mutate()}
            disabled={!isDirty || updateMutation.isPending}
            style={{
              fontSize: "0.875rem",
              opacity: !isDirty || updateMutation.isPending ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            {updateMutation.isPending ? "Saving..." : isDirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {updateMutation.isError && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", fontSize: "0.875rem", background: "rgba(220,38,38,0.1)", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertCircle size={16} />
          <span>Failed to save. Check the notification service is reachable.</span>
        </div>
      )}
      {updateMutation.isSuccess && !isDirty && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-success)", fontSize: "0.875rem", background: "rgba(16,185,129,0.08)", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <CheckCircle2 size={16} />
          <span>Saved. Preview reflects the new version.</span>
        </div>
      )}

      {/* Two-column edit + preview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        flex: 1,
        minHeight: 0,
      }}>
        {/* Editor column */}
        <div className="glass-panel" style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minHeight: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Code size={16} color="var(--text-muted)" />
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Edit
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, minHeight: 0 }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>HTML body</label>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              spellCheck={false}
              style={{
                resize: "none",
                flex: 1,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.8125rem",
                minHeight: "150px",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, minHeight: 0 }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Plain text body</label>
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              spellCheck={false}
              style={{
                resize: "none",
                flex: 1,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.8125rem",
                minHeight: "100px",
              }}
            />
          </div>
        </div>

        {/* Preview column */}
        <div className="glass-panel" style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minHeight: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Eye size={16} color="var(--text-muted)" />
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Preview
              </h3>
            </div>

            <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-surface)", padding: "0.125rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              {(["html", "text"] as PreviewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPreviewMode(m)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    background: previewMode === m ? "var(--accent-primary)" : "transparent",
                    color: previewMode === m ? "white" : "var(--text-muted)",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {isDirty && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--accent-warning)", background: "rgba(245, 158, 11, 0.08)", padding: "0.5rem 0.625rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
              <Info size={14} />
              <span>Preview shows the saved version. Save your edits to refresh.</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Variables</label>
              <button
                onClick={() => previewQuery.refetch()}
                disabled={previewQuery.isFetching}
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
                title="Re-render preview"
              >
                <RefreshCw
                  size={12}
                  style={{
                    animation: previewQuery.isFetching ? "spin 1s linear infinite" : "none",
                  }}
                />
                Refresh
              </button>
            </div>
            <VariablesInput
              variables={template.variables ?? []}
              values={previewData}
              onChange={setPreviewData}
            />
          </div>

          {/* Rendered preview */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {previewQuery.isError ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-danger)", fontSize: "0.875rem", background: "rgba(220,38,38,0.1)", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
                <AlertCircle size={16} />
                <span>Failed to render preview.</span>
              </div>
            ) : (
              <>
                <div style={{
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8125rem",
                }}>
                  <span style={{ color: "var(--text-muted)", marginRight: "0.5rem" }}>Subject:</span>
                  <span style={{ fontWeight: 500 }}>
                    {previewQuery.isFetching && !previewQuery.data
                      ? "Loading..."
                      : previewQuery.data?.subject || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>(empty)</span>}
                  </span>
                </div>

                {previewMode === "html" ? (
                  <iframe
                    title="email preview"
                    srcDoc={previewQuery.data?.htmlBody ?? ""}
                    style={{
                      flex: 1,
                      width: "100%",
                      background: "white",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      minHeight: "300px",
                    }}
                    sandbox=""
                  />
                ) : (
                  <pre style={{
                    flex: 1,
                    margin: 0,
                    padding: "0.75rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "0.8125rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "auto",
                    minHeight: "300px",
                  }}>
                    {previewQuery.data?.textBody ?? ""}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showTestModal && (
        <SendTestEmailModal
          template={template}
          initialData={previewData}
          onClose={() => setShowTestModal(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
