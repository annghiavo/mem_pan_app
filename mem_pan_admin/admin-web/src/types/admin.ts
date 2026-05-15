export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type ReportCategory =
  | "inappropriate_content"
  | "copyright_violation"
  | "spam"
  | "harassment"
  | "misinformation"
  | "other";
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

export interface PromoteModeratorResponse {
  userId: string;
  email: string;
  username: string;
}

export interface EmailTemplate {
  id: string;
  templateKey: string;
  locale: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  isActive: boolean;
  version: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewEmailTemplatePayload {
  locale?: string;
  data?: Record<string, string>;
}

export interface PreviewEmailTemplateResponse {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface SendTestEmailPayload {
  locale?: string;
  to: string;
  data?: Record<string, string>;
}

export interface SendTestEmailResponse {
  message: string;
}
