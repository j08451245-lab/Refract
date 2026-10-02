import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mgrPath = path.resolve(__dirname, '../../../dist-electron/electron/services/OpencodeManager.js');
const mgrMod = await import(pathToFileURL(mgrPath).href);
const { OpencodeManager, OPENCODE_PORT } = mgrMod;

function writeFakeServe(dir) {
  const p = path.join(dir, process.platform === 'win32' ? 'fakeserve.cmd' : 'fakeserve.sh');
  const body = process.platform === 'win32'
    ? '@echo off\r\nnode "%~dp0fakeserve.js" %*\r\n'
    : '#!/bin/sh\nexec node "$(dirname "$0")/fakeserve.js" "$@"\n';
  fs.writeFileSync(p, body);
  const js = `const http = require('http');
const port = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 4097);
http.createServer((req, res) => {
  if (req.url === '/global/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ healthy: true, version: 'stub' })); return; }
  res.writeHead(404); res.end();
}).listen(port, '127.0.0.1');`;
  fs.writeFileSync(path.join(dir, 'fakeserve.js'), js);
  return p;
}

describe('opencodeManager', () => {
  test('fixed port constant', () => {
    assert.equal(OPENCODE_PORT, 4097);
  });

  test('starts fake sidecar and reports healthy managed', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocmgr-'));
    const bin = writeFakeServe(dir);
    const mgr = OpencodeManager.getInstance();
    try {
      const res = await mgr.ensureRunning({ bin });
      assert.equal(res.ok, true);
      assert.equal(res.managed, true);
      assert.match(res.baseUrl, /127\.0\.0\.1:4097/);
      assert.match(mgr.getAuthHeader() ?? '', /^Basic /);
    } finally {
      mgr.stop();
    }
  });

  test('missing binary is unavailable without throwing', async () => {
    const mgr = OpencodeManager.getInstance();
    const res = await mgr.ensureRunning({ bin: path.join(os.tmpdir(), 'definitely-not-here-opencode') });
    assert.equal(res.ok, false);
  });
});

describe('opencodeService', () => {
  test('chat uses ephemeral session and Basic auth', async () => {
    const http = await import('node:http');
    const seen = { auth: '', deleted: '' };
    const server = http.createServer((req, res) => {
      seen.auth = String(req.headers.authorization ?? '');
      const json = (obj) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.url === '/global/health') return json({ healthy: true, version: 'stub' });
      if (req.url === '/session' && req.method === 'POST') return json({ id: 'ses_test' });
      if (req.url === '/session/ses_test/message' && req.method === 'POST') {
        return json({ info: {}, parts: [{ type: 'text', text: 'hello from stub' }] });
      }
      if (req.url === '/session/ses_test' && req.method === 'DELETE') { seen.deleted = 'yes'; return json(true); }
      res.writeHead(404); res.end();
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const mod = await import(pathToFileURL(path.resolve(__dirname, '../../../dist-electron/electron/services/OpencodeService.js')).href);
    const svc = new mod.OpencodeService({ baseUrl: `http://127.0.0.1:${port}`, password: 'pw' });
    try {
      assert.equal(await svc.checkHealth(), true);
      const out = await svc.chat('hi', 'opencode/stub/model');
      assert.equal(out, 'hello from stub');
      assert.match(seen.auth, /^Basic /);
      assert.equal(seen.deleted, 'yes');
    } finally {
      server.close();
    }
  });

  test('listModels returns connected-only entries', async () => {
    const http = await import('node:http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        all: [{ id: 'a' }, { id: 'b' }],
        default: { a: 'm1' },
        connected: ['a'],
      }));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const mod = await import(pathToFileURL(path.resolve(__dirname, '../../../dist-electron/electron/services/OpencodeService.js')).href);
    const svc = new mod.OpencodeService({ baseUrl: `http://127.0.0.1:${port}`, password: 'pw' });
    try {
      assert.deepEqual(await svc.listModels(), [{ provider: 'a', model: 'm1', label: 'a/m1' }]);
    } finally {
      server.close();
    }
  });
});

describe('opencodeStreaming', () => {
  // Probed live shape: `opencode serve` v1.18.27 on 127.0.0.1.
  // `POST /session` -> 200 {id}; `POST /session/:id/prompt_async` -> 204 (empty);
  // `GET /global/event` -> 200 text/event-stream, framing `data: <json>\n\n` (no `event:` lines).
  // Envelope: {"directory","project","payload":{...}}; bare {"payload":{...}} for server events.
  // Raw probed lines (session ses_f058777dfffeqd84PFhblj6LIh, model opencode/big-pickle):
  //   data: {"payload":{"id":"evt_0fa788a8a001Jsk7cCEGtfRWXG","type":"server.connected","properties":{}}}
  //   data: {"directory":"C:\\Users\\davif\\refract","project":"216b281ee60394857f6bc58ba0b7b2d5dfa98101","payload":{"id":"evt_0fa78a6f80011zjWmxoyACaN01","type":"message.part.delta","properties":{"sessionID":"ses_f058777dfffeqd84PFhblj6LIh","messageID":"msg_0fa788a93001o7ATb5nc4SkbjE","partID":"prt_0fa78a6ef0010GOtwtkQrRVWSV","field":"text","delta":"hello"}}}
  //   data: {"directory":"C:\\Users\\davif\\refract","project":"216b281ee60394857f6bc58ba0b7b2d5dfa98101","payload":{"id":"evt_0fa78a6fa001V48zPU6fdltbGG","type":"message.part.delta","properties":{"sessionID":"ses_f058777dfffeqd84PFhblj6LIh","messageID":"msg_0fa788a93001o7ATb5nc4SkbjE","partID":"prt_0fa78a6ef0010GOtwtkQrRVWSV","field":"text","delta":" world"}}}
  //   data: {"directory":"C:\\Users\\davif\\refract","project":"216b281ee60394857f6bc58ba0b7b2d5dfa98101","payload":{"id":"evt_0fa78ab29001Hk34ntWyX3f2K5","type":"session.idle","properties":{"sessionID":"ses_f058777dfffeqd84PFhblj6LIh"}}}
  // Notes: assistant text arrives ONLY as message.part.delta (properties.field "text",
  // properties.delta chunk, filtered by properties.sessionID + assistant properties.messageID).
  // The user-echo arrives as message.part.updated with the full prompt text under a DIFFERENT
  // messageID, so implementations must track assistant message IDs from
  // message.updated(info.role "assistant"), not forward every text part. Every .updated event is
  // ALSO duplicated as payload.type "sync" (syncEvent.type "<orig>.1", same event id) — the replay
  // below includes one such duplicate; deltas were observed exactly once. Completion: session.idle
  // (primary) or assistant message.updated carrying time.completed (fallback). session.status
  // idle/busy flaps mid-stream and is never a completion signal. session.error is terminal.
  // The stub replays these shapes byte-for-byte for ses_stream, plus ONE synthetic sync-wrapped
  // duplicate of the first delta (marked below; not observed on the wire) to lock dedup behavior.
  const STREAM_SID = 'ses_stream';
  const USER_MSG = 'msg_user1';
  const ASST_MSG = 'msg_asst1';
  const TEXT_PART = 'prt_text1';
  const tick = (ms) => new Promise((r) => setTimeout(r, ms));
  const svcUrl = (dirname) => pathToFileURL(path.resolve(dirname, '../../../dist-electron/electron/services/OpencodeService.js')).href;

  function streamFrames() {
    const env = (payload) => JSON.stringify({ directory: 'C:\\stub', project: 'proj_stub', payload });
    const frames = [];
    frames.push(JSON.stringify({ payload: { id: 'evt_c1', type: 'server.connected', properties: {} } }));
    frames.push(env({ id: 'evt_u1', type: 'message.updated', properties: { sessionID: STREAM_SID, info: { id: USER_MSG, role: 'user', sessionID: STREAM_SID } } }));
    frames.push(env({ id: 'evt_u2', type: 'message.part.updated', properties: { sessionID: STREAM_SID, part: { type: 'text', text: 'hi', messageID: USER_MSG, sessionID: STREAM_SID, id: 'prt_user1' } } }));
    frames.push(env({ id: 'evt_a1', type: 'message.updated', properties: { sessionID: STREAM_SID, info: { id: ASST_MSG, role: 'assistant', sessionID: STREAM_SID } } }));
    // Realistic sync-wrapped duplicate of the previous .updated event (same id, observed shape).
    frames.push(env({ type: 'sync', syncEvent: { id: 'evt_a1', type: 'message.updated.1', seq: 5, aggregateID: STREAM_SID, data: { sessionID: STREAM_SID, info: { id: ASST_MSG, role: 'assistant', sessionID: STREAM_SID } } }, id: 'evt_a1' }));
    frames.push(env({ id: 'evt_a2', type: 'message.part.updated', properties: { sessionID: STREAM_SID, part: { id: TEXT_PART, messageID: ASST_MSG, sessionID: STREAM_SID, type: 'text', text: '' } } }));
    frames.push(env({ id: 'evt_d1', type: 'message.part.delta', properties: { sessionID: STREAM_SID, messageID: ASST_MSG, partID: TEXT_PART, field: 'text', delta: 'hello' } }));
    // Synthetic sync-wrapped duplicate of the first delta (same id; NOT observed on the wire).
    frames.push(env({ type: 'sync', syncEvent: { id: 'evt_d1', type: 'message.part.delta.1', seq: 9, aggregateID: STREAM_SID, data: { sessionID: STREAM_SID, messageID: ASST_MSG, partID: TEXT_PART, field: 'text', delta: 'hello' } }, id: 'evt_d1' }));
    frames.push(env({ id: 'evt_d2', type: 'message.part.delta', properties: { sessionID: STREAM_SID, messageID: ASST_MSG, partID: TEXT_PART, field: 'text', delta: ' world' } }));
    frames.push(JSON.stringify({ payload: { id: 'evt_h1', type: 'server.heartbeat', properties: {} } }));
    frames.push(env({ id: 'evt_p1', type: 'plugin.added', properties: { id: 'opencode' } }));
    frames.push(env({ id: 'evt_a3', type: 'message.part.updated', properties: { sessionID: STREAM_SID, part: { id: TEXT_PART, messageID: ASST_MSG, sessionID: STREAM_SID, type: 'text', text: 'hello world' } } }));
    frames.push(env({ id: 'evt_a4', type: 'message.updated', properties: { sessionID: STREAM_SID, info: { id: ASST_MSG, role: 'assistant', sessionID: STREAM_SID, time: { created: 1, completed: 2 }, finish: 'stop' } } }));
    frames.push(env({ id: 'evt_s1', type: 'session.status', properties: { sessionID: STREAM_SID, status: { type: 'idle' } } }));
    frames.push(env({ id: 'evt_s2', type: 'session.idle', properties: { sessionID: STREAM_SID } }));
    return frames;
  }

  async function startStreamStub(mode) {
    const http = await import('node:http');
    const state = { deleted: '', auth: '', sseClosed: false };
    const server = http.createServer((req, res) => {
      if (req.url === '/session' && req.method === 'POST') {
        state.auth = String(req.headers.authorization ?? '');
        req.resume();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: STREAM_SID }));
        return;
      }
      if (req.url === `/session/${STREAM_SID}/prompt_async` && req.method === 'POST') {
        state.auth = String(req.headers.authorization ?? '');
        req.resume();
        if (mode === 'prompt404') {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'not found' }));
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.url === '/global/event' && req.method === 'GET') {
        req.on('close', () => { state.sseClosed = true; });
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        if (mode === 'hang') {
          res.write(`data: ${JSON.stringify({ payload: { id: 'evt_hc', type: 'server.connected', properties: {} } })}\n\n`);
          res.write(`data: ${JSON.stringify({ payload: { id: 'evt_hm', type: 'message.updated', properties: { sessionID: STREAM_SID, info: { id: 'msg_hang', role: 'assistant', sessionID: STREAM_SID } } } })}\n\n`);
          res.write(`data: ${JSON.stringify({ payload: { id: 'evt_hd', type: 'message.part.delta', properties: { sessionID: STREAM_SID, messageID: 'msg_hang', partID: 'prt_hang', field: 'text', delta: 'partial' } } })}\n\n`);
          return; // hang: never completes until the client aborts/closes
        }
        for (const f of streamFrames()) res.write(`data: ${f}\n\n`);
        res.end();
        return;
      }
      if (req.url === `/session/${STREAM_SID}` && req.method === 'DELETE') {
        state.deleted = 'yes';
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('true');
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    return { server, state, url: `http://127.0.0.1:${port}` };
  }

  async function closeStub(server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }

  test('streams tokens in order then deletes session', async () => {
    const { server, state, url } = await startStreamStub('happy');
    const mod = await import(svcUrl(__dirname));
    const svc = new mod.OpencodeService({ baseUrl: url, password: 'pw' });
    try {
      const seen = [];
      const full = await svc.stream('hi', 'opencode/stub/model', { onToken: (t) => seen.push(t), timeoutMs: 8000 });
      assert.deepEqual(seen, ['hello', ' world']);
      assert.equal(full, 'hello world');
      assert.equal(seen.join(''), full);
      assert.match(state.auth, /^Basic /);
      assert.equal(state.deleted, 'yes');
      await tick(100);
      assert.equal(state.sseClosed, true);
    } finally {
      await closeStub(server);
    }
  });

  test('mid-stream abort delivers partial text and deletes session', async () => {
    const { server, state, url } = await startStreamStub('hang');
    const mod = await import(svcUrl(__dirname));
    const svc = new mod.OpencodeService({ baseUrl: url, password: 'pw' });
    const abort = new AbortController();
    try {
      const seen = [];
      const p = svc.stream('hi', 'opencode/stub/model', {
        onToken: (t) => { seen.push(t); abort.abort(); },
        signal: abort.signal,
        timeoutMs: 8000,
      });
      await assert.rejects(p, (e) => e != null && e.name === 'AbortError');
      assert.deepEqual(seen, ['partial']);
      assert.equal(state.deleted, 'yes');
      await tick(100);
      assert.equal(state.sseClosed, true);
    } finally {
      await closeStub(server);
    }
  });

  test('prompt_async 404 falls back (throws typed error for caller fallback)', async () => {
    const { server, state, url } = await startStreamStub('prompt404');
    const mod = await import(svcUrl(__dirname));
    const svc = new mod.OpencodeService({ baseUrl: url, password: 'pw' });
    try {
      await assert.rejects(
        svc.stream('hi', 'opencode/stub/model', { onToken: () => {}, timeoutMs: 8000 }),
        (e) => e instanceof mod.OpenCodeError && /prompt_async failed: 404/.test(e.message),
      );
      assert.equal(state.deleted, 'yes');
    } finally {
      await closeStub(server);
    }
  });
});
