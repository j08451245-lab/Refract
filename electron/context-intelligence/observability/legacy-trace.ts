// electron/context-intelligence/observability/legacy-trace.ts
//
// Legacy turn trace emission (observability only, no sink wired).
// The single call site (ipcHandlers.ts, manual-chat surface) is inside its
// own try/catch documented as "observability must never break an answer",
// so this is a safe no-op — identical observable behavior to the missing
// module (require-throw, caught).

export interface LegacyTurnScope {
  userId?: string;
}

export interface LegacyTurnRecord {
  requestId?: string;
  surface?: string;
  scope?: LegacyTurnScope;
  originalQuestion?: string;
  resolvedQuestion?: string;
  modeId?: string;
  groundingPolicy?: unknown;
  retrievalPath?: string;
  legacyPath?: string;
}

export function recordLegacyTurn(_record: LegacyTurnRecord): void {
  void _record;
}
