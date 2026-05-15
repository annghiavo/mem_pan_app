import { Users } from "lucide-react";
import ComingSoonPanel from "../components/common/ComingSoonPanel";

export default function UsersPage() {
  return (
    <ComingSoonPanel
      icon={Users}
      title="Users"
      description="Browse, search, and moderate user accounts."
      plannedFeatures={[
        "List all users with pagination and a ban-status filter",
        "Ban or unban an account with a reason",
        "Inspect a user's report history",
      ]}
    />
  );
}
