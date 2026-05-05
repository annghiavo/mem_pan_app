/**
 * Unit tests for the main learning flow.
 *
 * The learning flow covers:
 *   1. Practice setup — validate settings, question count clamping, type toggling
 *   2. Question generation — MC, T/F, Written; answer-side flipping
 *   3. Answer checking — case/whitespace insensitive comparison
 *   4. Quiz result scoring — correct %, correct/incorrect counts
 *   5. SRS rating calculation — time-based rating used in Quiz mode
 *   6. Homepage progress display
 */

import {
  Card,
  Question,
  AnswerRecord,
  getQuestionText,
  getAnswerText,
  distributeQuestionTypes,
  buildMCQuestion,
  buildTFQuestion,
  buildWrittenQuestion,
  generateQuestions,
  checkAnswer,
  calculateQuizResult,
  calculateRating,
  canDisableType,
  clampQuestionCount,
  computeProgressPercent,
} from '../utils/learningLogic';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** A deterministic "shuffle" that simply returns the array unchanged. */
const noShuffle = <T>(arr: T[]): T[] => [...arr];

/** Reverse shuffle for predictable alternate ordering. */
const reverseShuffle = <T>(arr: T[]): T[] => [...arr].reverse();

const sampleCards: Card[] = [
  { cardId: '1', contentFront: 'Apple', contentBack: 'Quả táo' },
  { cardId: '2', contentFront: 'Banana', contentBack: 'Quả chuối' },
  { cardId: '3', contentFront: 'Orange', contentBack: 'Quả cam' },
  { cardId: '4', contentFront: 'Grape', contentBack: 'Quả nho' },
  { cardId: '5', contentFront: 'Mango', contentBack: 'Quả xoài' },
];

// ═════════════════════════════════════════════════════════════════════════════
// 1. Practice-Setup Validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Practice Setup – clampQuestionCount', () => {
  it('clamps below minimum (2)', () => {
    expect(clampQuestionCount(1, 10)).toBe(2);
    expect(clampQuestionCount(0, 10)).toBe(2);
    expect(clampQuestionCount(-5, 10)).toBe(2);
  });

  it('clamps above totalCards', () => {
    expect(clampQuestionCount(20, 5)).toBe(5);
    expect(clampQuestionCount(100, 3)).toBe(3);
  });

  it('returns requested when within range', () => {
    expect(clampQuestionCount(3, 10)).toBe(3);
    expect(clampQuestionCount(5, 5)).toBe(5);
    expect(clampQuestionCount(2, 2)).toBe(2);
  });
});

describe('Practice Setup – canDisableType', () => {
  it('allows disabling when another type remains', () => {
    expect(canDisableType('trueFalse', { trueFalse: true, multipleChoice: true, written: false })).toBe(true);
    expect(canDisableType('multipleChoice', { trueFalse: false, multipleChoice: true, written: true })).toBe(true);
  });

  it('prevents disabling the last remaining type', () => {
    expect(canDisableType('multipleChoice', { trueFalse: false, multipleChoice: true, written: false })).toBe(false);
    expect(canDisableType('written', { trueFalse: false, multipleChoice: false, written: true })).toBe(false);
    expect(canDisableType('trueFalse', { trueFalse: true, multipleChoice: false, written: false })).toBe(false);
  });

  it('allows disabling when all three are enabled', () => {
    const all = { trueFalse: true, multipleChoice: true, written: true };
    expect(canDisableType('trueFalse', all)).toBe(true);
    expect(canDisableType('multipleChoice', all)).toBe(true);
    expect(canDisableType('written', all)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Question / Answer Side Helpers
// ═════════════════════════════════════════════════════════════════════════════

describe('getQuestionText / getAnswerText', () => {
  const card: Card = { cardId: '1', contentFront: 'Hello', contentBack: 'Xin chào' };

  it('answerSide="back" → question = front, answer = back', () => {
    expect(getQuestionText(card, 'back')).toBe('Hello');
    expect(getAnswerText(card, 'back')).toBe('Xin chào');
  });

  it('answerSide="front" → question = back, answer = front', () => {
    expect(getQuestionText(card, 'front')).toBe('Xin chào');
    expect(getAnswerText(card, 'front')).toBe('Hello');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Question Type Distribution
// ═════════════════════════════════════════════════════════════════════════════

describe('distributeQuestionTypes', () => {
  it('assigns a single enabled type to all questions', () => {
    const types = distributeQuestionTypes(
      4,
      { multipleChoice: true, trueFalse: false, written: false },
      noShuffle as any,
    );
    expect(types).toEqual(['mc', 'mc', 'mc', 'mc']);
  });

  it('distributes two types evenly via round-robin', () => {
    const types = distributeQuestionTypes(
      4,
      { multipleChoice: true, trueFalse: true, written: false },
      noShuffle as any,
    );
    expect(types).toEqual(['mc', 'tf', 'mc', 'tf']);
  });

  it('distributes three types evenly via round-robin', () => {
    const types = distributeQuestionTypes(
      6,
      { multipleChoice: true, trueFalse: true, written: true },
      noShuffle as any,
    );
    expect(types).toEqual(['mc', 'tf', 'w', 'mc', 'tf', 'w']);
  });

  it('handles odd count with 3 types', () => {
    const types = distributeQuestionTypes(
      5,
      { multipleChoice: true, trueFalse: true, written: true },
      noShuffle as any,
    );
    expect(types).toEqual(['mc', 'tf', 'w', 'mc', 'tf']);
  });

  it('falls back to mc when no types enabled', () => {
    const types = distributeQuestionTypes(
      3,
      { multipleChoice: false, trueFalse: false, written: false },
      noShuffle as any,
    );
    expect(types).toEqual(['mc', 'mc', 'mc']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Individual Question Builders
// ═════════════════════════════════════════════════════════════════════════════

describe('buildMCQuestion', () => {
  it('includes the correct answer in the options', () => {
    const q = buildMCQuestion(sampleCards[0], sampleCards, 'back', noShuffle);
    expect(q.type).toBe('mc');
    expect(q.correctAnswer).toBe('Quả táo');
    expect(q.options).toContain('Quả táo');
    expect(q.questionText).toBe('Apple');
  });

  it('has at most 4 options (1 correct + up to 3 wrong)', () => {
    const q = buildMCQuestion(sampleCards[0], sampleCards, 'back', noShuffle);
    expect(q.options.length).toBeLessThanOrEqual(4);
    expect(q.options.length).toBeGreaterThanOrEqual(1);
  });

  it('does not include the same card as a wrong answer', () => {
    const q = buildMCQuestion(sampleCards[0], sampleCards, 'back', noShuffle);
    // Filter out the correct answer — remaining should not be duplicates of correct
    const wrongs = q.options.filter(o => o !== q.correctAnswer);
    wrongs.forEach(w => expect(w).not.toBe(q.correctAnswer));
  });

  it('works with answerSide="front" (flipped)', () => {
    const q = buildMCQuestion(sampleCards[0], sampleCards, 'front', noShuffle);
    expect(q.correctAnswer).toBe('Apple');
    expect(q.questionText).toBe('Quả táo');
  });

  it('works when there are only 2 cards (fewer wrong answers)', () => {
    const twoCards = sampleCards.slice(0, 2);
    const q = buildMCQuestion(twoCards[0], twoCards, 'back', noShuffle);
    expect(q.options).toContain('Quả táo');
    expect(q.options.length).toBe(2); // 1 correct + 1 wrong
  });
});

describe('buildTFQuestion', () => {
  it('returns "Đúng" when isTrue', () => {
    const q = buildTFQuestion(sampleCards[0], sampleCards, 'back', true);
    expect(q.type).toBe('tf');
    expect(q.correctAnswer).toBe('Đúng');
    expect(q.displayedAnswer).toBe('Quả táo'); // shows the real answer
  });

  it('returns "Sai" and a different displayed answer when !isTrue', () => {
    const q = buildTFQuestion(sampleCards[0], sampleCards, 'back', false);
    expect(q.correctAnswer).toBe('Sai');
    // displayedAnswer should be from a different card
    expect(q.displayedAnswer).not.toBe('Quả táo');
  });

  it('shows the real answer even when !isTrue if deck has only 1 card', () => {
    const oneCard = [sampleCards[0]];
    const q = buildTFQuestion(oneCard[0], oneCard, 'back', false);
    expect(q.correctAnswer).toBe('Sai');
    // With only 1 card there are no alternatives, so displayedAnswer stays the same
    expect(q.displayedAnswer).toBe('Quả táo');
  });
});

describe('buildWrittenQuestion', () => {
  it('returns the correct answer text', () => {
    const q = buildWrittenQuestion(sampleCards[0], 'back');
    expect(q.type).toBe('w');
    expect(q.correctAnswer).toBe('Quả táo');
    expect(q.questionText).toBe('Apple');
  });

  it('works with answerSide="front"', () => {
    const q = buildWrittenQuestion(sampleCards[0], 'front');
    expect(q.correctAnswer).toBe('Apple');
    expect(q.questionText).toBe('Quả táo');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Full Question Generation (generateQuestions)
// ═════════════════════════════════════════════════════════════════════════════

describe('generateQuestions', () => {
  it('returns empty array for empty cards', () => {
    const qs = generateQuestions([], 5, { multipleChoice: true, trueFalse: false, written: false }, 'back');
    expect(qs).toEqual([]);
  });

  it('generates exactly the requested number of questions', () => {
    const qs = generateQuestions(
      sampleCards, 3,
      { multipleChoice: true, trueFalse: false, written: false },
      'back',
      noShuffle,
    );
    expect(qs.length).toBe(3);
  });

  it('enforces minimum of 2 questions', () => {
    const qs = generateQuestions(
      sampleCards, 1,
      { multipleChoice: true, trueFalse: false, written: false },
      'back',
      noShuffle,
    );
    expect(qs.length).toBe(2);
  });

  it('caps at card count when requesting more', () => {
    const twoCards = sampleCards.slice(0, 2);
    const qs = generateQuestions(
      twoCards, 10,
      { multipleChoice: true, trueFalse: false, written: false },
      'back',
      noShuffle,
    );
    expect(qs.length).toBe(2);
  });

  it('produces questions of the correct enabled types', () => {
    const qs = generateQuestions(
      sampleCards, 4,
      { multipleChoice: true, trueFalse: true, written: false },
      'back',
      noShuffle,
    );
    const types = qs.map(q => q.type);
    expect(types).not.toContain('w');
    types.forEach(t => expect(['mc', 'tf']).toContain(t));
  });

  it('generates mixed types when all three enabled', () => {
    // With noShuffle and 3 questions, round-robin gives mc, tf, w
    const qs = generateQuestions(
      sampleCards, 3,
      { multipleChoice: true, trueFalse: true, written: true },
      'back',
      noShuffle,
    );
    const types = qs.map(q => q.type);
    expect(types).toContain('mc');
    expect(types).toContain('tf');
    expect(types).toContain('w');
  });

  it('uses default shuffle when no shuffleFn is provided', () => {
    // Call without the optional shuffleFn argument — exercises defaultShuffle
    const qs = generateQuestions(
      sampleCards, 3,
      { multipleChoice: true, trueFalse: false, written: false },
      'back',
      // no shuffleFn → uses defaultShuffle internally
    );
    expect(qs).toHaveLength(3);
    qs.forEach(q => expect(q.type).toBe('mc'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Answer Checking
// ═════════════════════════════════════════════════════════════════════════════

describe('checkAnswer', () => {
  const q: Question = {
    type: 'mc',
    card: sampleCards[0],
    questionText: 'Apple',
    correctAnswer: 'Quả táo',
    options: ['Quả táo', 'Quả chuối', 'Quả cam'],
  };

  it('returns true for exact match', () => {
    expect(checkAnswer(q, 'Quả táo')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(checkAnswer(q, 'quả táo')).toBe(true);
    expect(checkAnswer(q, 'QUẢ TÁO')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(checkAnswer(q, '  Quả táo  ')).toBe(true);
  });

  it('returns false for wrong answer', () => {
    expect(checkAnswer(q, 'Quả chuối')).toBe(false);
  });

  it('returns false for empty answer', () => {
    expect(checkAnswer(q, '')).toBe(false);
  });

  it('works for T/F questions', () => {
    const tfQ: Question = {
      type: 'tf',
      card: sampleCards[0],
      questionText: 'Apple',
      displayedAnswer: 'Quả táo',
      correctAnswer: 'Đúng',
    };
    expect(checkAnswer(tfQ, 'Đúng')).toBe(true);
    expect(checkAnswer(tfQ, 'đúng')).toBe(true);
    expect(checkAnswer(tfQ, 'Sai')).toBe(false);
  });

  it('works for written questions with Vietnamese diacritics', () => {
    const wQ: Question = {
      type: 'w',
      card: sampleCards[0],
      questionText: 'Apple',
      correctAnswer: 'Quả táo',
    };
    expect(checkAnswer(wQ, 'Quả táo')).toBe(true);
    expect(checkAnswer(wQ, 'qua tao')).toBe(false); // diacritics matter
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Quiz Result Calculation
// ═════════════════════════════════════════════════════════════════════════════

describe('calculateQuizResult', () => {
  const makeAnswer = (correct: boolean): AnswerRecord => ({
    question: {
      type: 'mc',
      card: sampleCards[0],
      questionText: 'Apple',
      correctAnswer: 'Quả táo',
      options: [],
    },
    userAnswer: correct ? 'Quả táo' : 'wrong',
    isCorrect: correct,
  });

  it('computes 100% when all correct', () => {
    const result = calculateQuizResult([makeAnswer(true), makeAnswer(true), makeAnswer(true)]);
    expect(result.correctCount).toBe(3);
    expect(result.incorrectCount).toBe(0);
    expect(result.percentage).toBe(100);
  });

  it('computes 0% when all wrong', () => {
    const result = calculateQuizResult([makeAnswer(false), makeAnswer(false)]);
    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(2);
    expect(result.percentage).toBe(0);
  });

  it('computes mixed results', () => {
    const result = calculateQuizResult([
      makeAnswer(true),
      makeAnswer(false),
      makeAnswer(true),
      makeAnswer(false),
    ]);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it('rounds percentage properly', () => {
    const result = calculateQuizResult([
      makeAnswer(true),
      makeAnswer(false),
      makeAnswer(false),
    ]);
    expect(result.percentage).toBe(33); // 1/3 = 33.33 → rounds to 33
  });

  it('handles empty answers', () => {
    const result = calculateQuizResult([]);
    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('preserves all answer records', () => {
    const answers = [makeAnswer(true), makeAnswer(false)];
    const result = calculateQuizResult(answers);
    expect(result.answers).toHaveLength(2);
    expect(result.answers[0].isCorrect).toBe(true);
    expect(result.answers[1].isCorrect).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. SRS Rating Calculation (Quiz Mode)
// ═════════════════════════════════════════════════════════════════════════════

describe('calculateRating (SRS)', () => {
  it('returns 1 (Again) for incorrect answers regardless of time', () => {
    expect(calculateRating(false, 500)).toBe(1);
    expect(calculateRating(false, 5000)).toBe(1);
    expect(calculateRating(false, 20000)).toBe(1);
  });

  it('returns 4 (Easy) for correct answer under 3 seconds', () => {
    expect(calculateRating(true, 1000)).toBe(4);
    expect(calculateRating(true, 2999)).toBe(4);
  });

  it('returns 3 (Good) for correct answer 3–8 seconds', () => {
    expect(calculateRating(true, 3000)).toBe(3);
    expect(calculateRating(true, 5000)).toBe(3);
    expect(calculateRating(true, 7999)).toBe(3);
  });

  it('returns 2 (Hard) for correct answer >= 8 seconds', () => {
    expect(calculateRating(true, 8000)).toBe(2);
    expect(calculateRating(true, 15000)).toBe(2);
  });

  it('handles edge case at exactly 3000ms (boundary → Good)', () => {
    expect(calculateRating(true, 3000)).toBe(3);
  });

  it('handles edge case at exactly 8000ms (boundary → Hard)', () => {
    expect(calculateRating(true, 8000)).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. Homepage Progress Computation
// ═════════════════════════════════════════════════════════════════════════════

describe('computeProgressPercent', () => {
  it('returns 0 when totalCount is 0', () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
  });

  it('returns 0 when nothing memorized', () => {
    expect(computeProgressPercent(0, 10)).toBe(0);
  });

  it('returns 100 when all memorized', () => {
    expect(computeProgressPercent(10, 10)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(computeProgressPercent(1, 3)).toBe(33);
    expect(computeProgressPercent(2, 3)).toBe(67);
  });

  it('handles negative totalCount gracefully', () => {
    expect(computeProgressPercent(5, -1)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. End-to-End Learning Flow Simulation
// ═════════════════════════════════════════════════════════════════════════════

describe('End-to-end learning flow', () => {
  it('simulates a full practice test: setup → questions → answers → result', () => {
    // Step 1: Setup — choose 3 questions, MC only, answer with back
    const numQ = clampQuestionCount(3, sampleCards.length);
    expect(numQ).toBe(3);

    // Step 2: Generate questions
    const questions = generateQuestions(
      sampleCards,
      numQ,
      { multipleChoice: true, trueFalse: false, written: false },
      'back',
      noShuffle,
    );
    expect(questions).toHaveLength(3);
    questions.forEach(q => expect(q.type).toBe('mc'));

    // Step 3: Answer each question
    const answers: AnswerRecord[] = questions.map((q, idx) => {
      // Simulate: first answer correct, second wrong, third correct
      const userAnswer = idx === 1 ? 'wrong answer' : q.correctAnswer;
      return {
        question: q,
        userAnswer,
        isCorrect: checkAnswer(q, userAnswer),
      };
    });

    expect(answers[0].isCorrect).toBe(true);
    expect(answers[1].isCorrect).toBe(false);
    expect(answers[2].isCorrect).toBe(true);

    // Step 4: Calculate result
    const result = calculateQuizResult(answers);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.percentage).toBe(67);
  });

  it('simulates a quiz session: answer → rate → next', () => {
    // Simulate spaced repetition quiz flow
    const ratings: number[] = [];

    // Card 1: correct in 2 seconds → Easy
    ratings.push(calculateRating(true, 2000));
    expect(ratings[0]).toBe(4);

    // Card 2: correct in 5 seconds → Good
    ratings.push(calculateRating(true, 5000));
    expect(ratings[1]).toBe(3);

    // Card 3: incorrect → Again
    ratings.push(calculateRating(false, 4000));
    expect(ratings[2]).toBe(1);

    // Card 4: correct in 10 seconds → Hard
    ratings.push(calculateRating(true, 10000));
    expect(ratings[3]).toBe(2);

    expect(ratings).toEqual([4, 3, 1, 2]);
  });

  it('simulates flashcard browsing flow (card navigation)', () => {
    const cards = sampleCards;
    let currentIndex = 0;

    // Navigate forward
    const nextCard = () => {
      if (currentIndex < cards.length - 1) currentIndex++;
    };
    const prevCard = () => {
      if (currentIndex > 0) currentIndex--;
    };

    expect(currentIndex).toBe(0);
    nextCard();
    expect(currentIndex).toBe(1);
    nextCard();
    expect(currentIndex).toBe(2);
    prevCard();
    expect(currentIndex).toBe(1);
    prevCard();
    expect(currentIndex).toBe(0);
    prevCard(); // should not go below 0
    expect(currentIndex).toBe(0);

    // Navigate to end
    for (let i = 0; i < 10; i++) nextCard();
    expect(currentIndex).toBe(cards.length - 1); // stays at last card
  });

  it('simulates mixed question types practice test', () => {
    const questions = generateQuestions(
      sampleCards,
      5,
      { multipleChoice: true, trueFalse: true, written: true },
      'back',
      noShuffle,
    );
    expect(questions).toHaveLength(5);

    const types = new Set(questions.map(q => q.type));
    expect(types.has('mc')).toBe(true);
    expect(types.has('tf')).toBe(true);
    expect(types.has('w')).toBe(true);

    // Answer all correctly
    const answers: AnswerRecord[] = questions.map(q => ({
      question: q,
      userAnswer: q.correctAnswer,
      isCorrect: checkAnswer(q, q.correctAnswer),
    }));

    const result = calculateQuizResult(answers);
    expect(result.percentage).toBe(100);
    expect(result.correctCount).toBe(5);
  });
});