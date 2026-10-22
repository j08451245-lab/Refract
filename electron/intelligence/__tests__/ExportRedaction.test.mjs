// ExportRedaction — pin contract for the export redaction shield.
// Pure module: detectors must redact VALIDATED secrets/identifiers, must not
// touch innocuous numbers (times, dates, ids shorter than 9 digits), and the
// whole surface must never throw. analyze() returns counts only.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ExportRedactionShield,
  getRedactionShield,
  isValidCpf,
  isValidCnpj,
  luhnValid,
  REDACT_MAX_INPUT_CHARS,
} from '../../../dist-electron/electron/intelligence/ExportRedaction.js';

const shield = new ExportRedactionShield();

// --- deterministic test fixtures (synthetic, not real credentials) ---------
const EMAIL = 'ana.silva+test@example.com';
const PHONE_BR = '+55 (11) 98765-4321';
const PHONE_INTL = '+1 415 555 2671';
const CPF_VALID = '529.982.247-25'; // classic mod-11 valid sample
const CPF_INVALID = '111.222.333-44';
const CNPJ_VALID = '11.222.333/0001-81'; // mod-11 valid sample
const CNPJ_INVALID = '11.222.333/0001-82';
const CNPJ_BARE = '11222333000181';
const CARD_VISA = '4111 1111 1111 1111'; // Luhn valid
const CARD_INVALID = '4111 1111 1111 1112';
const OPENAI_KEY = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWx';
const GITHUB_PAT = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const GOOGLE_KEY = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';
const SLACK = 'xoxb-1234567890-abcdefghijkl';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

const redactAll = (s) => shield.redact(s, { policy: 'all' });

describe('ExportRedaction — detectors redact validated identifiers', () => {
  test('emails are removed (case-insensitive, plus-tags)', () => {
    const r = redactAll(`contact ${EMAIL} and ANA@EXAMPLE.ORG please`);
    assert.ok(!r.text.includes(EMAIL));
    assert.ok(!r.text.toLowerCase().includes('ana@example.org'));
    assert.equal(r.totalFindings, 2);
    assert.equal(r.findings.find((f) => f.kind === 'email').count, 2);
  });

  test('phones with 9–15 digits are removed; short numbers survive', () => {
    const r = redactAll(`call ${PHONE_BR} or ${PHONE_INTL}, ext 1234, at 12:45`);
    assert.ok(!r.text.includes('98765'));
    assert.ok(!r.text.includes('555 2671'));
    assert.ok(r.text.includes('ext 1234'));
    assert.ok(r.text.includes('12:45'));
    assert.equal(r.findings.find((f) => f.kind === 'phone').count, 2);
  });

  test('CPF removed only when checksum-valid; invalid pattern survives (honest)', () => {
    const r = redactAll(`doc ${CPF_VALID} vs ${CPF_INVALID}`);
    assert.ok(!r.text.includes(CPF_VALID));
    assert.ok(r.text.includes(CPF_INVALID));
    assert.equal(r.findings.find((f) => f.kind === 'cpf').count, 1);
  });

  test('CNPJ removed only when mod-11 valid — masked and bare forms', () => {
    const r = redactAll(`company ${CNPJ_VALID} / ${CNPJ_BARE}; fake ${CNPJ_INVALID}`);
    assert.ok(!r.text.includes(CNPJ_VALID));
    assert.ok(!r.text.includes(CNPJ_BARE));
    assert.ok(r.text.includes(CNPJ_INVALID));
    assert.equal(r.findings.find((f) => f.kind === 'cnpj').count, 2);
  });

  test('card numbers removed only when Luhn-valid', () => {
    const r = redactAll(`card ${CARD_VISA}; ref ${CARD_INVALID}`);
    assert.ok(!r.text.includes(CARD_VISA));
    assert.ok(r.text.includes(CARD_INVALID));
    assert.equal(r.findings.find((f) => f.kind === 'card-number').count, 1);
  });

  test('API keys, PATs, JWT, bearer tokens are removed', () => {
    const text = `keys: ${OPENAI_KEY} / ${GITHUB_PAT} / ${AWS_KEY} / ${GOOGLE_KEY} / ${SLACK}\nauth: Bearer abcdefghijklmnopqrstuvwx\njwt ${JWT}`;
    const r = redactAll(text);
    for (const secret of [OPENAI_KEY, GITHUB_PAT, AWS_KEY, GOOGLE_KEY, SLACK, JWT, 'abcdefghijklmnopqrstuvwx']) {
      assert.ok(!r.text.includes(secret), `secret survived: ${secret.slice(0, 12)}...`);
    }
    assert.ok(r.text.includes('Bearer'));
    assert.ok(r.totalFindings >= 7);
  });
});

describe('ExportRedaction — false-positive discipline', () => {
  test('ordinary prose, dates, money, durations and short ids survive', () => {
    const text = 'On 2026-10-22 we reviewed 3 items, cost $1,250.00, took 45 min, ticket #48231, version 2.9.0.';
    const r = redactAll(text);
    assert.equal(r.text, text);
    assert.equal(r.totalFindings, 0);
  });

  test('policies are scoped: personal-data only vs secrets only', () => {
    const text = `mail ${EMAIL} key ${OPENAI_KEY}`;
    const p = shield.redact(text, { policy: 'personal-data' });
    const s = shield.redact(text, { policy: 'secrets' });
    assert.ok(!p.text.includes(EMAIL) && p.text.includes(OPENAI_KEY));
    assert.ok(!s.text.includes(OPENAI_KEY) && s.text.includes(EMAIL));
  });

  test('invalid policy falls back to all (fail-closed)', () => {
    const r = shield.redact(`mail ${EMAIL} key ${OPENAI_KEY}`, { policy: 'whatever' });
    assert.ok(!r.text.includes(EMAIL) && !r.text.includes(OPENAI_KEY));
  });
});

describe('ExportRedaction — resilience + contract', () => {
  test('never throws on garbage / non-string input', () => {
    for (const v of [undefined, null, 42, {}, [], '', '\u0000\u0000']) {
      assert.doesNotThrow(() => shield.redact(v));
      assert.doesNotThrow(() => shield.analyze(v));
    }
    const r = shield.redact(undefined);
    assert.equal(r.text, '');
    assert.equal(r.totalFindings, 0);
  });

  test('analyze returns counts only (no text/span keys)', () => {
    const findings = shield.analyze(`mail ${EMAIL} jwt ${JWT}`);
    assert.ok(findings.length >= 2);
    for (const f of findings) {
      assert.deepEqual(Object.keys(f).sort(), ['count', 'kind']);
      assert.equal(typeof f.count, 'number');
    }
  });

  test('oversized input: head is scanned, findings counted, no crash', () => {
    const padding = 'x'.repeat(REDACT_MAX_INPUT_CHARS + 10);
    const r = shield.redact(`start ${EMAIL} ${padding}`);
    assert.ok(!r.text.includes(EMAIL));
    assert.ok(r.text.length > REDACT_MAX_INPUT_CHARS);
    assert.equal(r.findings.find((f) => f.kind === 'email').count, 1);
  });

  test('validators are pinned (CPF/CNPJ mod-11, Luhn)', () => {
    assert.equal(isValidCpf('52998224725'), true);
    assert.equal(isValidCpf('11111111111'), false);
    assert.equal(isValidCpf('123'), false);
    assert.equal(isValidCnpj('11222333000181'), true);
    assert.equal(isValidCnpj('11222333000182'), false);
    assert.equal(isValidCnpj('00000000000000'), false);
    assert.equal(isValidCnpj('123'), false);
    assert.equal(luhnValid('4111111111111111'), true);
    assert.equal(luhnValid('4111111111111112'), false);
    assert.equal(luhnValid('123456789012'), false); // too short
  });

  test('replacement tokens stay readable', () => {
    const r = redactAll(`write ${EMAIL}`);
    assert.ok(r.text.includes('[email removed]'));
  });

  test('getRedactionShield returns a stable shared instance', () => {
    assert.equal(getRedactionShield(), getRedactionShield());
  });
});
