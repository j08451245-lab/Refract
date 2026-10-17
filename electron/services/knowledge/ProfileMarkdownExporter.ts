// electron/services/knowledge/ProfileMarkdownExporter.ts
//
// Profile-pack markdown bundle exporter (unbuilt system). The call site
// (knowledge:export-profile-pack) is inside a try/catch returning
// `{ success: false }` on error — so this stub throws a dedicated
// NotImplementedError, identical observable behavior to the missing
// module. Throwing (rather than an empty bundle) matters: an empty bundle
// would pass conformance vacuously and write an empty folder to Downloads.

export interface ProfileBundleInput {
  resumePack: unknown;
  jdPack: unknown;
  nowIso: string;
}

export interface ProfileBundleFile {
  path: string;
  content: string;
}

export class ProfileExportNotImplementedError extends Error {
  constructor() {
    super('exportProfileBundle: bundle exporter not implemented');
    this.name = 'ProfileExportNotImplementedError';
  }
}

export function exportProfileBundle(_input: ProfileBundleInput): ProfileBundleFile[] {
  void _input;
  throw new ProfileExportNotImplementedError();
}
