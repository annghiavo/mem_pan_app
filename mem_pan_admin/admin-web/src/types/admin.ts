export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type ReportCategory = "inappropriate_content" | "copyright_violation" | "spam" | "harassment" | "misinformation" | "other";
export type Resolution = "banned" | "deleted" | "warned" | "no_action";

export interface Report {
  reportId: string;
  reporterId: string;
  targetType: "deck" | "user" | "note";
  targetId: string;
  reasonCategory: ReportCategory;
  description: string;
  status: ReportStatus;
  assignedTo?: string;
  adminNote?: string;
  resolution?: Resolution;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  createdAt: string;
}
