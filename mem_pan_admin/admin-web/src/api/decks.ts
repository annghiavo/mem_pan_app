import { adminApi } from "./client";

export type DeckStatus = "active" | "hidden" | "deleted";

export interface UpdateDeckStatusPayload {
  status: DeckStatus;
  reason?: string;
}

export const updateDeckStatus = (
  deckId: string,
  body: UpdateDeckStatusPayload,
) =>
  adminApi
    .patch(`/v1/admin/decks/${deckId}/status`, body)
    .then((r) => r.data);
