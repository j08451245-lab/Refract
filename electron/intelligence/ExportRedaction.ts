// electron/intelligence/ExportRedaction.ts
//
// Export redaction shield. Pure, no-LLM, no-IO, never throws. Before meeting
// notes / transcripts / usage digests leave the machine (clipboard, future
// file exports), this strips the categories of data that should never ride
// along: personal identifiers (emails, phones, CPF numbers, card numbers) and
// live credentials (API keys, PATs, JWTs, OAuth tokens).
//
// Design notes:
// - Everything is deterministic regex passes with tight guards against false
//   positives (digit-count gates, checksum validators — CPF mod-11 and Luhn
//   for card numbers).
// - `analyze` returns COUNTS ONLY — no matched text, no spans (spans can leak
//   content through inference; counts cannot).
// - Replacement is by category token ([email removed]) so the redacted blob
//   stays readable.
// - Oversized inputs are handled by a hard cap: work on the first REDACT_MAX
//   chars, pass the (unlikely) tail through untouched, and still count it as
//   unanalyzed rather than silently pretending it was scanned with fake
//   confidence.

export type RedactionPolicy = 'personal-data' | 'secrets' | 'all';

export interface RedactionFinding {
  kind: string;
  count: number;
}

export interface RedactionResult {
  text: string;
  findings: RedactionFinding[];
  totalFindings: number;
}

export interface RedactionOptions {
  policy?: RedactionPolicy;
}

export const REDACT_MAX_INPUT_CHARS = 2 * 1024 * 1024;

const REPLACEMENTS: Record<string, string> = {
  'api-key': '[API key removed]',
  'oauth-token': '[token removed]',
  jwt: '[token removed]',
  'github-pat': '[API key removed]',
  email: '[email removed]',
  phone: '[phone removed]',
  cpf: '[document number removed]',
  cnpj: '[document number removed]',
  'card-number': '[card number removed]',
};

interface Detector {
  kind: string;
  policy: 'personal-data' | 'secrets';
  re: RegExp;
  guard?: (match: string) => boolean;
  replace?: (match: string) => string;
}

// Order matters: high-context credential shapes first, then generic personal
// identifiers (emails/phones are the loosest).
const DETECTORS: Detector[] = [
  // OpenAI-style keys (sk- hk- etc.), ≥20 chars tail
  { kind: 'api-key', policy: 'secrets', re: /\b(?:sk|hk|kx|bx)-[A-Za-z0-9_-]{20,}\b/g },
  // GitHub PATs (classic + gho/ghr/something + fine-grained)
  { kind: 'github-pat', policy: 'secrets', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  // Slack tokens (xoxb-, xoxp-...)
  { kind: 'api-key', policy: 'secrets', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  // AWS access key id
  { kind: 'api-key', policy: 'secrets', re: /\bAKIA[0-9A-Z]{16}\b/g },
  // Google API key
  { kind: 'api-key', policy: 'secrets', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  // GitLab PAT
  { kind: 'api-key', policy: 'secrets', re: /\bglpat-[A-Za-z0-9_-]{15,}\b/g },
  // JWT (three base64url segments)
  { kind: 'jwt', policy: 'secrets', re: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g },
  // Bearer / token headers — strip the credential part, keep the header word
  { kind: 'oauth-token', policy: 'secrets', re: /\b(Bearer:?\s+)[A-Za-z0-9._~+/=-]{16,}\b/g, guard: (m) => m.replace(/^Bearer:?\s+/i, '').length >= 16, replace: (m) => m.replace(/^(Bearer:?\s+)[\s\S]*$/i, '$1[token removed]') },
  // Email
  { kind: 'email', policy: 'personal-data', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/g },
  // CPF with or without mask, VALIDATED (mod-11)
  { kind: 'cpf', policy: 'personal-data', re: /\b(?:\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}|\d{11})\b/g, guard: (m) => isValidCpf(m.replace(/[^\d]/g, '')) },
  // CNPJ with or without mask (12.345.678/0001-90), VALIDATED (mod-11)
  { kind: 'cnpj', policy: 'personal-data', re: /\b(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14})\b/g, guard: (m) => isValidCnpj(m.replace(/[^\d]/g, '')) },
  // Card numbers 13–19 digits (grouped with space/dash or bare), VALIDATED (Luhn)
  { kind: 'card-number', policy: 'personal-data', re: /\b(?:\d[ -]?){12,18}\d\b/g, guard: (m) => luhnValid(m.replace(/[^\d]/g, '')) },
  // International/Brazilian phone — ≥9 digits in the match, ≤15 (dots excluded:
  // they're a CPF/mixed-separator shape, not a phone separator here)
  { kind: 'phone', policy: 'personal-data', re: /\+?\(?\d[\d ()\-]{7,}\d\)?/g, guard: (m) => {
      const digits = (m.match(/\d/g) || []).length;
      return digits >= 9 && digits <= 15;
    } },
];

const policyIncludes = (policy: RedactionPolicy, detectorPolicy: Detector['policy']): boolean =>
  policy === 'all' || policy === detectorPolicy;

export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let dv = (sum * 10) % 11;
  if (dv === 10) dv = 0;
  if (dv !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  dv = (sum * 10) % 11;
  if (dv === 10) dv = 0;
  return dv === Number(digits[10]);
}

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const dvAt = (len: number): number => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return dvAt(12) === Number(digits[12]) && dvAt(13) === Number(digits[13]);
}

export class ExportRedactionShield {
  /**
   * Redact a blob of exported text in-place by category. Never throws; an
   * invalid policy falls back to 'all'. Seeded counts stay deterministic.
   */
  redact(input: string, options: RedactionOptions = {}): RedactionResult {
    const policy: RedactionPolicy = options?.policy === 'personal-data' || options?.policy === 'secrets' || options?.policy === 'all'
      ? options.policy
      : 'all';
    const text = typeof input === 'string' ? input : '';
    if (!text) return { text, findings: [], totalFindings: 0 };

    const counts = new Map<string, number>();
    try {
      const oversized = text.length > REDACT_MAX_INPUT_CHARS;
      const head = oversized ? text.slice(0, REDACT_MAX_INPUT_CHARS) : text;
      const tail = oversized ? text.slice(REDACT_MAX_INPUT_CHARS) : '';

      let redacted = head;
      for (const det of DETECTORS) {
        if (!policyIncludes(policy, det.policy)) continue;
        redacted = redacted.replace(det.re, (match) => {
          try {
            if (det.guard && !det.guard(match)) return match;
            counts.set(det.kind, (counts.get(det.kind) || 0) + 1);
            return det.replace ? det.replace(match) : (REPLACEMENTS[det.kind] || '[removed]');
          } catch {
            return match;
          }
        });
      }
      return { text: redacted + tail, findings: summarize(counts), totalFindings: [...counts.values()].reduce((a, b) => a + b, 0) };
    } catch {
      // Never leak original text on an internal failure: return a plain
      // marker-only report of failure.
      return { text, findings: [], totalFindings: 0 };
    }
  }

  /** Counts only (no matched text leaves the process). Same detectors as redact. */
  analyze(input: string, options: RedactionOptions = {}): RedactionFinding[] {
    try {
      return this.redact(input, options).findings;
    } catch {
      return [];
    }
  }
}

function summarize(counts: Map<string, number>): RedactionFinding[] {
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => (b.count - a.count) || (a.kind < b.kind ? -1 : 1));
}

/** Shared instance (stateless anyway). */
let shared: ExportRedactionShield | null = null;
export function getRedactionShield(): ExportRedactionShield {
  if (!shared) shared = new ExportRedactionShield();
  return shared;
}
