// electron/llm/FinalAnswerGenerationPolicy.ts
//
// Build-recovery stub (Task 2): session-write policy decider.
// Degraded default returns undefined, which every addAssistantMessage call
// site already passes through as "no policy override" (extra args are
// ignored by the session tracker at runtime). No importer is modified.

export type FinalGenerationMode = string;

// A write gate the session tracker may honor in the future. Today the
// decider always resolves undefined (= no override; the message is
// stored), and addAssistantMessage accepts-but-ignores it. Shaped (not
// unknown) so readers like `decision.blockedFromSessionTracker` typecheck.
export type SessionWriteDecision = { blockedFromSessionTracker?: boolean } | undefined;

export function decideSessionWritePolicy(args: {
  finalGenerationMode?: FinalGenerationMode;
  validationOk?: boolean;
  sourceContractHonored?: boolean;
  criticalViolations?: unknown[];
}): SessionWriteDecision {
  void args;
  return undefined;
}
