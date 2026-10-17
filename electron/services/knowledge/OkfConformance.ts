// electron/services/knowledge/OkfConformance.ts
//
// OKF bundle conformance gate (unbuilt system). The call site
// (knowledge:export-profile-pack) refuses to write non-conformant bundles
// and sits inside a try/catch returning `{ success: false }` on error —
// so this stub throws a dedicated NotImplementedError, identical
// observable behavior to the missing module. Throwing (rather than
// `{ conformant: true }`) matters: a permissive default would ship
// unvalidated bundles, inverting the fail-closed design.

export interface ConformanceResult {
  conformant: boolean;
  violations: string[];
}

export class OkfConformanceNotImplementedError extends Error {
  constructor() {
    super('checkConformance: conformance gate not implemented');
    this.name = 'OkfConformanceNotImplementedError';
  }
}

export function checkConformance(_files: Array<{ path: string; content: string }>): ConformanceResult {
  void _files;
  throw new OkfConformanceNotImplementedError();
}
