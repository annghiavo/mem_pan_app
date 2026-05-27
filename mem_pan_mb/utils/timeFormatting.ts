// Helpers for the deck-level "next review" countdown.
//
// The backend sends an absolute timestamp (nextReviewDate, RFC3339) plus
// dueNow (how many cards are already due). We never trust a server-computed
// "seconds remaining" — the client owns the countdown so it stays accurate
// regardless of network latency. Display granularity is rounded by distance:
// minutes when close (learning cards), hours within a day, days beyond. The
// exact time-of-day of a review-card due date is arbitrary, so we don't show
// it past the hour scale.

export type ReviewTone = 'due' | 'soon' | 'none';

export interface NextReviewDisplay {
  label: string;
  tone: ReviewTone;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Build the countdown label for a deck's next review.
 * @param nextReviewISO RFC3339 timestamp of the soonest non-new card, or null/undefined.
 * @param dueNow        Count of cards already due now.
 * @param now           Current time in ms (pass Date.now(); a param for testability).
 */
export function formatNextReview(
  nextReviewISO: string | null | undefined,
  dueNow: number | undefined,
  now: number = Date.now(),
): NextReviewDisplay {
  const due = dueNow ?? 0;
  if (due > 0) {
    return { label: `${due} thẻ cần ôn ngay`, tone: 'due' };
  }

  if (!nextReviewISO) {
    return { label: 'Chưa có lịch ôn tập', tone: 'none' };
  }

  const target = Date.parse(nextReviewISO);
  if (Number.isNaN(target)) {
    return { label: 'Chưa có lịch ôn tập', tone: 'none' };
  }

  const diff = target - now;
  if (diff <= 0) {
    return { label: 'Cần ôn ngay', tone: 'due' };
  }

  if (diff < HOUR) {
    const minutes = Math.max(1, Math.floor(diff / MINUTE));
    return { label: `Ôn lại sau ${minutes} phút`, tone: 'soon' };
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return { label: `Ôn lại sau ${hours} giờ`, tone: 'soon' };
  }
  const days = Math.floor(diff / DAY);
  return { label: `Ôn lại sau ${days} ngày`, tone: 'soon' };
}

/**
 * How often the countdown label should refresh, in ms. Tick by the minute when
 * the next review is within an hour; otherwise hourly is plenty.
 */
export function nextReviewTickInterval(
  nextReviewISO: string | null | undefined,
  now: number = Date.now(),
): number {
  if (!nextReviewISO) return HOUR;
  const target = Date.parse(nextReviewISO);
  if (Number.isNaN(target)) return HOUR;
  const diff = target - now;
  return diff > 0 && diff < HOUR ? 30 * 1000 : HOUR;
}
