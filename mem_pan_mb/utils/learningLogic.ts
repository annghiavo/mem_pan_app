/**
 * Pure business logic for the learning flow.
 * Extracted from components so it can be unit-tested without React Native / Expo.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Card {
  cardId: string;
  contentFront: string;
  contentBack: string;
  langFront?: string;
  langBack?: string;
}

export interface MCQuestion {
  type: 'mc';
  card: Card;
  questionText: string;
  correctAnswer: string;
  options: string[];
}

export interface TFQuestion {
  type: 'tf';
  card: Card;
  questionText: string;
  displayedAnswer: string;
  correctAnswer: 'Đúng' | 'Sai';
}

export interface WrittenQuestion {
  type: 'w';
  card: Card;
  questionText: string;
  correctAnswer: string;
}

export type Question = MCQuestion | TFQuestion | WrittenQuestion;

export interface AnswerRecord {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  answers: AnswerRecord[];
}

// ─── Question generation ─────────────────────────────────────────────────────

/**
 * Picks which side of the card to show as the question / answer.
 */
export function getQuestionText(card: Card, answerSide: 'front' | 'back'): string {
  return answerSide === 'front' ? card.contentBack : card.contentFront;
}

export function getAnswerText(card: Card, answerSide: 'front' | 'back'): string {
  return answerSide === 'front' ? card.contentFront : card.contentBack;
}

/**
 * Distribute question types evenly via round-robin, then shuffle assignments.
 */
export function distributeQuestionTypes(
  count: number,
  enabledTypes: { multipleChoice: boolean; trueFalse: boolean; written: boolean },
  shuffleFn: (arr: string[]) => string[] = shuffleArray,
): string[] {
  const available: string[] = [];
  if (enabledTypes.multipleChoice) available.push('mc');
  if (enabledTypes.trueFalse) available.push('tf');
  if (enabledTypes.written) available.push('w');
  if (available.length === 0) available.push('mc'); // fallback

  const assignments: string[] = [];
  for (let i = 0; i < count; i++) {
    assignments.push(available[i % available.length]);
  }
  return shuffleFn(assignments);
}

/**
 * Build a multiple-choice question from a card.
 * `allCards` is the full deck so we can pick wrong answers.
 */
export function buildMCQuestion(
  card: Card,
  allCards: Card[],
  answerSide: 'front' | 'back',
  shuffleFn: <T>(arr: T[]) => T[] = shuffleArray,
): MCQuestion {
  const correctAnswer = getAnswerText(card, answerSide);
  const wrongCards = pickRandom(allCards, 3, c => c.cardId === card.cardId);
  const wrongAnswers = wrongCards.map(c => getAnswerText(c, answerSide));
  const options = shuffleFn([correctAnswer, ...wrongAnswers]);

  return {
    type: 'mc',
    card,
    questionText: getQuestionText(card, answerSide),
    correctAnswer,
    options,
  };
}

/**
 * Build a true/false question from a card.
 */
export function buildTFQuestion(
  card: Card,
  allCards: Card[],
  answerSide: 'front' | 'back',
  isTrue: boolean,
): TFQuestion {
  let displayedAnswer = getAnswerText(card, answerSide);
  if (!isTrue && allCards.length > 1) {
    const otherCards = allCards.filter(c => c.cardId !== card.cardId);
    displayedAnswer = getAnswerText(
      otherCards[Math.floor(Math.random() * otherCards.length)],
      answerSide,
    );
  }
  return {
    type: 'tf',
    card,
    questionText: getQuestionText(card, answerSide),
    displayedAnswer,
    correctAnswer: isTrue ? 'Đúng' : 'Sai',
  };
}

/**
 * Build a written (free-text) question from a card.
 */
export function buildWrittenQuestion(
  card: Card,
  answerSide: 'front' | 'back',
): WrittenQuestion {
  return {
    type: 'w',
    card,
    questionText: getQuestionText(card, answerSide),
    correctAnswer: getAnswerText(card, answerSide),
  };
}

/**
 * Build the full set of questions for a practice test.
 */
export function generateQuestions(
  cards: Card[],
  numQuestions: number,
  enabledTypes: { multipleChoice: boolean; trueFalse: boolean; written: boolean },
  answerSide: 'front' | 'back',
  shuffleFn: <T>(arr: T[]) => T[] = shuffleArray,
): Question[] {
  if (cards.length === 0) return [];

  const shuffledCards = shuffleFn([...cards]);
  const actualCount = Math.max(2, Math.min(numQuestions, cards.length));
  const selectedCards = shuffledCards.slice(0, actualCount);

  const typeAssignments = distributeQuestionTypes(actualCount, enabledTypes, shuffleFn as any);

  return selectedCards.map((card, idx) => {
    const qType = typeAssignments[idx];
    if (qType === 'mc') {
      return buildMCQuestion(card, cards, answerSide, shuffleFn);
    } else if (qType === 'tf') {
      const isTrue = Math.random() > 0.5;
      return buildTFQuestion(card, cards, answerSide, isTrue);
    } else {
      return buildWrittenQuestion(card, answerSide);
    }
  });
}

// ─── Answer checking ─────────────────────────────────────────────────────────

/**
 * Check whether a user's answer is correct for a question.
 * strictness='flexible'  → case-insensitive, strips punctuation, Levenshtein tolerance
 * strictness='strict'    → case-insensitive exact match, all other chars must match
 */
export function checkAnswer(
  question: Question,
  userAnswer: string,
  strictness: 'flexible' | 'strict' = 'flexible',
): boolean {
  const correct = question.correctAnswer;
  if (strictness === 'strict') {
    return correct.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }
  return checkFlexible(userAnswer, correct);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation (unicode-aware)
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinThreshold(n: number): number {
  if (n >= 9) return 2;
  if (n >= 5) return 1;
  return 0;
}

function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[lb];
}

export function checkWrittenAnswer(
  userAnswer: string,
  correctAnswer: string,
  strictness: 'flexible' | 'strict',
): boolean {
  if (strictness === 'strict') {
    return correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }
  return checkFlexible(userAnswer, correctAnswer);
}

function checkFlexible(userAnswer: string, correctAnswer: string): boolean {
  const na = normalize(userAnswer);
  const nb = normalize(correctAnswer);
  if (na === nb) return true;
  return levenshtein(na, nb) <= levenshteinThreshold(nb.length);
}

// ─── Result calculation ──────────────────────────────────────────────────────

/**
 * Given a list of answer records, compute the quiz result summary.
 */
export function calculateQuizResult(answers: AnswerRecord[]): QuizResult {
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const percentage = answers.length > 0
    ? Math.round((correctCount / answers.length) * 100)
    : 0;

  return { correctCount, incorrectCount, percentage, answers };
}

// ─── Quiz (spaced-repetition) rating ─────────────────────────────────────────

/**
 * Determine the SRS rating based on correctness and response time.
 * Mirrors the logic in quiz/[id].tsx handleSelect.
 *
 * 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export function calculateRating(isCorrect: boolean, durationMs: number): number {
  if (!isCorrect) return 1;
  if (durationMs < 3000) return 4;   // Easy
  if (durationMs < 8000) return 3;   // Good
  return 2;                           // Hard
}

// ─── Practice-setup validation ───────────────────────────────────────────────

/**
 * Returns true when at least one question type is still enabled after toggling
 * `target` off.
 */
export function canDisableType(
  target: 'trueFalse' | 'multipleChoice' | 'written',
  current: { trueFalse: boolean; multipleChoice: boolean; written: boolean },
): boolean {
  const copy = { ...current, [target]: false };
  return copy.trueFalse || copy.multipleChoice || copy.written;
}

/**
 * Clamp the number of questions between [2, totalCards].
 */
export function clampQuestionCount(requested: number, totalCards: number): number {
  return Math.max(2, Math.min(requested, totalCards));
}

// ─── Progress helpers ────────────────────────────────────────────────────────

/**
 * Compute the progress percentage shown on the homepage.
 */
export function computeProgressPercent(memorizedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((memorizedCount / totalCount) * 100);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Pick `count` random items from `arr`, skipping items where `excludeFn(item)`
 * returns true.  O(count) average time vs O(N log N) for shuffle-and-slice.
 * Falls back gracefully when fewer than `count` eligible items exist.
 */
export function pickRandom<T>(arr: T[], count: number, excludeFn: (item: T) => boolean): T[] {
  const result: T[] = [];
  if (arr.length === 0 || count <= 0) return result;
  const used = new Set<number>();
  let attempts = 0;
  const maxAttempts = count * 10; // safety net for small eligible pools
  while (result.length < count && attempts < maxAttempts && used.size < arr.length) {
    attempts++;
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx) && !excludeFn(arr[idx])) {
      used.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
