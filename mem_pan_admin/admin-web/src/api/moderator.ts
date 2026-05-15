import { adminApi } from "./client";
import type { PromoteModeratorResponse } from "../types/admin";

export const promoteModerator = (email: string) =>
  adminApi
    .post<PromoteModeratorResponse>("/v1/admin/users/promote-moderator", { email })
    .then((r) => r.data);
