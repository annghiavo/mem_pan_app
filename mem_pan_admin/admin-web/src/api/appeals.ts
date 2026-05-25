import axios from "axios";
import { adminApi } from "./client";

export type AppealStatus = "pending" | "submitted" | "approved" | "rejected";

export interface Appeal {
  appealId: string;
  deckId: string;
  userId: string;
  deckName: string;
  moderationReason: string;
  status: AppealStatus;
  userMessage: string;
  submittedAt: string;
  decidedBy: string;
  decisionNote: string;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAppealsParams {
  pageSize?: number;
  pageToken?: string;
  statusFilter?: AppealStatus | "";
}

export interface ListAppealsResponse {
  appeals: Appeal[];
  nextPageToken: string;
  total?: string;
}

export const listAppeals = (params: ListAppealsParams) =>
  adminApi
    .get<ListAppealsResponse>("/v1/admin/appeals", { params })
    .then((r) => r.data);

export type AppealDecision = "approve" | "reject";

export interface DecideAppealPayload {
  decision: AppealDecision;
  note?: string;
}

export const decideAppeal = (appealId: string, body: DecideAppealPayload) =>
  adminApi
    .patch<Appeal>(`/v1/admin/appeals/${appealId}`, body)
    .then((r) => r.data);

// ----- Public (no-auth) appeal-by-token endpoints -----
// The deck owner opens these via the link in their deletion email.

// Build a separate axios instance so the auth-redirect interceptor on adminApi
// doesn't bounce unauthenticated visitors back to /login.
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? "";
const publicApi = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const getAppealByToken = (token: string) =>
  publicApi
    .get<Appeal>(`/v1/admin/appeals/by-token/${encodeURIComponent(token)}`)
    .then((r) => r.data);

export const submitAppealByToken = (token: string, message: string) =>
  publicApi
    .post<Appeal>(
      `/v1/admin/appeals/by-token/${encodeURIComponent(token)}:submit`,
      { message },
    )
    .then((r) => r.data);
