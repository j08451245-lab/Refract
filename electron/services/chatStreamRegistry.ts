// electron/services/chatStreamRegistry.ts
//
// Chat-stream supersession registry. REAL implementation (not a stub):
// every in-flight stream is keyed by sender id with its AbortController;
// on mode switch (or any superseding event) all entries are aborted AND
// deleted so the streamId guards (`_chatStreamsBySender.get(senderId)
// ?.streamId !== myStreamId`) can never mistake a stale stream for current
// again — the Defect G race documented at the call site. Deleting while
// iterating a Map is safe; abort() is guarded so settled streams can't throw.

export interface ChatStreamEntry {
  streamId: number;
  controller: AbortController;
}

export function abortAndInvalidateChatStreams(
  registry: Map<number, ChatStreamEntry>,
): void {
  for (const [senderId, entry] of registry) {
    try {
      entry.controller.abort();
    } catch {
      /* already settled — invalidation below still applies */
    }
    registry.delete(senderId);
  }
}
