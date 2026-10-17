// electron/llm/customModeExecutionContract.ts
//
// Custom-mode execution contract (unbuilt system). Same contract as
// turnSourceDecision.ts: call sites are best-effort inside try/catch with
// a documented legacy fallback, so the builders/validators throw a
// dedicated NotImplementedError — identical observable behavior to the
// missing module. logArbitratedContract is pure observability and is a
// safe no-op (logging must never break an answer path).

export interface BuildCustomModeExecutionContractInput {
  question?: string;
  streamRoute?: string;
  modeId?: string | null;
  modeUniqueId?: string | null;
  answerType?: unknown;
  isCustomMode?: boolean;
  isDocGroundedCustomModeActive?: boolean;
  hasReferenceFiles?: boolean;
  hasCustomPrompt?: boolean;
  hasLiveTranscript?: boolean;
  hasProfileFacts?: boolean;
  hasMeetingRag?: boolean;
  hasLongTermMemory?: boolean;
  persistedSourceAuthority?: unknown;
  userExplicitSource?: unknown;
  turnSourceDecision?: unknown;
}

export interface CustomModeExecutionContract {
  sourceAuthority?: string | null;
}

export interface ValidateAgainstSourceContractInput {
  contract: unknown;
  question: string;
  answer: string;
  retrievedBlock: string;
}

export interface ValidateAgainstSourceContractResult {
  ok: boolean;
}

export class CustomModeContractNotImplementedError extends Error {
  constructor() {
    super('customModeExecutionContract: contract builder not implemented (safe fallback applies)');
    this.name = 'CustomModeContractNotImplementedError';
  }
}

export function buildCustomModeExecutionContract(
  _input: BuildCustomModeExecutionContractInput,
): CustomModeExecutionContract {
  void _input;
  throw new CustomModeContractNotImplementedError();
}

export function logArbitratedContract(_contract: unknown, _message: string): void {
  void _contract;
  void _message;
}

export function validateAgainstSourceContract(
  _input: ValidateAgainstSourceContractInput,
): ValidateAgainstSourceContractResult {
  void _input;
  throw new CustomModeContractNotImplementedError();
}
