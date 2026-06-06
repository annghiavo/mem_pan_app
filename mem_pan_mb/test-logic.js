const cards = [];
for(let i=0; i<300; i++) cards.push({cardId: String(i), contentFront: 'Front ' + i, contentBack: 'Back ' + i});
const start = Date.now();
const actualCount = 300;
const typeAssignments = [];
for (let i = 0; i < actualCount; i++) {
  typeAssignments.push(['mc', 'tf', 'w'][i % 3]);
}
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
const shuffledAssignments = shuffleArray(typeAssignments);

function pickRandom(arr, count, excludeFn) {
  const result = [];
  if (arr.length === 0 || count <= 0) return result;
  const used = new Set();
  let attempts = 0;
  const maxAttempts = count * 10;
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

const getAnswer = c => c.contentBack;
const getQuestion = c => c.contentFront;

const generated = cards.map((card, idx) => {
  const qType = shuffledAssignments[idx];

  if (qType === 'mc') {
    const wrongCards = pickRandom(cards, 3, (c) => c.cardId === card.cardId);
    const wrongAnswers = wrongCards.map((c) => getAnswer(c));
    const correctAnswer = getAnswer(card);
    const options = shuffleArray([correctAnswer, ...wrongAnswers]);
    return { type: 'mc', card, questionText: getQuestion(card), correctAnswer, options };
  } else if (qType === 'tf') {
    const isTrue = Math.random() > 0.5;
    let displayedAnswer = getAnswer(card);
    if (!isTrue && cards.length > 1) {
      const otherCards = cards.filter((c) => c.cardId !== card.cardId);
      displayedAnswer = getAnswer(otherCards[Math.floor(Math.random() * otherCards.length)]);
    }
    return { type: 'tf', card, questionText: getQuestion(card), displayedAnswer, correctAnswer: isTrue ? 'Đúng' : 'Sai' };
  } else {
    return { type: 'w', card, questionText: getQuestion(card), correctAnswer: getAnswer(card) };
  }
});

console.log('Time to generate 300 questions:', Date.now() - start, 'ms');
