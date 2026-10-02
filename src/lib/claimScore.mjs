const NUM_RE = /\b\d+(?:[.,]\d+)?\s*(?:ms|s|%|x|mil|milh|bilh|k|m|gb|mb|usd|r\$|dólares|dollar|million|billion|percent|anos?|years?)\b/i;
const DATE_RE = /\b(19|20)\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\b/i;
const ENTITY_RE = /\b[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+\b/;
const ABS_RE = /\b(sempre|nunca|jamais|todo(?:s)?|toda(?:s)?|nenhum(?:a)?|único|única|only|never|always|every|none)\b/i;
const SUP_RE = /\b(maior|menor|melhor|pior|primeiro|último|único|biggest|smallest|best|worst|first|last|only)\b/i;

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
