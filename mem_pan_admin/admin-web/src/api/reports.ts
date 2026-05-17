import { adminApi } from "./client";
import type { Report, ReportAction } from "../types/admin";

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
  adminApi
    .get<ListReportsResponse>("/v1/admin/reports", { params })
    .then((r) => r.data);

export interface ProcessReportPayload {
  action: ReportAction;
  adminNote?: string;
}

export interface ProcessReportResponse {
  report: Report;
  affectedReports: number;
  notifiedReporters: number;
}

export const processReport = (reportId: string, body: ProcessReportPayload) =>
  adminApi
    .patch<ProcessReportResponse>(`/v1/admin/reports/${reportId}`, body)
    .then((r) => r.data);
