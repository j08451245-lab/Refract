// electron/services/OpencodeService.ts
// Local opencode sidecar client (v1 session API + HTTP Basic).
// Credentials stay in opencode; Refract only holds the per-boot sidecar password in memory.

export class OpenCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenCodeError';
  }
}

export interface OpencodeModelRef {
  provider: string;
  model: string;
  label: string;
}

export interface OpencodeServiceOptions {
  baseUrl: string;
  password: string | null;
  timeoutMs?: number;
}

export interface OpencodeStreamOptions {
  onToken: (text: string) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
}

// Probed shape of `GET /global/event` (opencode serve v1.18.27):
// framing is `data: <json>\n\n` with no `event:` lines; envelope
// `{"directory","project","payload":{...}}` (bare `{"payload":{...}}` for server events).
interface OpencodeSseMessageInfo {
  id?: string;
  role?: string;
  error?: unknown;
  time?: { completed?: number };
}

interface OpencodeSsePart {
  id?: string;
  messageID?: string;
  sessionID?: string;
  type?: string;
  text?: string;
}

interface OpencodeSseProperties {
  sessionID?: string;
  info?: OpencodeSseMessageInfo;
  part?: OpencodeSsePart;
  messageID?: string;
  partID?: string;
  field?: string;
  delta?: string;
  error?: unknown;
}

interface OpencodeSsePayload {
  id?: string;
  type?: string;
  properties?: OpencodeSseProperties;
}

function describeSseError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err !== null && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    const data = rec['data'];
    if (data !== null && typeof data === 'object') {
      const msg = (data as Record<string, unknown>)['message'];
      if (typeof msg === 'string' && msg) return msg;
    }
    const message = rec['message'];
    if (typeof message === 'string' && message) return message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'unknown session error';
  }
}

function parseModelRef(ref: string): { providerId: string; modelId: string } {
  const m = /^opencode\/([^/]+)\/(.+)$/.exec(ref.trim());
  if (!m) throw new OpenCodeError(`invalid opencode model ref: ${ref}`);
  return { providerId: m[1], modelId: m[2] };
}

export class OpencodeService {
  private readonly baseUrl: string;
  private readonly password: string | null;
  private readonly timeoutMs: number;

  constructor(opts: OpencodeServiceOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.password = opts.password;
    this.timeoutMs = opts.timeoutMs ?? 60000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.password) h['Authorization'] = `Basic ${Buffer.from(`opencode:${this.password}`).toString('base64')}`;
    return h;
  }

  private async req(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(this.timeoutMs),
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await this.req('/global/health', { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return false;
      const data = (await res.json()) as { healthy?: boolean };
      return data.healthy === true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<OpencodeModelRef[]> {
    const res = await this.req('/provider', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new OpenCodeError(`provider list failed: ${res.status}`);
    const data = (await res.json()) as {
      default?: Record<string, string>;
      connected?: string[];
    };
    const connected = new Set(data.connected ?? []);
    return Object.entries(data.default ?? {})
      .filter(([providerId]) => connected.has(providerId))
      .map(([providerId, modelId]) => ({ provider: providerId, model: modelId, label: `${providerId}/${modelId}` }));
  }

  async chat(prompt: string, modelRef: string, opts: { timeoutMs?: number } = {}): Promise<string> {
    if (!prompt.trim()) throw new OpenCodeError('prompt required');
    const { providerId, modelId } = parseModelRef(modelRef);
    if (prompt.length > 200 * 1024) throw new OpenCodeError('prompt exceeds 200 KB limit');
    const timeout = opts.timeoutMs ?? this.timeoutMs;
    const created = await this.req('/session', {
      method: 'POST',
      body: JSON.stringify({ title: 'Refract' }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!created.ok) throw new OpenCodeError(`session create failed: ${created.status}`);
    const session = (await created.json()) as { id: string };
    try {
      const replied = await this.req(`/session/${session.id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          agent: 'build',
          model: { providerID: providerId, modelID: modelId },
          parts: [{ type: 'text', text: prompt }],
        }),
        signal: AbortSignal.timeout(timeout),
      });
      if (!replied.ok) throw new OpenCodeError(`prompt failed: ${replied.status}`);
      const data = (await replied.json()) as { parts?: Array<{ type?: string; text?: string }> };
      return (data.parts ?? [])
        .filter((p) => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text as string)
        .join('\n');
    } finally {
      await this.req(`/session/${session.id}`, { method: 'DELETE', signal: AbortSignal.timeout(5000) }).catch((): void => undefined);
    }
  }

  // Token-by-token streaming over `GET /global/event` (probed on serve v1.18.27).
  // Assistant text arrives ONLY as `message.part.delta` events
  // (properties: {sessionID, messageID, partID, field: "text", delta}); the user-echo and every
  // other state event arrive as `.updated` events, each duplicated by a `sync` wrapper with the
  // same event id. Completion is `session.idle` (primary) or an assistant `message.updated`
  // carrying `time.completed` (fallback); `session.status` flaps busy/idle mid-stream and is
  // never a completion signal. Resolves the fully assembled text.
  // Errors: OpenCodeError for session/prompt/SSE failures (caller may fall back to blocking
  // chat); caller abort and timeout propagate as AbortError/TimeoutError, never OpenCodeError.
  async stream(prompt: string, modelRef: string, opts: OpencodeStreamOptions): Promise<string> {
    if (!prompt.trim()) throw new OpenCodeError('prompt required');
    if (prompt.length > 200 * 1024) throw new OpenCodeError('prompt exceeds 200 KB limit');
    if (typeof opts.onToken !== 'function') throw new OpenCodeError('onToken required');
    const { providerId, modelId } = parseModelRef(modelRef);
    opts.signal?.throwIfAborted();
    const timeout = opts.timeoutMs ?? this.timeoutMs;
    const created = await this.req('/session', {
      method: 'POST',
      body: JSON.stringify({ title: 'Refract' }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!created.ok) throw new OpenCodeError(`session create failed: ${created.status}`);
    const session = (await created.json()) as { id: string };
    const sessionId = session.id;

    const ctrl = new AbortController();
    const timeoutSignal = AbortSignal.timeout(timeout);
    const onTimeout = (): void => ctrl.abort(timeoutSignal.reason);
    const onUserAbort = (): void => ctrl.abort(opts.signal?.reason);
    timeoutSignal.addEventListener('abort', onTimeout, { once: true });
    opts.signal?.addEventListener('abort', onUserAbort, { once: true });
    if (opts.signal?.aborted) onUserAbort();

    const sseCtrl = new AbortController();
    const onCtrlAbort = (): void => sseCtrl.abort(ctrl.signal.reason);
    ctrl.signal.addEventListener('abort', onCtrlAbort, { once: true });

    const assistantMessages = new Set<string>();
    const seenEventIds = new Set<string>();
    const partDeltas = new Map<string, string[]>();
    const partSnapshots = new Map<string, string>();
    const partOrder: string[] = [];
    let failure: string | null = null;
    let done = false;

    const handleEvent = (evt: unknown): void => {
      if (done || evt === null || typeof evt !== 'object') return;
      const payload = (evt as { payload?: OpencodeSsePayload }).payload;
      if (!payload || typeof payload !== 'object') return;
      // `sync` wrappers duplicate .updated events with the same id: ignore them outright.
      if (payload.type === 'sync') return;
      if (typeof payload.id === 'string') {
        if (seenEventIds.has(payload.id)) return;
        seenEventIds.add(payload.id);
      }
      const props = payload.properties;
      if (!props || typeof props !== 'object' || props.sessionID !== sessionId) return;
      switch (payload.type) {
        case 'message.updated': {
          const info = props.info;
          if (!info || info.role !== 'assistant' || typeof info.id !== 'string') return;
          assistantMessages.add(info.id);
          if (info.error !== undefined && info.error !== null) {
            failure = describeSseError(info.error);
            done = true;
          } else if (info.time && typeof info.time.completed === 'number') {
            done = true;
          }
          return;
        }
        case 'message.part.delta': {
          if (props.field !== 'text' || typeof props.delta !== 'string' || props.delta === '') return;
          if (typeof props.messageID !== 'string' || !assistantMessages.has(props.messageID)) return;
          const key = typeof props.partID === 'string' ? props.partID : props.messageID;
          let chunks = partDeltas.get(key);
          if (!chunks) {
            chunks = [];
            partDeltas.set(key, chunks);
            if (!partOrder.includes(key)) partOrder.push(key);
          }
          chunks.push(props.delta);
          opts.onToken(props.delta);
          return;
        }
        case 'message.part.updated': {
          const part = props.part;
          if (!part || part.type !== 'text' || typeof part.text !== 'string') return;
          if (typeof part.messageID !== 'string' || !assistantMessages.has(part.messageID)) return;
          const key = typeof part.id === 'string' ? part.id : part.messageID;
          partSnapshots.set(key, part.text);
          if (!partDeltas.has(key) && !partOrder.includes(key)) partOrder.push(key);
          return;
        }
        case 'session.idle': {
          done = true;
          return;
        }
        case 'session.error': {
          throw new OpenCodeError(`opencode session error: ${describeSseError(props.error)}`);
        }
        default:
          return;
      }
    };

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      // Open SSE BEFORE prompt_async so no event is missed.
      const sseRes = await this.req('/global/event', {
        headers: { Accept: 'text/event-stream' },
        signal: sseCtrl.signal,
      });
      if (!sseRes.ok || !sseRes.body) throw new OpenCodeError(`event stream failed: ${sseRes.status}`);
      reader = sseRes.body.getReader();

      const prompted = await this.req(`/session/${sessionId}/prompt_async`, {
        method: 'POST',
        body: JSON.stringify({
          agent: 'build',
          model: { providerID: providerId, modelID: modelId },
          parts: [{ type: 'text', text: prompt }],
        }),
        signal: AbortSignal.timeout(timeout),
      });
      if (!prompted.ok) throw new OpenCodeError(`prompt_async failed: ${prompted.status}`);

      const decoder = new TextDecoder();
      let buf = '';
      let dataLines: string[] = [];
      const flushFrame = (): void => {
        if (dataLines.length === 0) return;
        const text = dataLines.join('\n');
        dataLines = [];
        if (!text) return;
        let evt: unknown;
        try {
          evt = JSON.parse(text) as unknown;
        } catch {
          return;
        }
        handleEvent(evt);
      };
      for (;;) {
        const read = await reader.read();
        if (read.done) break;
        buf += decoder.decode(read.value, { stream: true });
        let nl = buf.indexOf('\n');
        while (nl >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, '');
          buf = buf.slice(nl + 1);
          if (line === '') flushFrame();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
          if (done) break;
          nl = buf.indexOf('\n');
        }
        if (done) break;
      }
      flushFrame();
      if (failure !== null) throw new OpenCodeError(`opencode session error: ${failure}`);
      if (!done) throw new OpenCodeError('event stream closed before completion');
      // Deltas are authoritative; a snapshot covers parts that completed without deltas.
      return partOrder
        .map((key) => {
          const chunks = partDeltas.get(key);
          if (chunks && chunks.length > 0) return chunks.join('');
          return partSnapshots.get(key) ?? '';
        })
        .join('');
    } finally {
      timeoutSignal.removeEventListener('abort', onTimeout);
      opts.signal?.removeEventListener('abort', onUserAbort);
      ctrl.signal.removeEventListener('abort', onCtrlAbort);
      try {
        await reader?.cancel();
      } catch {
        /* already closed */
      }
      sseCtrl.abort();
      await this.req(`/session/${sessionId}`, { method: 'DELETE', signal: AbortSignal.timeout(5000) }).catch((): void => undefined);
    }
  }
}
