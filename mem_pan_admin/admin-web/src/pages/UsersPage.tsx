import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../api/users";
import UserTable from "../components/users/UserTable";
import BanUserModal from "../components/users/BanUserModal";
import type { User } from "../types/admin";
import { AlertCircle, Users as UsersIcon } from "lucide-react";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "banned", label: "Banned" },
] as const;

type FilterKey = (typeof STATUS_FILTERS)[number]["key"];

export default function UsersPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pageToken, setPageToken] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const filterBanned = filter === "all" ? undefined : filter === "banned";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", filter, pageToken],
    queryFn: () => listUsers({ pageSize: 20, pageToken, filterBanned }),
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <UsersIcon size={28} color="var(--accent-primary)" />
            Users
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Browse, search, and moderate user accounts.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPageToken("");
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-full)",
              background: filter === f.key ? "var(--accent-primary)" : "var(--bg-surface)",
              color: filter === f.key ? "white" : "var(--text-main)",
              fontWeight: filter === f.key ? 600 : 500,
              fontSize: "0.875rem",
              border: "1px solid",
              borderColor: filter === f.key ? "var(--accent-primary)" : "var(--border-color)",
              transition: "all var(--transition-fast)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.background = "var(--bg-surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.background = "var(--bg-surface)";
              }
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--accent-danger)",
            background: "rgba(220,38,38,0.1)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          <AlertCircle size={20} />
          <p>Failed to load users. The endpoint may not be implemented yet, or you are not authorized.</p>
        </div>
      ) : isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          <UserTable users={data?.users ?? []} onAction={setSelected} />

          {data?.nextPageToken && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
              <button className="btn btn-secondary" onClick={() => setPageToken(data.nextPageToken)}>
                Load Next Page
              </button>
            </div>
          )}
        </>
      )}

      {selected && <BanUserModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
