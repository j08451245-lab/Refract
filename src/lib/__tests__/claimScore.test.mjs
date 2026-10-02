import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreClaim } from '../claimScore.mjs';

describe('claimScore', () => {
  test('strong numeric claim scores high', () => {
    const r = scoreClaim('Nossa latência caiu para 120ms no último trimestre');
    assert.ok(r.score >= 0.7, `score=${r.score}`);
    assert.equal(r.kind, 'number');
  });

  test('absolute claim scores high', () => {
    const r = scoreClaim('We never had a data breach');
    assert.ok(r.score >= 0.7, `score=${r.score}`);
  });

  test('opinion scores low', () => {
    const r = scoreClaim('Acho que talvez fosse legal tentarmos outra abordagem');
    assert.ok(r.score < 0.4, `score=${r.score}`);
  });

  test('greeting scores ~0', () => {
    assert.equal(scoreClaim('Oi, bom dia!').score, 0);
  });

  test('entity + date combine', () => {
    const r = scoreClaim('A Intel lançou o Panther Lake em 2026');
    assert.ok(r.score >= 0.7, `score=${r.score}`);
  });
});
