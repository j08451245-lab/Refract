// electron/intelligence/UsageLedger.ts
//
// Local token & cost analytics + monthly budget guard. Pure, fs-only, NO
// electron import (node-testable); every operation is guarded and degrades to
// a disabled ledger on any fs failure. Stores one JSONL record per LLM stream
// turn, plus a tiny budget.json for the monthly token budget. All token
// counts are ESTIMATES (chars/4 â€” no provider returns reliable usage on local
// providers); inputChars/4, outputChars/4 heuristic is documented in the
// report. Records contain no prompt or answer text â€” only counts, provider,
// model, task label, timing.

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface UsageRecord {
  ts: number;
  provider: string;
  model: string;
  task: string;
  inputChars: number;
  outputChars: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  truncated: boolean;
}

export interface UsageStatsBucket {
  count: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface UsageStats {
  windowMs: number;
  records: number;
  totals: UsageStatsBucket;
  byTask: Record<string, UsageStatsBucket>;
  byProvider: Record<string, UsageStatsBucket>;
  tokensPerDay: Record<string, UsageStatsBucket>;
}

export interface BudgetStatus {
  enabled: boolean;
  monthlyTokenBudget: number;
  usedTokensThisMonth: number;
  pctUsed: number;
  exceeded: boolean;
  warnAtPct: number;
  shouldWarn: boolean;
  monthKey: string;
}

export interface UsageLedgerOptions {
  /** Absolute directory for the JSONL store; resolved lazily when omitted. */
  dir?: string | null;
  /** Max JSONL bytes before rotation; 0 disables. */
  rotateBytes?: number;
}

const DEFAULT_ROTATE_BYTES = 25 * 1024 * 1024;
const TOKENS_PER_CHARS = 4;

export function makeEmptyStatsBucket(): UsageStatsBucket {
  return { count: 0, inputTokens: 0, outputTokens: 0, durationMs: 0 };
}

export function estimateTokens(chars: number): number {
  if (typeof chars !== 'number' || !Number.isFinite(chars) || chars <= 0) return 0;
  return Math.ceil(chars / TOKENS_PER_CHARS);
}

export function currentMonthKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Stable key for the CURRENT advisory state. Empty/unchanged means "don't notify":
 * - disabled budget â†’ null
 * - exceeded â†’ "<month>:exceeded"
 * - warn threshold crossed â†’ "<month>:warn:<pct>"
 * Consumers dedupe on this string (e.g. notify at most once per month/threshold
 * per run). Pure; safe with malformed input.
 */
export function budgetAdvisoryKey(status: Partial<BudgetStatus> | null | undefined): string | null {
  if (!status || status.enabled !== true) return null;
  const month = typeof status.monthKey === 'string' && status.monthKey ? status.monthKey : 'unknown';
  if (status.exceeded === true) return `${month}:exceeded`;
  if (status.shouldWarn === true) return `${month}:warn:${Number(status.warnAtPct) || 80}`;
  return null;
}

/**
 * Human-readable advisory for an ALREADY-COMPUTED status (pure). Callers that
 * also need the dedupe key can derive it from the same status and avoid a
 * second full ledger scan (budgetStatus reads the JSONL synchronously).
 */
export function budgetAdviceText(status: BudgetStatus | null | undefined, notifyWarn: boolean = true): string | null {
  if (!status || status.enabled !== true) return null;
  if (status.exceeded) return `Monthly AI token budget exceeded (${status.usedTokensThisMonth.toLocaleString()} / ${status.monthlyTokenBudget.toLocaleString()} tokens).`;
  if (notifyWarn && status.shouldWarn) return `AI token budget at ${status.pctUsed}% for this month.`;
  return null;
}

function emptyStats(windowMs: number): UsageStats {
  return {
    windowMs,
    records: 0,
    totals: makeEmptyStatsBucket(),
    byTask: {},
    byProvider: {},
    tokensPerDay: {},
  };
}

export class UsageLedger {
  private dir: string | null = null;
  private rotateBytes: number;
  private disabled = false;
  private budgetCache: { monthlyTokenBudget: number; warnAtPct: number } | null = null;
  private budgetCacheTs = 0;

  constructor(options: UsageLedgerOptions = {}) {
    this.rotateBytes = typeof options.rotateBytes === 'number' && options.rotateBytes >= 0 ? Math.min(options.rotateBytes, 1024 * 1024 * 1024) : DEFAULT_ROTATE_BYTES;
    try {
      this.dir = typeof options.dir === 'string' && options.dir.trim() ? options.dir : null;
    } catch {
      this.dir = null;
    }
  }

  /** Actual directory backing the store (resolved lazily); null when disabled. */
  public getDir(): string | null {
    if (this.disabled) return null;
    try {
      if (this.dir) {
        fs.mkdirSync(this.dir, { recursive: true });
        return this.dir;
      }
      const appMod = unvElectronApp();
      const base = appMod?.getPath?.('userData') || path.join(os.tmpdir(), 'refract-usage');
      this.dir = path.join(base, 'usage');
      fs.mkdirSync(this.dir, { recursive: true });
      return this.dir;
    } catch {
      return null;
    }
  }

  private recordsPath(): string | null {
    const dir = this.getDir();
    return dir ? path.join(dir, 'usage_ledger.jsonl') : null;
  }

  private budgetPath(): string | null {
    const dir = this.getDir();
    return dir ? path.join(dir, 'usage_budget.json') : null;
  }

  /** Record one completed LLM turn. Never throws; silently disabled on fs failure. */
  public recordUsage(input: Partial<UsageRecord>): UsageRecord | null {
    try {
      const recPath = this.recordsPath();
      if (!recPath) return null;
      const rec: UsageRecord = {
        ts: Number.isFinite(input.ts) ? Math.round(input.ts!) : Date.now(),
        provider: String(input.provider || 'unknown').slice(0, 64),
        model: String(input.model || 'unknown').slice(0, 128),
        task: String(input.task || 'chat-stream').slice(0, 64),
        inputChars: Math.max(0, Math.round(Number(input.inputChars) || 0)),
        outputChars: Math.max(0, Math.round(Number(input.outputChars) || 0)),
        inputTokens: Math.max(0, Math.round(Number(input.inputTokens) || 0)),
        outputTokens: Math.max(0, Math.round(Number(input.outputTokens) || 0)),
        durationMs: Math.max(0, Math.round(Number(input.durationMs) || 0)),
        truncated: input.truncated === true,
      };
      if (!rec.inputTokens) rec.inputTokens = estimateTokens(rec.inputChars);
      if (!rec.outputTokens) rec.outputTokens = estimateTokens(rec.outputChars);
      this.maybeRotate(recPath);
      fs.appendFileSync(recPath, `${JSON.stringify(rec)}\n`, 'utf8');
      return rec;
    } catch {
      return null;
    }
  }

  private maybeRotate(recPath: string): void {
    if (this.rotateBytes <= 0) return;
    try {
      const st = fs.statSync(recPath);
      if (st.size < this.rotateBytes) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(recPath, `${recPath}.${stamp}.bak`);
    } catch {
      /* missing file or rename race â€” safe to continue */
    }
  }

  /** Iterate JSONL lines with per-line error tolerance; still iterates in order. */
  private eachRecord(cb: (rec: UsageRecord) => void): void {
    const recPath = this.recordsPath();
    if (!recPath) return;
    let raw: string;
    try {
      raw = fs.readFileSync(recPath, 'utf8');
    } catch {
      return;
    }
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && typeof parsed.ts === 'number') {
          cb({
            ts: parsed.ts,
            provider: String(parsed.provider || 'unknown'),
            model: String(parsed.model || 'unknown'),
            task: String(parsed.task || 'chat-stream'),
            inputChars: Number(parsed.inputChars) || 0,
            outputChars: Number(parsed.outputChars) || 0,
            inputTokens: Number(parsed.inputTokens) || 0,
            outputTokens: Number(parsed.outputTokens) || 0,
            durationMs: Number(parsed.durationMs) || 0,
            truncated: parsed.truncated === true,
          });
        }
      } catch {
        /* malformed line â€” skip */
      }
    }
  }

  /** Aggregate usage over a trailing time window. windowMs 0 => all time. */
  public stats(windowMs: number = 7 * 24 * 60 * 60 * 1000): UsageStats {
    const stats = emptyStats(Math.max(0, Math.round(windowMs) || 0));
    try {
      const cutoff = stats.windowMs > 0 ? Date.now() - stats.windowMs : 0;
      this.eachRecord((rec) => {
        if (cutoff > 0 && rec.ts < cutoff) return;
        stats.records++;
        push(stats.totals, rec);
        if (!stats.byTask[rec.task]) stats.byTask[rec.task] = makeEmptyStatsBucket();
        push(stats.byTask[rec.task], rec);
        if (!stats.byProvider[rec.provider]) stats.byProvider[rec.provider] = makeEmptyStatsBucket();
        push(stats.byProvider[rec.provider], rec);
        const day = new Date(rec.ts).toISOString().slice(0, 10);
        if (!stats.tokensPerDay[day]) stats.tokensPerDay[day] = makeEmptyStatsBucket();
        push(stats.tokensPerDay[day], rec);
      });
    } catch {
      return stats;
    }
    return stats;
  }

  /** Convenience: trailing-30-days totals. */
  public stats30d(): UsageStats {
    return this.stats(30 * 24 * 60 * 60 * 1000);
  }

  /** Persist the monthly token budget (0 disables the guard). */
  public setBudget(monthlyTokenBudget: number, warnAtPct: number = 80): boolean {
    try {
      const bp = this.budgetPath();
      if (!bp) return false;
      const budget = Math.max(0, Math.round(Number(monthlyTokenBudget) || 0));
      const warn = Math.max(1, Math.min(99, Math.round(Number(warnAtPct) || 80)));
      fs.writeFileSync(bp, JSON.stringify({ monthlyTokenBudget: budget, warnAtPct: warn, savedAt: Date.now() }), 'utf8');
      this.budgetCache = { monthlyTokenBudget: budget, warnAtPct: warn };
      this.budgetCacheTs = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  private readBudget(): { monthlyTokenBudget: number; warnAtPct: number } {
    const now = Date.now();
    if (this.budgetCache && now - this.budgetCacheTs < 5_000) return this.budgetCache;
    try {
      const bp = this.budgetPath();
      if (!bp) return { monthlyTokenBudget: 0, warnAtPct: 80 };
      const raw = fs.readFileSync(bp, 'utf8');
      const parsed = JSON.parse(raw);
      this.budgetCache = {
        monthlyTokenBudget: Math.max(0, Math.round(Number(parsed?.monthlyTokenBudget) || 0)),
        warnAtPct: Math.max(1, Math.min(99, Math.round(Number(parsed?.warnAtPct) || 80))),
      };
      this.budgetCacheTs = now;
      return this.budgetCache;
    } catch {
      this.budgetCache = { monthlyTokenBudget: 0, warnAtPct: 80 };
      this.budgetCacheTs = now;
      return this.budgetCache;
    }
  }

  /** Month-to-date token usage vs the configured budget. */
  public budgetStatus(nowTs: number = Date.now()): BudgetStatus {
    const monthKey = currentMonthKey(nowTs);
    const out: BudgetStatus = {
      enabled: false,
      monthlyTokenBudget: 0,
      usedTokensThisMonth: 0,
      pctUsed: 0,
      exceeded: false,
      warnAtPct: 80,
      shouldWarn: false,
      monthKey,
    };
    try {
      const { monthlyTokenBudget, warnAtPct } = this.readBudget();
      out.monthlyTokenBudget = monthlyTokenBudget;
      out.warnAtPct = warnAtPct;
      if (!(monthlyTokenBudget > 0)) return out;
      out.enabled = true;
      this.eachRecord((rec) => {
        if (currentMonthKey(rec.ts) !== monthKey) return;
        out.usedTokensThisMonth += rec.inputTokens + rec.outputTokens;
      });
      out.pctUsed = Math.max(0, Math.min(9999, Math.round((out.usedTokensThisMonth / monthlyTokenBudget) * 100)));
      out.exceeded = out.usedTokensThisMonth >= monthlyTokenBudget;
      out.shouldWarn = out.pctUsed >= warnAtPct;
      return out;
    } catch {
      return out;
    }
  }

  /** Post-write check convenience: returns non-empty advisory string or null. */
  public guardAdvice(notifyWarn: boolean = true): string | null {
    try {
      return budgetAdviceText(this.budgetStatus(), notifyWarn);
    } catch {
      return null;
    }
  }
}

function push(bucket: UsageStatsBucket, rec: UsageRecord): void {
  bucket.count++;
  bucket.inputTokens += rec.inputTokens;
  bucket.outputTokens += rec.outputTokens;
  bucket.durationMs += rec.durationMs;
}

function unvElectronApp(): { getPath?: (s: string) => string } | null {
  try {
    // Lazy require so the module stays usable in plain node (tests, seed scripts).
    const electron = require('electron');
    const app = electron?.app || electron?.default?.app;
    return app && typeof app.getPath === 'function' ? app : null;
  } catch {
    return null;
  }
}

/** Shared main-process instance (userData/usage). Tests construct their own. */
let sharedLedger: UsageLedger | null = null;
export function getUsageLedger(): UsageLedger {
  if (!sharedLedger) sharedLedger = new UsageLedger();
  return sharedLedger;
}
