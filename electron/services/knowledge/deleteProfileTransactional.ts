// electron/services/knowledge/deleteProfileTransactional.ts
//
// Transactional profile deletion across both knowledge tiers (unbuilt
// system). Both call sites (profile delete handlers) are inside try/catch
// returning `{ success: false }` on error — so this stub throws a dedicated
// NotImplementedError, identical observable behavior to the missing module.
// Throwing (rather than a silent no-op) matters here: a no-op would report
// `{ success: true }` while PII stays on disk.

export class DeleteProfileNotImplementedError extends Error {
  constructor() {
    super('deleteProfileTransactional: transactional delete not implemented');
    this.name = 'DeleteProfileNotImplementedError';
  }
}

export function deleteProfileTransactional(
  _orchestrator: unknown,
  _docType: unknown,
  _kind: string,
): void {
  void _orchestrator;
  void _docType;
  void _kind;
  throw new DeleteProfileNotImplementedError();
}
