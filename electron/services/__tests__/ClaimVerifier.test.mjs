import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import Module from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svcUrl = pathToFileURL(
  path.resolve(__dirname, '../../../dist-electron/electron/services/claims/ClaimVerifierService.js'),
).href;
const wireUrl = pathToFileURL(
  path.resolve(__dirname, '../../../dist-electron/electron/services/claims/tavilyClient.js'),
).href;

// Neutralize electron so importing the bundled tavilyClient (which top-level
// imports CredentialsManager → electron app.getPath) is harmless under plain
// `node --test`. Mirrors PhoneMirrorExtensionV2.test.mjs pattern.
const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'refract-fc-test-'));
const electronStub = {
  app: {
    getPath: () => tmpUserData,
    isReady: () => true,
    whenReady: () => Promise.resolve(),
    on: () => {},
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s) => Buffer.from(String(s), 'utf8'),
    decryptString: (b) => Buffer.from(b).toString('utf8'),
  },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return electronStub;
  return origLoad.call(this, request, parent, isMain);
};

// Stub routes emulating Tavily POST /search (exact paths asserted below).
const SUPPORT_URL = 'https://example.com/latency-report';
const REFUTE_URL = 'https://example.com/latency-debunk';

function makeClaim(text = 'Nossa latencia caiu para 120ms no ultimo trimestre') {
  return { text, score: 0.85, kind: 'number' };
}

describe('ClaimVerifierService (injectable deps, no network)', () => {
  let ClaimVerifierService;
  let ClaimVerifierError;
  before(async () => {
    const mod = await import(svcUrl);
    ClaimVerifierService = mod.ClaimVerifierService;
    ClaimVerifierError = mod.ClaimVerifierError;
    assert.ok(ClaimVerifierService, 'service module must export ClaimVerifierService');
  });

  test('support case -> confirmed with supporting url', async () => {
    let seenQuery = '';
    const svc = new ClaimVerifierService({
      tavilySearch: async (q) => {
        seenQuery = q;
        return [{ title: 'Latency report', url: SUPPORT_URL, content: 'latency fell to 120ms last quarter' }];
      },
      judge: async () => 'Verdict: SUPPORTED\nSummary: Evidence confirms the latency drop.\nURL: ' + SUPPORT_URL + '\nConfidence: 0.9',
      hasKey: () => true,
    });
    const v = await svc.verify(makeClaim());
    assert.ok(seenQuery.length > 0, 'search must receive the claim text');
    assert.equal(v.verdict, 'confirmed');
    assert.equal(v.url, SUPPORT_URL);
    assert.equal(v.sourced, true);
    assert.ok(v.confidence > 0.5, `confidence=${v.confidence}`);
    assert.equal(v.claim, makeClaim().text);
  });

  test('refute case -> refuted with contradicting url', async () => {
    const svc = new ClaimVerifierService({
      tavilySearch: async () => [{ title: 'Debunk', url: REFUTE_URL, content: 'latency actually rose to 400ms' }],
      judge: async () => 'Verdict: REFUTED\nSummary: Sources contradict the claim.\nURL: ' + REFUTE_URL + '\nConfidence: 0.88',
      hasKey: () => true,
    });
    const v = await svc.verify(makeClaim('Our latency never exceeds 100ms'));
    assert.equal(v.verdict, 'refuted');
    assert.equal(v.url, REFUTE_URL);
    assert.equal(v.sourced, true);
  });

  test('empty results -> doubtful, sourced false', async () => {
    const svc = new ClaimVerifierService({
      tavilySearch: async () => [],
      judge: async () => 'Verdict: UNCERTAIN\nSummary: No evidence found either way.\nURL: NONE\nConfidence: 0.4',
      hasKey: () => true,
    });
    const v = await svc.verify(makeClaim());
    assert.equal(v.verdict, 'doubtful');
    assert.equal(v.sourced, false);
  });

  test('401 case (search throws) -> doubtful, no throw', async () => {
    const err = new Error('Unauthorized');
    err.status = 401;
    const svc = new ClaimVerifierService({
      tavilySearch: async () => { throw err; },
      judge: async () => 'Verdict: UNCERTAIN\nSummary: Search unavailable.\nURL: NONE\nConfidence: 0.3',
      hasKey: () => true,
    });
    const v = await svc.verify(makeClaim());
    assert.equal(v.verdict, 'doubtful');
    assert.equal(v.sourced, false);
  });

  test('no-key path -> judge-only, 0 search hits, capped confidence, url null', async () => {
    let hits = 0;
    let seenPrompt = '';
    const svc = new ClaimVerifierService({
      tavilySearch: async () => { hits += 1; return []; },
      judge: async (p) => {
        seenPrompt = p;
        return 'Verdict: UNCERTAIN\nSummary: From knowledge alone, cannot confirm.\nURL: NONE\nConfidence: 0.95';
      },
      hasKey: () => false,
    });
    const v = await svc.verify(makeClaim());
    assert.equal(hits, 0, 'no HTTP/search attempted without a key');
    assert.match(seenPrompt, /knowledge/i, 'fallback prompt must say knowledge-only');
    assert.equal(v.verdict, 'doubtful');
    assert.equal(v.sourced, false);
    assert.equal(v.url, null);
    assert.ok(v.confidence <= 0.6, `confidence capped, got ${v.confidence}`);
  });

  test('timeout path -> ClaimVerifierError, no hang', async () => {
    const hanging = () => new Promise(() => {});
    const svc = new ClaimVerifierService({
      tavilySearch: hanging,
      judge: hanging,
      hasKey: () => true,
    });
    const started = Date.now();
    await assert.rejects(() => svc.verify(makeClaim(), { timeoutMs: 50 }), ClaimVerifierError);
    assert.ok(Date.now() - started < 2000, 'must reject fast, never hang');
  });

  test('NONE url never falls back to first evidence (url null)', async () => {
    const svc = new ClaimVerifierService({
      tavilySearch: async () => [{ title: 'Latency report', url: SUPPORT_URL, content: 'latency fell to 120ms' }],
      judge: async () => 'Verdict: SUPPORTED\nSummary: Judge says none.\nURL: NONE\nConfidence: 0.8',
      hasKey: () => true,
    });
    const v = await svc.verify(makeClaim());
    assert.equal(v.url, null, 'NONE must map to null, never first-evidence fallback');
  });
});

describe('tavilyClient adapter (stub node:http emulating Tavily /search)', () => {
  let server;
  let baseUrl;
  let mode = 'support';
  let hitCount = 0;
  let lastAuth = '';
  let lastBody = '';

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/search') {
        hitCount += 1;
        lastAuth = String(req.headers.authorization ?? '');
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
          lastBody = raw;
          if (mode === 'unauthorized') {
            res.writeHead(401, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ detail: { error: 'Unauthorized' } }));
            return;
          }
          if (mode === 'slow') {
            // Hold open ~1.2s so an abort (20ms) must win if forwarding works.
            // Without forwarding the SDK would wait for this response (resolve,
            // not reject) or for its 9s timeout — never an AbortError.
            setTimeout(() => {
              try {
                if (!res.writableEnded && !res.destroyed) {
                  res.writeHead(200, { 'content-type': 'application/json' });
                  res.end(JSON.stringify({ query: 'q', responseTime: 0.1, images: [], results: [{ title: 'Latency report', url: SUPPORT_URL, content: 'latency fell to 120ms', score: 0.9 }], requestId: 'stub-1' }));
                }
              } catch {}
            }, 1200);
            return;
          }
          const results = mode === 'empty' ? [] : [
            { title: 'Latency report', url: SUPPORT_URL, content: 'latency fell to 120ms', score: 0.9 },
          ];
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ query: 'q', responseTime: 0.1, images: [], results, requestId: 'stub-1' }));
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    Module._load = origLoad;
    try { fs.rmSync(tmpUserData, { recursive: true, force: true }); } catch {}
  });

  test('adapter maps Tavily results, sends Bearer key, never 0-hit on key path', async () => {
    const { createTavilySearch } = await import(wireUrl);
    mode = 'support';
    hitCount = 0;
    const search = createTavilySearch({ apiKey: 'tvly-test-key', baseUrl });
    const out = await search('latency 120ms claim');
    assert.equal(hitCount, 1, 'exactly one POST /search');
    assert.equal(lastAuth, 'Bearer tvly-test-key');
    assert.match(lastBody, /latency 120ms claim/);
    assert.equal(out.length, 1);
    assert.equal(out[0].url, SUPPORT_URL);
  });

  test('adapter 401 -> [] (service maps to doubtful, no throw)', async () => {
    const { createTavilySearch } = await import(wireUrl);
    mode = 'unauthorized';
    const search = createTavilySearch({ apiKey: 'tvly-bad-key', baseUrl });
    const out = await search('anything');
    assert.deepEqual(out, []);
  });

  test('adapter empty results -> []', async () => {
    const { createTavilySearch } = await import(wireUrl);
    mode = 'empty';
    const search = createTavilySearch({ apiKey: 'tvly-test-key', baseUrl });
    assert.deepEqual(await search('anything'), []);
  });

  test('createJudge binds skipModeInjection=true (5th arg, LLMHelper.chat order)', async () => {
    const { createJudge } = await import(wireUrl);
    let seenArgs = null;
    const fakeChat = async (...args) => {
      seenArgs = args;
      return 'Verdict: SUPPORTED\nSummary: ok.\nURL: NONE\nConfidence: 0.5';
    };
    const judge = createJudge(fakeChat);
    await judge('hello prompt');
    assert.ok(Array.isArray(seenArgs), 'chat must be called');
    assert.equal(seenArgs.length, 5, 'chat(prompt, undefined, undefined, undefined, true)');
    assert.equal(seenArgs[0], 'hello prompt');
    assert.equal(seenArgs[1], undefined);
    assert.equal(seenArgs[2], undefined);
    assert.equal(seenArgs[3], undefined);
    assert.equal(seenArgs[4], true);
  });

  test('adapter pre-aborted signal rejects without network hit', async () => {
    const { createTavilySearch } = await import(wireUrl);
    mode = 'support';
    hitCount = 0;
    const search = createTavilySearch({ apiKey: 'tvly-test-key', baseUrl });
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(() => search('anything', { signal: ctrl.signal }), (e) => e && e.name === 'AbortError');
    assert.equal(hitCount, 0, 'pre-aborted must not hit the network');
  });

  test('adapter abort mid-search rejects promptly (AbortError)', async () => {
    const { createTavilySearch } = await import(wireUrl);
    mode = 'slow';
    const search = createTavilySearch({ apiKey: 'tvly-test-key', baseUrl });
    const ctrl = new AbortController();
    const started = Date.now();
    const p = search('latency claim slow', { signal: ctrl.signal });
    setTimeout(() => ctrl.abort(), 20);
    await assert.rejects(p, (e) => e && e.name === 'AbortError');
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 2000, `must reject promptly, took ${elapsed}ms (SDK timeout is 9s, slow response 1.2s)`);
    mode = 'support';
  });

  test('judge abort mid-call rejects promptly (AbortError)', async () => {
    const { createJudge } = await import(wireUrl);
    const hangingChat = () => new Promise(() => {});
    const judge = createJudge(hangingChat);
    const ctrl = new AbortController();
    const p = judge('prompt', { signal: ctrl.signal });
    setTimeout(() => ctrl.abort(), 20);
    const started = Date.now();
    await assert.rejects(p, (e) => e && e.name === 'AbortError');
    assert.ok(Date.now() - started < 2000, 'judge abort must reject promptly');
  });

  test('createLiveClaimVerifier wires key→auth, forced-format prompt, sourced verdict', async () => {
    const wireMod = await import(wireUrl);
    const { createLiveClaimVerifier } = wireMod;
    assert.ok(createLiveClaimVerifier, 'must export createLiveClaimVerifier');
    const CM = wireMod.CredentialsManager;
    assert.ok(CM && typeof CM.getInstance === 'function', 'tavilyClient must expose bundled CredentialsManager for faking');
    const origGetInstance = CM.getInstance;
    CM.getInstance = () => ({ getTavilyApiKey: () => 'k' });
    try {
      mode = 'support';
      hitCount = 0;
      lastAuth = '';
      let seenPrompt = '';
      let seenChatArgs = null;
      const fakeChat = async (...args) => {
        seenChatArgs = args;
        seenPrompt = String(args[0] ?? '');
        return 'Verdict: SUPPORTED\nSummary: Evidence confirms the latency drop.\nURL: ' + SUPPORT_URL + '\nConfidence: 0.9';
      };
      const verifier = createLiveClaimVerifier(fakeChat, { baseUrl });
      const v = await verifier.verify({ text: 'latency fell to 120ms last quarter', score: 0.9, kind: 'number' });
      assert.equal(lastAuth, 'Bearer k', 'Tavily key must flow to search Authorization header');
      assert.equal(hitCount, 1, 'live path must hit Tavily search exactly once');
      assert.ok(seenChatArgs && seenChatArgs.length === 5 && seenChatArgs[4] === true, 'judge must bind skipModeInjection=true');
      assert.match(seenPrompt, /EXACTLY/, 'judge must receive forced-format prompt');
      assert.match(seenPrompt, /SUPPORTED\|REFUTED\|UNCERTAIN/, 'prompt must pin verdict tokens');
      assert.equal(v.verdict, 'confirmed');
      assert.equal(v.sourced, true, 'live path with evidence must be sourced');
      assert.equal(v.url, SUPPORT_URL);
    } finally {
      CM.getInstance = origGetInstance;
      mode = 'support';
    }
  });
});

// Task 3: ClaimThrottle — pure per-meeting gate (no network, no electron).
// Throttle rules: max 1 check / 20s, dedupe normalized claims, cap 20/meeting.
const throttleUrl = pathToFileURL(
  path.resolve(__dirname, '../../../dist-electron/electron/services/claims/ClaimThrottle.js'),
).href;

describe('ClaimThrottle (20s cooldown, dedupe, 20/meeting cap)', () => {
  let ClaimThrottle;
  let normalizeClaim;
  before(async () => {
    const mod = await import(throttleUrl);
    ClaimThrottle = mod.ClaimThrottle;
    normalizeClaim = mod.normalizeClaim;
    assert.ok(ClaimThrottle, 'throttle module must export ClaimThrottle');
    assert.ok(normalizeClaim, 'throttle module must export normalizeClaim');
  });

  test('normalize lowercases + collapses whitespace', () => {
    assert.equal(normalizeClaim('  LATENCY   Fell  '), 'latency fell');
  });

  test('first claim allowed, repeat blocked (dedupe)', () => {
    const t = new ClaimThrottle();
    const key = normalizeClaim('Latency fell to 120ms last quarter');
    assert.equal(t.allow(key, 100000), true);
    assert.equal(t.allow(key, 100000 + 30000), false, 'same claim never re-checks');
  });

  test('dedupe is normalization-insensitive', () => {
    const t = new ClaimThrottle();
    assert.equal(t.allow(normalizeClaim('Latency fell to 120ms'), 100000), true);
    assert.equal(t.allow(normalizeClaim('  LATENCY  fell to 120MS '), 130000), false);
  });

  test('distinct claim within 20s blocked, at 20s allowed (cooldown)', () => {
    const t = new ClaimThrottle();
    assert.equal(t.allow(normalizeClaim('claim alpha here now'), 200000), true);
    assert.equal(t.allow(normalizeClaim('claim beta here now'), 200000 + 19999), false);
    assert.equal(t.allow(normalizeClaim('claim beta here now'), 200000 + 20000), true);
  });

  test('empty key never allowed', () => {
    const t = new ClaimThrottle();
    assert.equal(t.allow('', 300000), false);
  });

  test('cap: 20 checks/meeting, 21st blocked; reset restores', () => {
    const t = new ClaimThrottle();
    let now = 400000;
    for (let i = 0; i < 20; i += 1) {
      now += 21000;
      assert.equal(t.allow(normalizeClaim(`distinct meeting claim number ${i}`), now), true, `check ${i + 1} must pass`);
    }
    now += 21000;
    assert.equal(t.allow(normalizeClaim('one more claim here'), now), false, '21st check blocked');
    t.reset();
    assert.equal(t.allow(normalizeClaim('after reset claim here'), now + 21000), true);
  });
});
