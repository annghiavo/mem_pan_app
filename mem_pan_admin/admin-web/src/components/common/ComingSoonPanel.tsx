import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  plannedFeatures: string[];
}

export default function ComingSoonPanel({ icon: Icon, title, description, plannedFeatures }: Props) {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <Icon size={28} color="var(--accent-primary)" />
          {title}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>{description}</p>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", maxWidth: 640 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.75rem",
          borderRadius: "var(--radius-full)",
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          color: "var(--accent-warning)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: "1rem",
        }}>
          <Clock size={12} />
          Coming soon
        </div>

        <p style={{ fontSize: "0.9375rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
          The backend endpoint exists but is not implemented yet — it returns{" "}
          <code style={{
            fontFamily: "monospace",
            background: "var(--bg-surface)",
            padding: "0.125rem 0.375rem",
            borderRadius: "4px",
            fontSize: "0.8125rem",
          }}>501 Unimplemented</code>.
          The page will light up once the server lands the feature.
        </p>

        <div>
          <h3 style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}>
            Planned
          </h3>
          <ul style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}>
            {plannedFeatures.map((f) => (
              <li
                key={f}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--accent-primary)",
                  flexShrink: 0,
                }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
