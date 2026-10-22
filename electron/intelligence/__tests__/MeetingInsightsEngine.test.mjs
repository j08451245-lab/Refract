// MeetingInsightsEngine — pin contract for the deterministic analytics layer
// (summaryData.meetingInsights, schemaVersion 1). Runs headless against the
// compiled dist-electron output; imports MUST keep pointing at
// dist-electron/electron/intelligence/MeetingInsightsEngine.js. The engine is
// pure/no-LLM/no-IO and NEVER throws on malformed input — every test below
// exercises that contract.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MeetingInsightsEngine, emptyInsightsReport } from '../../../dist-electron/electron/intelligence/MeetingInsightsEngine.js';

// t0 = 0 ms; timestamps are session-relative, ms.
const BASE = [
  { speaker: 'You', text: 'Can you tell me how you handled the Redis migration outage?', timestamp: 0 },
  { speaker: 'Anna', text: 'Sure. We rolled back to the previous build, then shipped a hotfix with a kill switch.', timestamp: 9000 },
  { speaker: 'You', text: 'What did the roll back cost in uptime?', timestamp: 18000 },
  { speaker: 'Anna', text: 'About two minutes. We also added alerts so the same failure trips a pager first.', timestamp: 27000 },
  { speaker: 'You', text: 'Could you walk me through why the cluster sort failed in the warm cache?', timestamp: 36000 },
  { speaker: 'Anna', text: 'The cache was capped at eight gigabytes and the job needed ten.', timestamp: 45000 },
  { speaker: 'You', text: 'How would you prevent it next time?', timestamp: 54000 },
  { speaker: 'Anna', text: 'Quota per job plus a pre-write size check that fails fast.', timestamp: 63000 },
];

describe('MeetingInsightsEngine — shape + never-throws contract', () => {
  test('empty/malformed inputs return an honest limited-data report, never throw', () => {
    const engine = new MeetingInsightsEngine();
    for (const input of [
      {},
      { segments: null },
      { segments: [] },
      { segments: undefined },
      { segments: [{ speaker: 'a', text: 'hello there' }] },
      { segments: [null, undefined, { text: '' }, { speaker: 'You', text: 'ok ok ok ok ok'}] },
      { segments: [{ speaker: 'You', text: 'ok ok ok ok'}, { timestamp: 'not-a-number' }] },
      { segments: [{ speaker: 'You', text: 'ok ok ok ok'}], durationMs: Number.NaN },
    ]) {
      assert.doesNotThrow(() => engine.compute(input));
    }
    const r = engine.compute({});
    assert.equal(r.schemaVersion, 1);
    assert.equal(r.turns, 0);
    assert.equal(r.engagement.grade, 'limited-data');
    assert.equal(r.engagement.score, 0);
    assert.equal(r.talkTime.bySpeaker.length, 0);
  });

  test('missing durationMs falls back to segment-estimated minutes (no NaN anywhere)', () => {
    const r = new MeetingInsightsEngine().compute({ segments: BASE });
    assert.ok(Number.isFinite(r.pace.overallWpm));
    assert.ok(Number.isFinite(r.engagement.score));
    assert.ok(Number.isFinite(r.questions.per10Min));
  });

  test('garbage with extreme values is clamped (no runaway scores)', () => {
    const engine = new MeetingInsightsEngine();
    const wild = (v) => engine.compute({ segments: BASE, durationMs: v }).engagement.score;
    assert.ok(wild(-5) >= 0);
    assert.ok(wild(Number.MAX_SAFE_INTEGER) <= 100);
    assert.ok(engine.compute({ segments: BASE, durationMs: 0 }).engagement.score >= 0);
  });
});

describe('MeetingInsightsEngine — talk time + balance', () => {
  test('two speakers split talk time; shares sum ≈ 1; wpm finite', () => {
    const r = new MeetingInsightsEngine().compute({ segments: BASE, durationMs: 70_000 });
    assert.ok(r.talkTime.bySpeaker.length >= 2);
    const shareSum = r.talkTime.bySpeaker.reduce((a, s) => a + s.share, 0);
    assert.ok(Math.abs(shareSum - 1) < 0.15, `shareSum=${shareSum}`);
    for (const s of r.talkTime.bySpeaker) {
      assert.ok(s.turns > 0);
      assert.ok(Number.isFinite(s.wpm));
      assert.ok(Number.isFinite(s.share) && s.share > 0);
    }
    const you = r.talkTime.bySpeaker.find((s) => s.speaker === 'You');
    const anna = r.talkTime.bySpeaker.find((s) => s.speaker === 'Anna' || !USER_ALIAS(s.speaker));
    assert.ok(you && anna && you.speaker !== anna.speaker);
    assert.equal(you.role, 'user');
    assert.equal(anna.role, 'other');
  });

  test('single-channel session gets an honest neutral participation (0.4), not fabricated balance', () => {
    const r = new MeetingInsightsEngine().compute({
      segments: [
        { speaker: 'You', text: 'let me think about the design of the queue — ok ok ok ok ok ok ok', timestamp: 0 },
        { speaker: 'You', text: 'so the design uses a ring buffer with quota and a pre-write size check', timestamp: 20_000 },
      ],
      durationMs: 60_000,
    });
    assert.equal(r.talkTime.bySpeaker.length, 1);
    assert.ok(Math.abs(r.engagement.subscores.participation - 0.4) < 0.01);
  });

  test('balance is lower when one speaker dominates (~monologue)', () => {
    const dominant = Array.from({ length: 12 }, (_, i) => ({ speaker: 'Anna', text: `monologue point number ${i}, portal cache quota pre-write sorted`, timestamp: i * 9_000 }));
    const balanced = BASE;
    const rDom = new MeetingInsightsEngine().compute({ segments: dominant, durationMs: 110_000 });
    const rBal = new MeetingInsightsEngine().compute({ segments: balanced, durationMs: 70_000 });
    assert.ok(rDom.talkTime.balance < rBal.talkTime.balance);
  });
});

describe('MeetingInsightsEngine — questions + key moments', () => {
  test('counts questions per role + counter-question share', () => {
    const r = new MeetingInsightsEngine().compute({ segments: BASE, durationMs: 70_000 });
    assert.equal(r.questions.total, 4);
    assert.equal(r.questions.user, 4);
    assert.equal(r.questions.other, 0);
    assert.equal(r.questions.counterQuestionShare, 1);
    assert.ok(r.questions.per10Min > 0);
  });

  test('first question / decision / action / risk moments are relative ms (rounded ints)', () => {
    const segments = [
      { speaker: 'You', text: 'what about the queue quota?', timestamp: 0 },
      { speaker: 'Anna', text: 'we decided to ship the beta next Tuesday', timestamp: 9_000 },
      { speaker: 'Anna', text: 'Anna will own the kill switch rollout', timestamp: 18_000 },
      { speaker: 'Anna', text: 'Risk: the pager alerts may exceed the on-call budget', timestamp: 27_000 },
    ];
    const r = new MeetingInsightsEngine().compute({ segments, durationMs: 40_000 });
    assert.equal(r.keyMoments.firstQuestionAtMs, 0);
    assert.equal(r.keyMoments.firstDecisionAtMs, 9_000);
    assert.equal(r.keyMoments.firstActionAtMs, 18_000);
    assert.equal(r.keyMoments.firstRiskAtMs, 27_000);
  });

  test('moments stay null (unknown time) when timestamps are unusable', () => {
    const noTimestamps = BASE.map(({ speaker, text }) => ({ speaker, text }));
    const r = new MeetingInsightsEngine().compute({ segments: noTimestamps });
    assert.equal(r.keyMoments.firstQuestionAtMs, null);
    assert.equal(r.dynamics.longestSilenceMs, 0);
  });

  test('opening + closing question windows count only inside the edges', () => {
    const segments = [
      { speaker: 'You', text: 'any concerns before we start?', timestamp: 0 },
      { speaker: 'Anna', text: 'nope, all sounds fine', timestamp: 9_000 },
      { speaker: 'Anna', text: 'the middle is intentionally question-free filler about portal cache quota', timestamp: 45_000 },
      { speaker: 'You', text: 'any concerns before we wrap up?', timestamp: 100_000 },
      { speaker: 'Anna', text: 'none', timestamp: 110_000 },
    ];
    const r = new MeetingInsightsEngine().compute({ segments, durationMs: 115_000 });
    assert.ok(r.dynamics.openingQuestions >= 1);
    assert.ok(r.dynamics.closingQuestions >= 1);
  });
});

describe('MeetingInsightsEngine — keywords + pace', () => {
  test('stop-words filtered; frequent domain words rank first; bigrams capped', () => {
    const r = new MeetingInsightsEngine().compute({ segments: BASE, durationMs: 70_000 });
    const words = r.keywords.unigrams.map((k) => k.word);
    assert.ok(!words.includes('can') && !words.includes('you'));
    assert.ok(r.keywords.unigrams.length <= 12);
    assert.ok(r.keywords.bigrams.length <= 8);
    const counts = r.keywords.unigrams.map((k) => k.count);
    for (let i = 1; i < counts.length; i++) assert.ok(counts[i - 1] >= counts[i]);
  });

  test('overall wpm is a reasonable integer for a normal meeting', () => {
    const r = new MeetingInsightsEngine().compute({ segments: BASE, durationMs: 70_000 });
    assert.ok(Number.isInteger(r.pace.overallWpm));
    assert.ok(r.pace.overallWpm > 0 && r.pace.overallWpm < 400);
  });
});

describe('MeetingInsightsEngine — engagement scoring invariants', () => {
  test('score stays within 0..100 and grade maps correctly', () => {
    const engine = new MeetingInsightsEngine();
    const r = engine.compute({ segments: BASE, durationMs: 70_000 });
    assert.ok(r.engagement.score >= 0 && r.engagement.score <= 100);
    assert.ok(['needs-work', 'good', 'great'].includes(r.engagement.grade));
    for (const v of Object.values(r.engagement.subscores)) {
      assert.ok(v >= 0 && v <= 1);
    }
  });

  test('deterministic: same input twice → identical report minus computedAt', () => {
    const input = { segments: BASE, durationMs: 70_000, meetingId: 'm1', mode: 'technical' };
    const a = new MeetingInsightsEngine().compute(input);
    const b = new MeetingInsightsEngine().compute(input);
    a.computedAt = 0;
    b.computedAt = 0;
    assert.deepEqual(a, b);
  });

  test('emptyInsightsReport() mirrors the engine fallback shape (pin)', () => {
    const e = emptyInsightsReport();
    const f = new MeetingInsightsEngine().compute({});
    e.computedAt = f.computedAt;
    assert.deepEqual(e, f);
  });
});

function USER_ALIAS(speaker) {
  return speaker === 'You';
}
