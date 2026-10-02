import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svcUrl = pathToFileURL(
  path.resolve(__dirname, '../../../dist-electron/electron/services/claims/ClaimVerifierService.js'),
).href;
const wireUrl = pathToFileURL(
  path.resolve(__dirname, '../../../dist-electron/electron/services/claims/tavilyClient.js'),
).href;

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
});
