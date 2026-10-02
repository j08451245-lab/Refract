const NUM_RE = /(?<![\p{L}\p{N}_])\d+(?:[.,]\d+)?\s*(?:ms|s|%|x|mil|milh|bilh|k|m|gb|mb|usd|r\$|dólares|dollar|million|billion|percent|anos?|years?)(?![\p{L}\p{N}_])/iu;
const DATE_RE = /(?<![\p{L}\p{N}_])(?:(?:19|20)\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|january|february|march|april|may|june|july|august|september|october|november|december))(?![\p{L}\p{N}_])/iu;
const ENTITY_RE = /(?<![\p{L}\p{N}_])[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+(?![\p{L}\p{N}_])/u;
const ABS_RE = /(?<![\p{L}\p{N}_])(?:sempre|nunca|jamais|todo(?:s)?|toda(?:s)?|nenhum(?:a)?|único|única|only|never|always|every|none)(?![\p{L}\p{N}_])/iu;
const SUP_RE = /(?<![\p{L}\p{N}_])(?:maior|menor|melhor|pior|primeiro|último|único|biggest|smallest|best|worst|first|last|only)(?![\p{L}\p{N}_])/iu;

export function scoreClaim(text) {
  const t = String(text ?? '');
  if (t.trim().length < 12) return { score: 0, spans: [], kind: null };
  const hits = [];
  const grab = (re, kind, w) => {
    const m = t.match(re);
    if (m && m[0]) hits.push({ text: m[0], kind, w });
  };
  grab(NUM_RE, 'number', 0.7);
  grab(DATE_RE, 'date', 0.35);
  grab(ENTITY_RE, 'entity', 0.35);
  grab(ABS_RE, 'absolute', 0.7);
  grab(SUP_RE, 'superlative', 0.4);
  if (!hits.length) return { score: 0, spans: [], kind: null };
  const score = Math.min(1, hits.reduce((a, h) => a + h.w, 0));
  const top = hits.sort((a, b) => b.w - a.w)[0];
  return { score: Math.round(score * 100) / 100, spans: hits.map(({ text, kind }) => ({ text, kind })), kind: top.kind };
}
