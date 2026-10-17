// electron/llm/groqModels.ts
//
// Groq model ladder + predicates. Reconstructed from the contracts already
// documented at the call sites (ipcHandlers.ts:359-372, :470-489, :13050-13097):
//  - isGroqModelId gates Groq-hosted ids (incl. vendor-prefixed
//    openai/gpt-oss-*) by the Groq key, ahead of the OpenAI catch-all.
//  - isRetiredModelId withholds auto-installed defaults Groq shut down
//    (llama-3.3-70b-versatile, scout family).
//  - GROQ_TEXT_MODEL_LADDER + isGroqModelGone drive the test-connection
//    walk: only a model-gone error advances; bad key / rate limit fail fast.
//
// MAINTENANCE: Groq retires preview models without notice. When a rung goes
// stale the walk self-heals (advances past model-gone), but refresh this
// ladder when Groq announces decommissions.
const LADDER: string[] = [
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

export const GROQ_TEXT_MODEL_LADDER: readonly string[] = LADDER;

const RETIRED: ReadonlySet<string> = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.3-70b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct:free',
  'llama2-70b-4096',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
  'llama3-8b-8192',
  'llama3-70b-8192',
]);

const GROQ_FAMILY_RE =
  /^(llama[-_]|llama3|mixtral|gemma[-_]|qwen|deepseek-r1-distill|meta-llama\/|moonshotai\/kimi|groq\/compound|openai\/gpt-oss|gpt-oss)/i;

function canonical(id: string): string {
  return id.trim().toLowerCase();
}

/** True for model ids hosted by Groq (checked before the OpenAI catch-all). */
export function isGroqModelId(id: string | undefined | null): boolean {
  if (!id) return false;
  const c = canonical(id);
  if (c.includes('gpt-oss')) return true;
  return GROQ_FAMILY_RE.test(c);
}

/** True for ids Groq shut down. Falsy ids are never retired. */
export function isRetiredModelId(id: string | undefined | null): boolean {
  if (!id) return false;
  return RETIRED.has(canonical(id));
}

function axiosStatus(e: unknown): number | null {
  if (typeof e !== 'object' || e === null) return null;
  const response = (e as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : null;
}

function errorText(e: unknown): string {
  try {
    if (typeof e !== 'object' || e === null) return String(e ?? '');
    const data: unknown = (e as { response?: { data?: unknown } }).response?.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const rec = data as Record<string, unknown>;
      const nested = rec.error;
      const msg =
        (typeof nested === 'object' && nested !== null
          ? (nested as Record<string, unknown>).message
          : nested) ??
        rec.message ??
        (e as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return '';
  } catch {
    return '';
  }
}

const GONE_RE = /model_not_found|decommission|does not exist|no longer (available|supported)|not found|model.?gone/i;

/**
 * True only when the model itself is gone (404, or an explicit
 * model-not-found payload). Auth/quota/server/network errors return false
 * so the walk fails fast with the real message.
 */
export function isGroqModelGone(e: unknown): boolean {
  const status = axiosStatus(e);
  if (status === 404) return true;
  if (status === 400 || status === 410) return GONE_RE.test(errorText(e));
  return false;
}
