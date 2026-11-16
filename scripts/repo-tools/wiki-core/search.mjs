/** Deterministic lexical ranker. No stemming, no network. Tokenizer wiki-lexer-v1. */

export const LEXER_VERSION = 'wiki-lexer-v1';
const STOP = new Set(
  'a an the of to and or in on for is are be do does did if it this that with by not from as at was were what when who how which may must can should'.split(
    ' ',
  ),
);

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP.has(token));
}

function bm25(queryTokens, documents, k1 = 1.2, b = 0.75) {
  const lengths = documents.map((doc) => doc.tokens.length);
  const avg = lengths.reduce((sum, length) => sum + length, 0) / (lengths.length || 1);
  const docFreq = new Map();
  for (const doc of documents) {
    const seen = new Set(doc.tokens);
    for (const token of seen) docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
  }
  const n = documents.length;
  return documents.map((doc, index) => {
    const tf = new Map();
    for (const token of doc.tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    let score = 0;
    for (const token of queryTokens) {
      const freq = tf.get(token) ?? 0;
      if (!freq) continue;
      const df = docFreq.get(token) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      const denom = freq + k1 * (1 - b + b * (lengths[index] / (avg || 1)));
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return score;
  });
}

/**
 * @param {{ id: string, title: string, headings: string, body: string, kind: string }[]} pages
 * @param {string} question
 */
export function rankPages(pages, question) {
  const query = tokenize(question);
  const bags = pages.map((page) => ({
    id: page.id,
    kind: page.kind,
    tokens: [
      ...tokenize(page.title).flatMap((token) => Array(4).fill(token)),
      ...tokenize(page.headings).flatMap((token) => Array(3).fill(token)),
      ...tokenize(page.body),
    ],
  }));
  const scores = bm25(query, bags);
  return pages
    .map((page, index) => ({
      path: page.id,
      kind: page.kind,
      score: Number(scores[index].toFixed(6)),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}
