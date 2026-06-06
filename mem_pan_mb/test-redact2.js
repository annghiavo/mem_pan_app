const redact = (data, depth = 0) => {
  if (!data || typeof data !== 'object' || depth > 5) return data;
  if (Array.isArray(data)) {
    if (data.length > 5) {
      return [...data.slice(0, 5).map(item => redact(item, depth + 1)), `... (${data.length - 5} more items)`];
    }
    return data.map(item => redact(item, depth + 1));
  }
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = /password|token|secret|authorization/i.test(k) ? '***' : redact(v, depth + 1);
  }
  return out;
};

const mock = { cards: Array.from({length: 300}).map((_, i) => ({ id: i })) };
console.log(redact(mock));
