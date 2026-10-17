// electron/context-intelligence/retrieval/meeting-evidence.ts
//
// Meeting-evidence resolver for the Context Intelligence V3 meeting port.
// Minimal honest implementation of the documented contract: the design
// comment at the call site (ipcHandlers.ts, meeting-port V3 block) states
// the meeting port was never built and cross-meeting isolation remains the
// scope filter's job. Returning the empty evidence set is the designed
// degraded case — the call site spreads `ports` (no-op on {}) and skips an
// absent `scopeMeetingId`, then continues without meeting evidence.

export interface MeetingEvidenceInput {
  rag: unknown;
  segments: unknown;
  allowedSourceTypes: unknown;
  userId: string;
  sessionId: string;
  tokenBudget: unknown;
}

export interface MeetingEvidence {
  ports: unknown[];
  inLiveMeeting: boolean;
  scopeMeetingId?: string;
}

export function resolveMeetingEvidence(_input: MeetingEvidenceInput): MeetingEvidence {
  void _input;
  return { ports: [], inLiveMeeting: false };
}
