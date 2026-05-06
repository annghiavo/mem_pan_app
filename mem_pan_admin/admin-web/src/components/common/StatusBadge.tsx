interface StatusBadgeProps {
  status: string;
}

const COLORS: Record<string, { bg: string, text: string }> = {
  pending:   { bg: "rgba(245, 158, 11, 0.15)", text: "hsl(40, 90%, 55%)" },
  reviewing: { bg: "rgba(59, 130, 246, 0.15)", text: "hsl(217, 90%, 65%)" },
  resolved:  { bg: "rgba(16, 185, 129, 0.15)", text: "hsl(150, 60%, 45%)" },
  dismissed: { bg: "rgba(107, 114, 128, 0.15)", text: "hsl(220, 10%, 60%)" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorObj = COLORS[status.toLowerCase()] ?? { bg: "rgba(255,255,255,0.1)", text: "#ccc" };
  
  return (
    <span style={{
      backgroundColor: colorObj.bg,
      color: colorObj.text,
      padding: "0.25rem 0.75rem",
      borderRadius: "var(--radius-full)",
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "capitalize",
      letterSpacing: "0.025em"
    }}>
      {status}
    </span>
  );
}
