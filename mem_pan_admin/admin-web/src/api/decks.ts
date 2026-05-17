import { adminApi } from "./client";

export type DeckStatus = "active" | "hidden" | "deleted";

export interface Deck {
  id: string;
  title: string;
  ownerId: string;
  status: DeckStatus;
  cardCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListDecksParams {
  pageSize?: number;
  pageToken?: string;
  statusFilter?: DeckStatus;
}

export interface ListDecksResponse {
  decks: Deck[];
  nextPageToken: string;
}

export interface UpdateDeckStatusPayload {
  status: DeckStatus;
  reason?: string;
}

export interface UpdateDeckStatusResponse {
  deckId: string;
  status: DeckStatus;
}

export const listDecks = (params: ListDecksParams) =>
  adminApi
    .get<ListDecksResponse>("/v1/admin/decks", { params })
    .then((r) => r.data);

export const updateDeckStatus = (
  deckId: string,
  body: UpdateDeckStatusPayload,
) =>
  adminApi
    .patch<UpdateDeckStatusResponse>(`/v1/admin/decks/${deckId}/status`, body)
    .then((r) => r.data);
