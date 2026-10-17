// electron/llm/sourceOwnership.ts
//
// Source-ownership arbitration (unbuilt system). Same contract as
// turnSourceDecision.ts: the call sites are best-effort inside try/catch
// with a documented legacy fallback, so these stubs throw a dedicated
// NotImplementedError — identical observable behavior to the missing
// module — instead of fabricating ownership answers.

export interface ResolveSourceOwnershipInput {
  question: string;
  contract: unknown;
  profileContextPolicy: unknown;
  answerType: unknown;
  hasProfileFacts: boolean;
  turnSourceDecision: unknown;
}

export interface SourceOwnershipDecision {
  owner: string;
  profileAllowed: boolean;
  explicitProfileAsk?: boolean;
  requestedSource?: string | null;
  shouldClarifyInsteadOfProfile: boolean;
  reason: string;
}

export interface SourceSwitchClarificationOptions {
  hasReferenceFiles: boolean;
}

export class SourceOwnershipNotImplementedError extends Error {
  constructor() {
    super('sourceOwnership: ownership arbiter not implemented (safe fallback applies)');
    this.name = 'SourceOwnershipNotImplementedError';
  }
}

export function resolveSourceOwnership(_input: ResolveSourceOwnershipInput): SourceOwnershipDecision {
  void _input;
  throw new SourceOwnershipNotImplementedError();
}

export function buildSourceSwitchClarification(
  _owner: string,
  _requestedSource: string | null,
  _opts: SourceSwitchClarificationOptions,
): string {
  void _owner;
  void _requestedSource;
  void _opts;
  throw new SourceOwnershipNotImplementedError();
}
