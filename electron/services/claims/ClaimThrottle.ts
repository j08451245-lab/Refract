/**
 * ClaimThrottle — per-meeting gate for live fact-check (Task 3).
 *
 * Pure (no I/O, no network): at most 1 check per 20s, each normalized claim
 * text is checked at most once per meeting, and a meeting never exceeds 20
 * checks. Reset on every startMeeting so the cap is per-meeting, not per-run.
 */

export const CLAIM_THROTTLE_COOLDOWN_MS = 20_000;
export const CLAIM_THROTTLE_MAX_CHECKS = 20;

/** Score at/above which a mic transcript counts as a checkable claim. */
export const CLAIM_SCORE_THRESHOLD = 0.7;

/**
 * Canonical form for dedupe: case-insensitive, single-spaced, capped length.
 * The mic hook normalizes BEFORE allow() so "LIVE" and "live " hit one entry.
 */
export function normalizeClaim(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export class ClaimThrottle {
  private lastCheckAt = 0;
  private checks = 0;
  private readonly seen = new Set<string>();

  /**
   * Returns true when this (already normalized) claim may be verified now,
   * consuming one check + the cooldown window. Pure except the clock, which
   * tests inject via `now`.
   */
  public allow(normalized: string, now: number = Date.now()): boolean {
    const key = String(normalized ?? '');
    if (!key) return false;
    if (this.checks >= CLAIM_THROTTLE_MAX_CHECKS) return false;
    if (this.seen.has(key)) return false;
    if (now - this.lastCheckAt < CLAIM_THROTTLE_COOLDOWN_MS) return false;
    this.lastCheckAt = now;
    this.seen.add(key);
    this.checks += 1;
    return true;
  }

  public reset(): void {
    this.lastCheckAt = 0;
    this.checks = 0;
    this.seen.clear();
  }
}
