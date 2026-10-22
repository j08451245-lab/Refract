// UsageLedger â€” pin contract for the local token analytics + budget guard.
// Pure fs module (no electron import); every test runs against an isolated
// temp dir and the ledger must NEVER throw even with a corrupt store.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  UsageLedger,
  estimateTokens,
  currentMonthKey,
  makeEmptyStatsBucket,
} from '../../../dist-electron/electron/intelligence/UsageLedger.js';

function tmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `usage-ledger-${label}-`));
}

const REC = (over = {}) => ({
  provider: 'gemini', model: 'gemini-2.5', task: 'chat-stream',
  inputChars: 4000, outputChars: 800, durationMs: 1200, ...over,
});

describe('UsageLedger â€” record + estimate + shape', () => {
  test('estimateTokens is chars/4 rounded up; garbage-safe', () => {
    assert.equal(estimateTokens(0), 0);
    assert.equal(estimateTokens(-5), 0);
    assert.equal(estimateTokens(Number.NaN), 0);
    assert.equal(estimateTokens(1), 1);
    assert.equal(estimateTokens(401), 101);
  });

  test('recordUsage writes a JSONL line; tokens derived from chars when omitted', () => {
    const dir = tmpDir('store');
    const led = new UsageLedger({ dir });
    const rec = led.recordUsage(REC());
    assert.ok(rec);
    assert.equal(rec.inputTokens, 1000);
    assert.equal(rec.outputTokens, 200);
    assert.equal(rec.task, 'chat-stream');
    const lines = fs.readFileSync(path.join(dir, 'usage_ledger.jsonl'), 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).provider, 'gemini');
  });

  test('recordUsage clamps negative/NaN values and truncates giant fields', () => {
    const dir = tmpDir('clamp');
    const led = new UsageLedger({ dir });
    const rec = led.recordUsage({ provider: 'x'.repeat(300), task: 'y'.repeat(300), inputChars: -9, outputChars: Number.NaN, durationMs: -1, truncated: 'yes' });
    assert.ok(rec);
    assert.ok(rec.provider.length <= 64);
    assert.ok(rec.task.length <= 64);
    assert.equal(rec.inputChars, 0);
    assert.equal(rec.outputChars, 0);
    assert.equal(rec.durationMs, 0);
    assert.equal(rec.truncated, false);
  });
});

describe('UsageLedger â€” stats aggregation', () => {
  test('stats windows filter by ts; byTask/byProvider/tokensPerDay buckets add up', () => {
    const dir = tmpDir('stats');
    const led = new UsageLedger({ dir });
    const now = Date.now();
    led.recordUsage({ ...REC(), ts: now - 36 * 60 * 60 * 1000, task: 'assist', inputChars: 4000, outputChars: 4000 });
    led.recordUsage({ ...REC(), ts: now - 2 * 60 * 60 * 1000, task: 'assist', inputChars: 4000, outputChars: 4000 });
    led.recordUsage({ ...REC(), ts: now, provider: 'ollama', task: 'summary' });

    const inWindow = led.stats(24 * 60 * 60 * 1000);
    assert.equal(inWindow.records, 2);
    assert.equal(inWindow.totals.count, 2);
    assert.equal(inWindow.totals.inputTokens, 2000);
    assert.equal(inWindow.byTask.assist.count, 1);
    assert.equal(inWindow.byProvider.ollama.count, 1);

    const all = led.stats(0);
    assert.equal(all.records, 3);
    assert.equal(Object.keys(all.byTask).length, 2);
  });

  test('corrupt + blank lines are skipped, not fatal', () => {
    const dir = tmpDir('corrupt');
    const led = new UsageLedger({ dir });
    led.recordUsage(REC({ ts: Date.now() }));
    const p = path.join(dir, 'usage_ledger.jsonl');
    fs.appendFileSync(p, 'not json at all\n', 'utf8');
    fs.appendFileSync(p, '\n', 'utf8');
    fs.appendFileSync(p, JSON.stringify({ noTimestamp: true }) + '\n', 'utf8');
    led.recordUsage(REC({ ts: Date.now() }));
    const st = led.stats(0);
    assert.equal(st.records, 2);
  });

  test('empty ledger â†’ honest empty stats (no NaN), emptyInsightsBucket shape pinned', () => {
    const dir = tmpDir('empty');
    const led = new UsageLedger({ dir });
    const st = led.stats(0);
    assert.deepEqual(st.totals, makeEmptyStatsBucket());
    assert.deepEqual(st.byTask, {});
  });
});

describe('UsageLedger â€” budget guard', () => {
  test('setBudget persists; status aggregates month-to-date only', () => {
    const dir = tmpDir('budget');
    const led = new UsageLedger({ dir });
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime();
    led.recordUsage({ ...REC(), ts: prevMonth, inputChars: 10000, outputChars: 0 });
    led.recordUsage({ ...REC(), ts: now, inputChars: 40000, outputChars: 0 });
    assert.ok(led.setBudget(50000, 80));
    const st = led.budgetStatus(now);
    assert.ok(st.enabled);
    assert.ok(!st.exceeded);
    assert.ok(st.usedTokensThisMonth <= 12000);
    assert.ok(st.pctUsed > 0 && st.pctUsed < 30);
  });

  test('exceeded + warn thresholds are honest', () => {
    const dir = tmpDir('exceeded');
    const led = new UsageLedger({ dir });
    led.setBudget(1000, 80);
    const now = Date.now();
    led.recordUsage({ ...REC(), ts: now, inputChars: 12000, outputChars: 0 });
    const st = led.budgetStatus(now);
    assert.ok(st.exceeded);
    assert.ok(st.shouldWarn);
    const advice = led.guardAdvice();
    assert.ok(advice && advice.includes('exceeded'));
  });

  test('budget disabled (0) â†’ disabled status, guardAdvice null', () => {
    const dir = tmpDir('noBudget');
    const led = new UsageLedger({ dir });
    led.recordUsage(REC({ ts: Date.now() }));
    const st = led.budgetStatus();
    assert.equal(st.enabled, false);
    assert.equal(st.usedTokensThisMonth, 0);
    assert.equal(led.guardAdvice(), null);
  });

  test('budget.json corrupt â†’ guard degrades to disabled, never throws', () => {
    const dir = tmpDir('corruptBudget');
    const led = new UsageLedger({ dir });
    fs.writeFileSync(path.join(dir, 'usage_budget.json'), '{{{ nope', 'utf8');
    const st = led.budgetStatus();
    assert.equal(st.enabled, false);
    assert.doesNotThrow(() => led.guardAdvice());
  });
});

describe('UsageLedger â€” resilience + rotation + helpers', () => {
  test('ledger with NO dir (unresolvable) degrades silently; usage calls return null/stats zero', () => {
    const led = new UsageLedger({ dir: 'N:' }); // reserved drive on Windows â€” unresolvable
    assert.doesNotThrow(() => led.recordUsage(REC()));
    const st = led.stats(0);
    assert.deepEqual(st.totals, makeEmptyStatsBucket());
  });

  test('small rotateBytes rotates the file on write (2nd record carries the roll)', () => {
    const dir = tmpDir('rotate');
    const led = new UsageLedger({ dir, rotateBytes: 64 });
    assert.ok(led.recordUsage(REC()));
    assert.ok(led.recordUsage(REC()));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.bak'));
    assert.equal(files.length, 1);
  });

  test('currentMonthKey format pinned (YYYY-MM)', () => {
    const key = currentMonthKey(new Date(2026, 3, 7).getTime());
    assert.equal(key, '2026-04');
    assert.equal(currentMonthKey(new Date('not-a-date').getTime()), 'NaN-NaN');
  });
});
