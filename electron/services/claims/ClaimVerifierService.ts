/**
 * ClaimVerifierService — renders a Verdict for one Claim via Tavily evidence + LLM judge.
 *
 * Pure injectable-deps shape so tests never hit the network: the caller supplies
 * `tavilySearch` (top-3 web evidence), `judge` (ask the current model, return text)
 * and `hasKey` (Tavily key present?). Production wiring lives in ./tavilyClient.ts.
 *
 * Honesty rules: search errors (401/quota/offline) degrade to evidence-free judging,
 * never throw; judge errors degrade to 'doubtful'. Only a hard timeout throws
 * (ClaimVerifierError), so the Task-3 mic hook can try/catch without breaking
 * transcription. Without a key the verdict is judge-only: sourced:false, url:null,
 * confidence capped at 0.6.
 */

export interface Claim {
  text: string;
  score: number;
  kind: string;
}

export interface Verdict {
  claim: string;
  verdict: 'confirmed' | 'doubtful' | 'refuted';
  summary: string;
  url: string | null;
  confidence: number;
  sourced: boolean;
}

export interface ClaimEvidence {
  title: string;
  url: string;
  content: string;
}

export interface VerifierDeps {
  tavilySearch: (query: string, opts?: { signal?: AbortSignal }) => Promise<ClaimEvidence[]>;
  judge: (prompt: string, opts?: { signal?: AbortSignal }) => Promise<string>;
  hasKey: () => boolean;
}

export class ClaimVerifierError extends Error {
  public readonly code: 'timeout';
  constructor(code: 'timeout', message: string) {
    super(message);
    this.name = 'ClaimVerifierError';
    this.code = code;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const NO_KEY_CONFIDENCE_CAP = 0.6;
const MAX_SUMMARY_CHARS = 160;

export function buildSourcedPrompt(claimText: string, evidence: ClaimEvidence[]): string {
  const lines = evidence.slice(0, 3).map((e, i) => `[${i + 1}] ${e.title} (${e.url}): ${e.content}`.slice(0, 800));
  return [
    'You are a fact-check judge. Claim: "' + claimText + '"',
    'Evidence:',
    ...(lines.length > 0 ? lines : ['(no web evidence retrieved)']),
    'Reply in EXACTLY this format:',
    'Verdict: SUPPORTED|REFUTED|UNCERTAIN',
    'Summary: <one short sentence>',
    'URL: <the single most relevant evidence url above, or NONE>',
    'Confidence: <0..1>',
  ].join('\n');
}

export function buildKnowledgePrompt(claimText: string): string {
  return [
    'You are a fact-check judge. No web evidence is available — answer from your own knowledge.',
    'If unsure, reply UNCERTAIN. Claim: "' + claimText + '"',
    'Reply in EXACTLY this format:',
    'Verdict: SUPPORTED|REFUTED|UNCERTAIN',
    'Summary: <one short sentence>',
    'URL: NONE',
    'Confidence: <0..1>',
  ].join('\n');
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function clampConfidence(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function parseJudgeOutput(raw: string, evidence: ClaimEvidence[]): { verdict: Verdict['verdict']; summary: string; url: string | null; confidence: number } {
  const text = (raw ?? '').trim();
  const token = text.match(/\b(SUPPORTED|REFUTED|UNCERTAIN)\b/i)?.[1]?.toUpperCase();
  const verdict: Verdict['verdict'] = token === 'SUPPORTED' ? 'confirmed' : token === 'REFUTED' ? 'refuted' : 'doubtful';
  if (!token && text.length === 0) {
    return { verdict: 'doubtful', summary: 'Judge returned no usable verdict.', url: evidence[0]?.url ?? null, confidence: 0.3 };
  }
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const summaryLine = lines.find((l) => /^summary\s*:/i.test(l));
  let summary = summaryLine !== undefined ? summaryLine.replace(/^summary\s*:/i, '').trim() : '';
  if (!summary) {
    summary = lines.find((l) => !/^(verdict|url|confidence)\s*:/i.test(l) && !/\b(SUPPORTED|REFUTED|UNCERTAIN)\b/i.test(l)) ?? '';
  }
  summary = summary.replace(/^["“”']+|["“”']+$/g, '').trim().slice(0, MAX_SUMMARY_CHARS);
  if (!summary) summary = 'No summary provided.';
  const urlLine = lines.find((l) => /^url\s*:/i.test(l));
  const candidate = (urlLine !== undefined ? urlLine.replace(/^url\s*:/i, '').trim() : text.match(/https?:\/\/\S+/i)?.[0] ?? '').replace(/[),."']+$/, '');
  const url = candidate.toUpperCase() !== 'NONE' && isHttpUrl(candidate) &&
    (evidence.length === 0 || evidence.some((e) => e.url === candidate))
    ? candidate
    : (evidence[0]?.url ?? null);
  const confMatch = text.match(/confidence\s*:\s*(0?\.\d+|1(?:\.0+)?|0|1)\b/i)?.[1];
  const confidence = clampConfidence(confMatch !== undefined ? Number(confMatch) : NaN, verdict === 'doubtful' ? 0.4 : 0.7);
  return { verdict, summary, url, confidence };
}

export class ClaimVerifierService {
  private readonly defaultTimeoutMs: number;

  constructor(private readonly deps: VerifierDeps, opts?: { timeoutMs?: number }) {
    this.defaultTimeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async verify(claim: Claim, opts?: { timeoutMs?: number }): Promise<Verdict> {
    const ms = opts?.timeoutMs ?? this.defaultTimeoutMs;
    const text = String(claim?.text ?? '').trim().slice(0, 500);
    if (!text) {
      return { claim: '', verdict: 'doubtful', summary: 'Empty claim.', url: null, confidence: 0, sourced: false };
    }
    if (this.deps.hasKey()) {
      const evidence = await this.withTimeout('tavily-search', ms, (signal) =>
        this.deps.tavilySearch(text, { signal }).catch((): ClaimEvidence[] => []),
      );
      const raw = await this.withTimeout('factcheck-judge', ms, (signal) =>
        this.deps.judge(buildSourcedPrompt(text, evidence), { signal }).catch((): string => ''),
      );
      return this.toVerdict(text, raw, evidence, true);
    }
    const raw = await this.withTimeout('factcheck-judge', ms, (signal) =>
      this.deps.judge(buildKnowledgePrompt(text), { signal }).catch((): string => ''),
    );
    return this.toVerdict(text, raw, [], false);
  }

  private toVerdict(text: string, raw: string, evidence: ClaimEvidence[], keyPresent: boolean): Verdict {
    const parsed = parseJudgeOutput(raw, evidence);
    const sourced = keyPresent && evidence.length > 0;
    return {
      claim: text,
      verdict: parsed.verdict,
      summary: parsed.summary,
      url: sourced ? parsed.url : null,
      confidence: sourced ? parsed.confidence : Math.min(parsed.confidence, NO_KEY_CONFIDENCE_CAP),
      sourced,
    };
  }

  private async withTimeout<T>(label: string, ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            try { controller.abort(); } catch { /* best-effort */ }
            reject(new ClaimVerifierError('timeout', `${label} timed out after ${ms}ms`));
          }, ms);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (!controller.signal.aborted) {
        try { controller.abort(); } catch { /* best-effort */ }
      }
    }
  }
}
