/**
 * tavilyClient — production wiring for ClaimVerifierService.
 *
 * - createTavilySearch: direct `@tavily/core` client (NOT the premium
 *   TavilySearchProvider). `baseUrl` override exists so tests can point the SDK
 *   at a local stub HTTP server; production omits it (https://api.tavily.com).
 * - createJudge: binds the lightest existing "ask current model, return text"
 *   helper — LLMHelper.chat(prompt, undefined, undefined, undefined, true)
 *   (see electron/LLMHelper.ts:6472 chat(message, imagePaths?, context?,
 *   systemPromptOverride?, skipModeInjection=false)) so mode prompt injection
 *   is skipped and can never corrupt the SUPPORTED/REFUTED/UNCERTAIN format.
 * - createLiveClaimVerifier: assembles the service with call-time key reads from
 *   CredentialsManager (a key added in Settings applies without restart).
 *
 * Secret handling: the API key travels only in constructor options and the SDK's
 * Authorization header. This module never logs, persists, or returns the key.
 *
 * Timeout budget: the SDK `timeout` (seconds) is kept STRICTLY below the
 * service-level timeout owned by ClaimVerifierService.withTimeout, so the
 * service race always bounds total time. Abort signals are forwarded
 * (abort listener → AbortError) for prompt cancellation. Sub-second service
 * budgets cannot be represented with the 1s-minimum SDK granularity — abort
 * forwarding still bounds total time in that case.
 */
import { tavily } from '@tavily/core';
import type { ClaimEvidence } from './ClaimVerifierService';
import { ClaimVerifierService } from './ClaimVerifierService';
import { CredentialsManager } from '../CredentialsManager';

export { CredentialsManager };

export interface TavilySearchOptions {
  apiKey: string;
  baseUrl?: string;
  maxResults?: number;
  timeoutMs?: number;
}

export type SearchFn = (query: string, opts?: { signal?: AbortSignal }) => Promise<ClaimEvidence[]>;
export type JudgeFn = (prompt: string, opts?: { signal?: AbortSignal }) => Promise<string>;

/** LLMHelper.chat shape (electron/LLMHelper.ts:6472). */
export type ChatFn = (
  prompt: string,
  imagePaths?: string[],
  context?: string,
  systemPromptOverride?: string,
  skipModeInjection?: boolean,
) => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function abortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

export function createTavilySearch(opts: TavilySearchOptions): SearchFn {
  const maxResults = opts.maxResults ?? 3;
  // The SDK's `timeout` option is in seconds (axios under the hood); the
  // service-level race in ClaimVerifierService owns the millisecond budget.
  // Keep SDK STRICTLY below the service timeout so the service race always
  // bounds total time (1s SDK floor; sub-second budgets rely on abort).
  const timeoutSeconds = Math.max(1, Math.ceil((opts.timeoutMs ?? 10_000) / 1000) - 1);
  return async (query: string, callOpts?: { signal?: AbortSignal }): Promise<ClaimEvidence[]> => {
    const signal = callOpts?.signal;
    if (signal?.aborted) throw abortError();
    const q = String(query ?? '').trim().slice(0, 500);
    if (!q || !opts.apiKey) return [];
    let onAbort: (() => void) | undefined;
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
          onAbort = (): void => reject(abortError());
          signal.addEventListener('abort', onAbort, { once: true });
        })
      : null;
    try {
      const client = tavily({
        apiKey: opts.apiKey,
        ...(opts.baseUrl ? { apiBaseURL: opts.baseUrl } : {}),
      });
      const searchPromise = client.search(q, {
        maxResults,
        searchDepth: 'basic',
        includeAnswer: false,
        timeout: timeoutSeconds,
      });
      const res: unknown = abortPromise
        ? await Promise.race([searchPromise, abortPromise])
        : await searchPromise;
      const results: unknown = isRecord(res) ? res['results'] : undefined;
      if (!Array.isArray(results)) return [];
      return results.slice(0, maxResults).map((r: unknown): ClaimEvidence | null => {
        if (!isRecord(r)) return null;
        const url = String(r['url'] ?? '');
        if (!/^https?:\/\//i.test(url)) return null;
        return {
          title: String(r['title'] ?? '').slice(0, 300),
          url,
          content: String(r['content'] ?? '').slice(0, 2000),
        };
      }).filter((e: ClaimEvidence | null): e is ClaimEvidence => e !== null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      return []; // 401/quota/offline/timeout — caller degrades to UNCERTAIN
    } finally {
      if (signal && onAbort) {
        try { signal.removeEventListener('abort', onAbort); } catch { /* best-effort */ }
      }
    }
  };
}

/** Judge = LLMHelper.chat bound with skipModeInjection=true. `chat` is injected to keep this module testable. */
export function createJudge(chat: ChatFn): JudgeFn {
  return async (prompt: string, callOpts?: { signal?: AbortSignal }): Promise<string> => {
    const signal = callOpts?.signal;
    if (signal?.aborted) throw abortError();
    const chatPromise = chat(prompt, undefined, undefined, undefined, true);
    if (!signal) return chatPromise;
    let onAbort: (() => void) | undefined;
    const abortPromise = new Promise<never>((_, reject) => {
      onAbort = (): void => reject(abortError());
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      return await Promise.race([chatPromise, abortPromise]);
    } finally {
      if (onAbort) {
        try { signal.removeEventListener('abort', onAbort); } catch { /* best-effort */ }
      }
    }
  };
}

export function createLiveClaimVerifier(
  chat: ChatFn,
  opts?: { maxResults?: number; timeoutMs?: number; baseUrl?: string },
): ClaimVerifierService {
  const getKey = (): string | undefined => {
    try {
      return CredentialsManager.getInstance().getTavilyApiKey();
    } catch {
      return undefined;
    }
  };
  const searchOpts = { maxResults: opts?.maxResults, timeoutMs: opts?.timeoutMs, baseUrl: opts?.baseUrl };
  return new ClaimVerifierService(
    {
      hasKey: (): boolean => {
        const k = getKey();
        return !!k && k.trim().length > 0;
      },
      tavilySearch: async (query: string, callOpts?: { signal?: AbortSignal }): Promise<ClaimEvidence[]> => {
        const k = getKey();
        if (!k) return [];
        // Fresh client per call so a newly-saved key applies without restart.
        // Forward abort so the service-level timeout cancels promptly; the SDK
        // timeout (strictly below the service timeout) still bounds total time.
        return createTavilySearch({ apiKey: k, ...searchOpts })(query, callOpts);
      },
      judge: createJudge(chat),
    },
    { timeoutMs: opts?.timeoutMs },
  );
}
