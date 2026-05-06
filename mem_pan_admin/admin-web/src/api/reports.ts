import { apiClient } from "./client";
import type { Report } from "../types/admin";

export interface ListReportsParams {
  pageSize?: number;
  pageToken?: string;
  statusFilter?: string;
}

export interface ListReportsResponse {
  reports: Report[];
  nextPageToken: string;
}

export const listReports = (params: ListReportsParams) =>
  apiClient
    .get<ListReportsResponse>("/v1/admin/reports", { params })
    .then((r) => r.data);

export interface ProcessReportPayload {
  action: "resolve" | "dismiss" | "review";
  resolution?: "banned" | "deleted" | "warned" | "no_action";
  adminNote?: string;
}

export const processReport = (reportId: string, body: ProcessReportPayload) =>
  apiClient
    .patch<{ report: Report }>(`/v1/admin/reports/${reportId}`, body)
    .then((r) => r.data.report);
