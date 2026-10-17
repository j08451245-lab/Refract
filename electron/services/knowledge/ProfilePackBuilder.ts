// electron/services/knowledge/ProfilePackBuilder.ts
//
// OKF profile-pack store (unbuilt system). Every call site
// (trial PII wipe, export bundle, pack inspectors, setup probe) sits
// inside a try/catch that treats failure as "pack system unavailable",
// so these stubs throw a dedicated NotImplementedError — identical
// observable behavior to the missing module. Throwing (rather than
// returning empty) matters for the PII wipe path: a silent no-op would
// report success without deleting, while the throw keeps the honest
// "wipe failed" warning.

export interface ProfilePackCard {
  id: string;
  type: string;
  title?: string;
  conceptId?: string;
  body?: string;
  confidence?: number;
  tags?: string[];
  entities?: unknown[];
  sourceQuotes: Array<{ text: string }>;
  pii?: boolean;
}

export interface ProfilePackStats {
  cardCount: number;
  entityCount: number;
}

export interface ProfilePack {
  id: string;
  modeId?: string;
  fileName: string;
  stats: ProfilePackStats;
  packVersion: string;
  updatedAt: string;
  cards: ProfilePackCard[];
}

export type ProfilePackKind = string;

export class ProfilePackNotImplementedError extends Error {
  constructor(method: string) {
    super(`ProfilePackBuilder.${method}: pack store not implemented`);
    this.name = 'ProfilePackNotImplementedError';
  }
}

class ProfilePackBuilderImpl {
  deleteAllProfilePacks(): void {
    throw new ProfilePackNotImplementedError('deleteAllProfilePacks');
  }

  getProfilePack(_kind: ProfilePackKind): ProfilePack | null {
    void _kind;
    throw new ProfilePackNotImplementedError('getProfilePack');
  }

  getAllProfilePacks(): ProfilePack[] {
    throw new ProfilePackNotImplementedError('getAllProfilePacks');
  }
}

export class ProfilePackBuilder {
  private static instance: ProfilePackBuilderImpl | null = null;

  static getInstance(): ProfilePackBuilderImpl {
    if (!ProfilePackBuilder.instance) ProfilePackBuilder.instance = new ProfilePackBuilderImpl();
    return ProfilePackBuilder.instance;
  }
}
