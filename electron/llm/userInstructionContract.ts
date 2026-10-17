// electron/llm/userInstructionContract.ts
//
// Registered per-mode user instructions for coding-format arbitration
// (unbuilt registry). The single call site (ipcHandlers.ts, manual-chat
// coding path) runs only when no contract was detected AND sits inside a
// try/catch documented as "best-effort; the default contract stands" —
// so the honest degraded answer is: no registered instructions, no
// constraint (null), identical observable behavior to the missing module.

import type { ExplicitCodingContract } from './codingFollowup';

export function getRegisteredUserInstructions(_modeId?: string): string[] {
  void _modeId;
  return [];
}

export function resolveCodingFormatFromInstructions(
  _instructions: string[] | null | undefined,
): ExplicitCodingContract {
  void _instructions;
  return null;
}
