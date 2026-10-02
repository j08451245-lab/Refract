/**
 * FactCheckChip.tsx — discreet live fact-check verdict chip (Task 3).
 *
 * Shows one verdict at a time (the host replaces, never stacks): a colored
 * dot + verdict glyph (✓/⚠/✗) + 1-line summary + source link + × button.
 * Auto-dismisses after 12s. Styling mirrors DynamicActionCard (glass chip,
 * overlay-aware translucency) so it sits naturally in the same scan path.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ClaimVerdict } from '../types/electron';

export interface FactCheckChipProps {
  verdict: ClaimVerdict;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 12_000;

const VERDICT_STYLE: Record<ClaimVerdict['verdict'], { glyph: string; dot: string; label: string }> = {
  confirmed: { glyph: '✓', dot: 'bg-emerald-400', label: 'Confirmed' },
  doubtful: { glyph: '⚠', dot: 'bg-amber-400', label: 'Uncertain' },
  refuted: { glyph: '✗', dot: 'bg-red-400', label: 'Refuted' },
};

function openSource(url: string): void {
  try {
    window.electronAPI?.openExternal?.(url);
  } catch {
    /* best-effort — a dead link must never break the overlay */
  }
}

export const FactCheckChip: React.FC<FactCheckChipProps> = ({ verdict, onDismiss }) => {
  const style = VERDICT_STYLE[verdict.verdict] ?? VERDICT_STYLE.doubtful;

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, verdict.claim]);

  return (
    <div
      className="group relative flex items-center gap-2 px-2.5 py-2 rounded-[12px] border border-white/10 bg-white/5 hover:bg-white/8 backdrop-blur-md no-drag select-none transition-colors duration-150"
      role="status"
      aria-label={`Fact check: ${style.label}`}
      data-testid="fact-check-chip"
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
        aria-hidden="true"
      />
      <span
        className="flex-1 min-w-0 truncate text-[12px] leading-tight overlay-text-primary"
        title={verdict.summary}
      >
        <span className="font-semibold mr-1" aria-hidden="true">{style.glyph}</span>
        {verdict.summary}
      </span>
      {verdict.sourced && verdict.url ? (
        <button
          type="button"
          onClick={() => openSource(verdict.url as string)}
          className="shrink-0 text-[10.5px] font-medium text-blue-300/90 hover:text-blue-200 underline underline-offset-2 transition-colors"
          title={verdict.url}
        >
          source
        </button>
      ) : (
        <span
          className="shrink-0 text-[9.5px] font-medium uppercase tracking-wide text-white/35 border border-white/10 rounded px-1 py-px"
          title="Checked without web sources"
        >
          sem fonte
        </span>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
        title="Dismiss"
        aria-label="Dismiss fact check"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

/**
 * Self-subscribing host: mounts once in the overlay, holds at most ONE
 * visible chip (a new verdict replaces the old one — never stacks/nags).
 */
export const FactCheckChipHost: React.FC = () => {
  const [verdict, setVerdict] = useState<ClaimVerdict | null>(null);
  const dismiss = useCallback(() => setVerdict(null), []);

  useEffect(() => {
    let off: (() => void) | undefined;
    try {
      off = window.electronAPI?.onClaimVerdict?.((v) => {
        if (v && typeof v.summary === 'string') setVerdict(v);
      });
    } catch {
      /* renderer without bridge (tests/storybook) — chip stays hidden */
    }
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!verdict) return null;
  return (
    <div className="px-3 pt-1 pb-1 w-full" data-testid="fact-check-host">
      <FactCheckChip verdict={verdict} onDismiss={dismiss} />
    </div>
  );
};
