// Shape of the GetDeckProgress response (grpc-gateway serializes proto fields
// as camelCase JSON). nextReviewDate is an RFC3339 string (e.g.
// "2026-05-30T14:32:00Z") and is absent when the deck has no scheduled cards.
export interface DeckProgress {
  deckId?: string;
  newCount: number;
  learnCount: number;
  memorizedCount: number;
  totalCount?: number;
  tags?: { label: string; count: number; cardIds: string[] }[];
  nextReviewDate?: string;
  dueNow?: number;
}
