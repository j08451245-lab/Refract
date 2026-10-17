// electron/intelligence/context-os/explicitSourceSwitch.ts
//
// Explicit source-switch parsing ("according to the JD", "based only on my
// résumé") — unbuilt system. Same contract as turnSourceDecision.ts: the
// call sites are best-effort inside try/catch with a documented legacy
// fallback, so these stubs throw a dedicated NotImplementedError —
// identical observable behavior to the missing module. toLegacy* is NOT
// given a guessed mapping: inventing the taxonomy here would silently
// re-route sources, which is exactly what the fallback guards against.

export type ExplicitSourceRequest =
  | 'reference_files'
  | 'profile'
  | 'transcript'
  | 'job_description'
  | null;

export type LegacyUserExplicitSource = 'reference_files' | 'profile' | 'transcript' | null;

export class ExplicitSourceSwitchNotImplementedError extends Error {
  constructor() {
    super('explicitSourceSwitch: explicit-source parser not implemented (safe fallback applies)');
    this.name = 'ExplicitSourceSwitchNotImplementedError';
  }
}

export function resolveExplicitSourceRequest(_message: string): ExplicitSourceRequest {
  void _message;
  throw new ExplicitSourceSwitchNotImplementedError();
}

export function resolveExplicitSourceRequests(_message: string): ExplicitSourceRequest[] {
  void _message;
  throw new ExplicitSourceSwitchNotImplementedError();
}

export function toLegacyUserExplicitSource(_request: ExplicitSourceRequest): LegacyUserExplicitSource {
  void _request;
  throw new ExplicitSourceSwitchNotImplementedError();
}
