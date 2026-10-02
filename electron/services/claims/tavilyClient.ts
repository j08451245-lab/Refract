/**
 * tavilyClient — production wiring for ClaimVerifierService.
 *
 * - createTavilySearch: direct `@tavily/core` client (NOT the premium
 *   TavilySearchProvider). `baseUrl` override exists so tests can point the SDK
 *   at a local stub HTTP server; production omits it (https://api.tavily.com).
 * - createJudge: binds the lightest existing "ask current model, return text"
 *   helper — LLMHelper.chat(prompt) with skipModeInjection=true so mode prompt
 *   injection can never corrupt the SUPPORTED/REFUTED/UNCERTAIN format.
 * - createLiveClaimVerifier: assembles the service with call-time key reads from
 *   CredentialsManager (a key added in Settings applies without restart).
 *
 * Secret handling: the API key travels only in constructor options and the SDK's
 * Authorization header. This module never logs, persists, or returns the key.
 */
import { tavily } from '@tavily/core';
import type { ClaimEvidence } from './ClaimVerifierService';
import { ClaimVerifierService } from './ClaimVerifierService';

export interface TavilySearchOptions {
  apiKey: string;
  baseUrl?: string;
  maxResults?: number;
  timeoutMs?: number;
}

export type SearchFn = (query: string, opts?: { signal?: AbortSignal }) => Promise<ClaimEvidence[]>;
export type JudgeFn = (prompt: string, opts?: { signal?: AbortSignal }) => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createTavilySearch(opts: TavilySearchOptions): SearchFn {
  const maxResults = opts.maxResults ?? 3;
  // The SDK's `timeout` option is in seconds (axios under the hood); the
  // service-level race in ClaimVerifierService owns the millisecond budget.
  const timeoutSeconds = Math.max(1, Math.ceil((opts.timeoutMs ?? 10_000) / 1000));
  return async (query: string): Promise<ClaimEvidence[]> => {
    const q = String(query ?? '').trim().slice(0, 500);
    if (!q || !opts.apiKey) return [];
    try {
      const client = tavily({
        apiKey: opts.apiKey,
        ...(opts.baseUrl ? { apiBaseURL: opts.baseUrl } : {}),
      });
      const res = await client.search(q, {
        maxResults,
        searchDepth: 'basic',
        includeAnswer: false,
        timeout: timeoutSeconds,
      });
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
    } catch {
      return []; // 401/quota/offline/timeout — caller degrades to UNCERTAIN
    }
  };
}

/** Judge = LLMHelper.chat. `chat` is injected (bound by the caller) to keep this module testable. */
export function createJudge(chat: (prompt: string) => Promise<string>): JudgeFn {
  return (prompt: string): Promise<string> => chat(prompt);
}

export function createLiveClaimVerifier(
  chat: (prompt: string) => Promise<string>,
  opts?: { maxResults?: number; timeoutMs?: number },
): ClaimVerifierService {
  const { CredentialsManager } = require('../CredentialsManager') as typeof import('../CredentialsManager');
  const getKey = (): string | undefined => {
    try {
      return CredentialsManager.getInstance().getTavilyApiKey();
    } catch {
      return undefined;
    }
  };
  const searchOpts = { maxResults: opts?.maxResults, timeoutMs: opts?.timeoutMs };
  return new ClaimVerifierService(
    {
      hasKey: (): boolean => {
        const k = getKey();
        return !!k && k.trim().length > 0;
      },
      tavilySearch: async (query: string): Promise<ClaimEvidence[]> => {
        const k = getKey();
        if (!k) return [];
        // Fresh client per call so a newly-saved key applies without restart.
        return createTavilySearch({ apiKey: k, ...searchOpts })(query);
      },
      judge: createJudge(chat),
    },
    { timeoutMs: opts?.timeoutMs },
  );
}
