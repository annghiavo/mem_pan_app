import { useMemo } from "react";

interface Props {
  variables: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export default function VariablesInput({ variables, values, onChange }: Props) {
  const keys = useMemo(() => variables ?? [], [variables]);

  if (keys.length === 0) {
    return (
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontStyle: "italic" }}>
        This template has no variables.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {keys.map((key) => (
        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontFamily: "monospace",
            letterSpacing: "0.025em",
          }}>
            {`{{.${key}}}`}
          </label>
          <input
            type="text"
            value={values[key] ?? ""}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
            placeholder={`Sample value for ${key}`}
            style={{ width: "100%", fontSize: "0.875rem" }}
          />
        </div>
      ))}
    </div>
  );
}
