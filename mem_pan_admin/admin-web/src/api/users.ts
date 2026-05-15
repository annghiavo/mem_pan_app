import { adminApi } from "./client";
import type { User } from "../types/admin";

export interface ListUsersParams {
  pageSize?: number;
  pageToken?: string;
  filterBanned?: boolean;
}

export interface ListUsersResponse {
  users: User[];
  nextPageToken: string;
}

export const listUsers = (params: ListUsersParams) =>
  adminApi
    .get<ListUsersResponse>("/v1/admin/users", { params })
    .then((r) => r.data);

export interface BanUserPayload {
  ban: boolean;
  reason?: string;
}

export const banUser = (userId: string, body: BanUserPayload) =>
  adminApi
    .patch<{ user: User }>(`/v1/admin/users/${userId}/ban`, body)
    .then((r) => r.data.user);
