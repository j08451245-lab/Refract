// electron/llm/turnSourceDecision.ts
//
// Canonical per-turn source decision (unbuilt system).
//
// The arbitrator call sites (ipcHandlers.ts:2475-2589 manual,
// :18155+ phone) are explicitly best-effort: the surrounding try/catch
// documents that ANY failure here must fall back to the legacy guard
// (never MORE permissive). These stubs therefore throw a dedicated
// NotImplementedError — identical observable behavior to the missing
// module (require-throw), until the real resolver lands. Do NOT replace
// the throw with an empty/default decision: proceeding with a fabricated
// decision would bypass the designed safe fallback.

export type EvidenceKind = string;

export interface TurnSourceAvailability {
  hasReferenceFiles: boolean;
  hasProfileFacts: boolean;
  hasJobDescription: boolean;
  hasLiveTranscript: boolean;
  hasMeetingRag: boolean;
}

export interface TurnSourceDecisionInput {
  sourceContract: unknown;
  persistedSourceAuthority: unknown;
  explicitRequest: unknown;
  explicitRequests: unknown;
  availability: TurnSourceAvailability;
}

export interface TurnSourceDecision {
  allowedEvidenceKinds: string[];
  requiredEvidenceKinds: string[];
}

export class TurnSourceNotImplementedError extends Error {
  constructor() {
    super('resolveTurnSourceDecision: canonical turn resolver not implemented (safe fallback applies)');
    this.name = 'TurnSourceNotImplementedError';
  }
}

export function resolveTurnSourceDecision(_input: TurnSourceDecisionInput): TurnSourceDecision {
  void _input;
  throw new TurnSourceNotImplementedError();
}
