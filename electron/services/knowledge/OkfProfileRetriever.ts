// electron/services/knowledge/OkfProfileRetriever.ts
//
// OKF profile-card retrieval (unbuilt system). The call site
// (ipcHandlers.ts, manual-chat profile-evidence block) is inside a
// try/catch documented as "skipped (non-fatal)", so the honest degraded
// answer is `allowed: false` — injection skipped, exactly as today.

export interface RetrieveProfileEvidenceInput {
  question: string;
  profileContextPolicy: unknown;
  documentGroundedActive: boolean;
  hasExplicitPlan: boolean;
}

export interface ProfileEvidenceResult {
  allowed: boolean;
  block: string;
  cardCount: number;
}

export function retrieveProfileEvidence(_input: RetrieveProfileEvidenceInput): ProfileEvidenceResult {
  void _input;
  return { allowed: false, block: '', cardCount: 0 };
}
