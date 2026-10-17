// electron/llm/cannedOpener.ts
//
// Canned-opener/tail stripping for repaired answers (unbuilt system).
// The call site (ipcHandlers.ts, manual-chat done path) is inside a
// try/catch documented as "never block done" — so the honest degraded
// answer is "nothing stripped", identical observable behavior to the
// missing module.

export interface CannedStripResult {
  stripped: string[];
  text: string;
}

export interface CannedTailResult {
  stripped: boolean;
  text: string;
}

export function stripCannedOpener(text: string): CannedStripResult {
  return { stripped: [], text };
}

export function stripCannedTail(text: string): CannedTailResult {
  return { stripped: false, text };
}
