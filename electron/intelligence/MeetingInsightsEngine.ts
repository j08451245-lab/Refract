// electron/intelligence/MeetingInsightsEngine.ts
//
// Deterministic post-meeting analytics. Pure, no-LLM, no-IO, never throws
// (every sub-computation is guarded and falls back to a safe default).
// Complements MeetingMemoryV2 (extracts WHAT was discussed) with HOW the
// meeting went: talk-time balance, engagement sub-scores, question stats,
// keywords, pace, silence dynamics and key moments. Persisted by
// MeetingPersistence under summaryData.meetingInsights (schemaVersion 1,
// additive key — backward compatible, no DB migration).

import type { MeetingTranscriptSegment } from './MeetingMemoryService';

export interface InsightsSegmentInput {
  speaker?: string;
  text?: string;
  timestamp?: number;
}

export interface ComputeInsightsInput {
  meetingId?: string;
  segments?: InsightsSegmentInput[] | null;
  durationMs?: number | null;
  mode?: string | null;
}

export interface InsightsSpeakerStat {
  speaker: string;
  role: 'user' | 'other';
  turns: number;
  words: number;
  estMs: number;
  share: number;
  wpm: number;
}

export interface InsightsKeyword {
  word: string;
  count: number;
}

export interface InsightsReport {
  schemaVersion: 1;
  computedAt: number;
  meetingId: string | null;
  mode: string | null;
  durationMs: number;
  turns: number;
  usableTurns: number;
  talkTime: {
    totalWords: number;
    balance: number;
    bySpeaker: InsightsSpeakerStat[];
  };
  engagement: {
    score: number;
    grade: 'limited-data' | 'needs-work' | 'good' | 'great';
    subscores: {
      participation: number;
      interaction: number;
      depth: number;
      flow: number;
      focus: number;
    };
  };
  questions: {
    total: number;
    user: number;
    other: number;
    counterQuestionShare: number;
    per10Min: number;
  };
  keywords: {
    unigrams: InsightsKeyword[];
    bigrams: InsightsKeyword[];
  };
  pace: { overallWpm: number };
  dynamics: { longestSilenceMs: number; openingQuestions: number; closingQuestions: number };
  keyMoments: {
    firstQuestionAtMs: number | null;
    firstDecisionAtMs: number | null;
    firstActionAtMs: number | null;
    firstRiskAtMs: number | null;
  };
}

const USER_SPEAKER_ALIASES = new Set([
  'you', 'eu', 'user', 'me', 'microphone', 'mic', 'candidate', 'self', 'your microphone', 'own voice',
]);

const MIN_SEGMENT_DURATION_CAP_MS = 45_000;
const DEFAULT_SEGMENT_DURATION_MS = 8_000;
const MAX_SPEAKERS_LISTED = 12;
const MAX_KEYWORDS = 12;
const MAX_BIGRAMS = 8;

// Minimal EN + PT stop list — TF ranking does the heavy lifting.
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'have', 'has', 'had', 'was', 'were', 'are',
  'you', 'your', 'our', 'out', 'but', 'not', 'can', 'could', 'would', 'should', 'will',
  'they', 'them', 'there', 'here', 'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'from', 'into', 'about', 'over', 'just', 'like', 'know', 'think', 'yeah', 'okay', 'right',
  'want', 'need', 'make', 'made', 'let', 'get', 'got', 'going', 'really', 'very', 'much',
  'some', 'than', 'then', 'these', 'those', 'been', 'being', 'also', 'its', "it's",
  "don't", "didn't", "i'm", "we're", "that's", "you're", 'him', 'her', 'his', 'she',
  'que', 'de', 'para', 'não', 'nao', 'uma', 'em', 'por', 'com', 'do', 'da', 'dos', 'das',
  'no', 'na', 'nos', 'nas', 'se', 'mais', 'mas', 'até', 'então', 'meu', 'minha', 'você',
  'voce', 'isso', 'esse', 'essa', 'aqui', 'sobre', 'porque', 'muito', 'tudo', 'ser',
]);

const QUESTION_RE = /\?|\b(what|who|when|where|why|how|can|could|would|should|is|are|do|does|did|tell me about)\b/i;
const DECISION_RE = /\b(decided|agreed|confirmed|approved|let'?s go with|we'?ll do|going with|we will)\b/i;
const ACTION_RE = /\b(will|going to|need to|have to|must|action item|to[- ]?do|follow[- ]?up)\b/i;
const RISK_RE = /\b(risk|blocker|blocked by|concern(?:ed)?|over budget|behind schedule|won'?t (?:make|hit))\b/i;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

function roleForSpeaker(speaker: string | undefined): 'user' | 'other' {
  const s = (speaker || '').trim().toLowerCase();
  if (!s) return 'other';
  return USER_SPEAKER_ALIASES.has(s) ? 'user' : 'other';
}

function safeTimestamp(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function estimateSegmentDurations(segments: InsightsSegmentInput[]): { perSegment: number[]; usesTimestamps: boolean } {
  const perSegment: number[] = [];
  let usable = 0;
  for (let i = 0; i < segments.length; i++) {
    const t = safeTimestamp(segments[i]?.timestamp);
    const next = safeTimestamp(segments[i + 1]?.timestamp);
    if (t === null || next === null || next <= t) {
      perSegment.push(DEFAULT_SEGMENT_DURATION_MS);
      continue;
    }
    perSegment.push(Math.max(500, Math.min(next - t, MIN_SEGMENT_DURATION_CAP_MS)));
    usable++;
  }
  const usesTimestamps = segments.length > 0 && usable / segments.length >= 0.5;
  if (!usesTimestamps) for (let i = 0; i < perSegment.length; i++) perSegment[i] = DEFAULT_SEGMENT_DURATION_MS;
  return { perSegment, usesTimestamps };
}

function tokenize(text: string): string[] {
  try {
    return (text || '').toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  } catch {
    return (text || '').toLowerCase().split(/\W+/).filter(Boolean);
  }
}

export function emptyInsightsReport(): InsightsReport {
  return {
    schemaVersion: 1,
    computedAt: Date.now(),
    meetingId: null,
    mode: null,
    durationMs: 0,
    turns: 0,
    usableTurns: 0,
    talkTime: { totalWords: 0, balance: 0, bySpeaker: [] },
    engagement: {
      score: 0,
      grade: 'limited-data',
      subscores: { participation: 0, interaction: 0, depth: 0, flow: 0, focus: 0 },
    },
    questions: { total: 0, user: 0, other: 0, counterQuestionShare: 0, per10Min: 0 },
    keywords: { unigrams: [], bigrams: [] },
    pace: { overallWpm: 0 },
    dynamics: { longestSilenceMs: 0, openingQuestions: 0, closingQuestions: 0 },
    keyMoments: { firstQuestionAtMs: null, firstDecisionAtMs: null, firstActionAtMs: null, firstRiskAtMs: null },
  };
}

export class MeetingInsightsEngine {
  compute(input: ComputeInsightsInput): InsightsReport {
    let report = emptyInsightsReport();
    try {
      const segments = Array.isArray(input?.segments) ? input.segments.filter(Boolean) : [];
      const durationMsRaw = input?.durationMs;
      const durationMs = Math.max(0, Math.min(typeof durationMsRaw === 'number' && Number.isFinite(durationMsRaw) ? durationMsRaw : 0, 24 * 60 * 60 * 1000));

      report.meetingId = typeof input?.meetingId === 'string' ? input.meetingId : null;
      report.mode = typeof input?.mode === 'string' ? input.mode : null;
      report.durationMs = durationMs;
      report.turns = segments.length;
      if (segments.length === 0) return report;

      const { perSegment, usesTimestamps } = estimateSegmentDurations(segments);
      const perSpeaker = new Map<string, { stat: InsightsSpeakerStat; segmentMs: number[] }>();
      const wordCounts = new Map<string, number>();
      const bigramCounts = new Map<string, number>();
      let firstQuestionAtMs: number | null = null;
      let firstDecisionAtMs: number | null = null;
      let firstActionAtMs: number | null = null;
      let firstRiskAtMs: number | null = null;
      let decisionFound = false;
      let actionFound = false;
      let riskFound = false;

      const t0 = usesTimestamps ? (safeTimestamp(segments[0]?.timestamp) ?? 0) : 0;
      let longestSilenceMs = 0;
      let prevEnd: number | null = null;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const rawText = (seg?.text || '').trim();
        if (!rawText) continue;
        report.usableTurns++;

        const role = roleForSpeaker(seg?.speaker);
        const speakerKey = (seg?.speaker || '').trim() || 'speaker';
        if (!perSpeaker.has(speakerKey)) {
          perSpeaker.set(speakerKey, {
            stat: { speaker: speakerKey, role, turns: 0, words: 0, estMs: 0, share: 0, wpm: 0 },
            segmentMs: [],
          });
        }
        const entry = perSpeaker.get(speakerKey)!;
        const segMs = perSegment[i];
        entry.stat.turns++;
        entry.segmentMs.push(segMs);

        const tokens = tokenize(rawText);
        entry.stat.words += tokens.length;
        report.talkTime.totalWords += tokens.length;

        const isQuestion = QUESTION_RE.test(rawText);
        if (isQuestion) {
          report.questions.total++;
          if (role === 'user') report.questions.user++;
          else report.questions.other++;
        }
        if (!decisionFound && DECISION_RE.test(rawText)) decisionFound = true;
        if (!actionFound && ACTION_RE.test(rawText)) actionFound = true;
        if (!riskFound && RISK_RE.test(rawText)) riskFound = true;

        const relTs = safeTimestamp(seg?.timestamp);
        const relMs = usesTimestamps ? Math.max(0, (relTs ?? t0) - t0) : null;
        if (relMs !== null) {
          const atMs = Math.round(relMs);
          if (prevEnd !== null) {
            const gap = relMs - prevEnd;
            if (gap > longestSilenceMs) longestSilenceMs = Math.min(gap, 30 * 60_000);
          }
          prevEnd = relMs + segMs;

          if (isQuestion && firstQuestionAtMs === null) firstQuestionAtMs = atMs;
          if (decisionFound && firstDecisionAtMs === null) firstDecisionAtMs = atMs;
          if (actionFound && firstActionAtMs === null) firstActionAtMs = atMs;
          if (riskFound && firstRiskAtMs === null) firstRiskAtMs = atMs;

          const halfWindow = Math.min(10 * 60_000, 0.25 * Math.max(1, durationMs));
          if (isQuestion && relMs <= halfWindow) report.dynamics.openingQuestions++;
          if (isQuestion && durationMs > 0 && relMs >= durationMs - halfWindow) report.dynamics.closingQuestions++;
        }

        // Keywords (unigrams + bigrams), stop-word filtered.
        for (const w of tokens) {
          if (STOP_WORDS.has(w) || w.length < 3) continue;
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        }
        let prevTok: string | null = null;
        for (const w of tokens) {
          if (prevTok && !STOP_WORDS.has(prevTok) && !STOP_WORDS.has(w) && prevTok.length >= 3 && w.length >= 3) {
            const phrase = `${prevTok} ${w}`;
            bigramCounts.set(phrase, (bigramCounts.get(phrase) || 0) + 1);
          }
          prevTok = w;
        }
      }

      // Talk-time per speaker from estimated segments; share of the est. total.
      let totalEstMs = 0;
      for (const entry of perSpeaker.values()) {
        entry.stat.estMs = entry.segmentMs.reduce((a, b) => a + b, 0);
        totalEstMs += entry.stat.estMs;
      }
      let topShare = 1;
      if (totalEstMs > 0) {
        topShare = 0;
        for (const entry of perSpeaker.values()) {
          entry.stat.share = entry.stat.estMs / totalEstMs;
          if (entry.stat.share > topShare) topShare = entry.stat.share;
        }
      }
      report.talkTime.bySpeaker = [...perSpeaker.values()]
        .sort((a, b) => b.stat.estMs - a.stat.estMs)
        .slice(0, MAX_SPEAKERS_LISTED)
        .map((entry) => {
          const s = entry.stat;
          const minutes = s.estMs / 60_000;
          s.wpm = minutes > 0.05 ? Math.round(s.words / minutes) : 0;
          s.share = Math.round(s.share * 100) / 100;
          return s;
        });
      report.talkTime.balance = clamp01(1 - Math.max(0, topShare - 0.35) / 0.65);

      if (usesTimestamps) {
        report.dynamics.longestSilenceMs = Math.round(longestSilenceMs);
      }
      report.keyMoments = {
        firstQuestionAtMs: firstQuestionAtMs ?? null,
        firstDecisionAtMs: firstDecisionAtMs ?? null,
        firstActionAtMs: firstActionAtMs ?? null,
        firstRiskAtMs: firstRiskAtMs ?? null,
      };

      const toKeywordList = (m: Map<string, number>, cap: number, minCount: number): InsightsKeyword[] =>
        [...m.entries()]
          .filter(([, c]) => c >= minCount)
          .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
          .slice(0, cap)
          .map(([word, count]) => ({ word, count }));
      report.keywords.unigrams = toKeywordList(wordCounts, MAX_KEYWORDS, 2);
      report.keywords.bigrams = toKeywordList(bigramCounts, MAX_BIGRAMS, 2);

      // Pace: overall words per meeting minute (falls back to segment-estimated time).
      const paceMinutes = durationMs >= 60_000 ? durationMs / 60_000 : Math.max(1, totalEstMs) / 60_000;
      report.pace.overallWpm = Math.round(report.talkTime.totalWords / Math.max(0.01, paceMinutes));

      // Engagement sub-scores (all 0..1, deterministic).
      const subs = report.engagement.subscores;
      subs.participation = perSpeaker.size >= 2 ? report.talkTime.balance : 0.4;
      const avgWordsPerTurn = report.usableTurns > 0 ? report.talkTime.totalWords / report.usableTurns : 0;
      subs.depth = clamp01(avgWordsPerTurn / 26);
      const minutes = Math.max(durationMs, totalEstMs) / 60_000;
      const turnsPerMin = minutes > 0 ? report.usableTurns / minutes : 0;
      subs.flow = clamp01(1 - Math.abs(turnsPerMin - 8) / 8);
      const focusDen = Math.max(60_000, durationMs || totalEstMs);
      subs.focus = clamp01(1 - (report.dynamics.longestSilenceMs / focusDen) * 2.5);
      const counterShare = report.questions.total > 0 ? clamp01(report.questions.user / report.questions.total) : 0;
      report.questions.counterQuestionShare = Math.round(counterShare * 100) / 100;
      report.questions.per10Min = minutes > 0 ? Math.round((report.questions.total / Math.max(1, minutes)) * 100) / 10 : 0;
      subs.interaction = clamp01(0.55 * counterShare + 0.45 * clamp01(report.questions.per10Min / 8));

      const weighted =
        0.30 * subs.participation +
        0.25 * subs.depth +
        0.20 * subs.interaction +
        0.15 * subs.flow +
        0.10 * subs.focus;
      report.engagement.score = Math.round(weighted * 100);
      const thinData = report.usableTurns < 4 || (durationMs < 45_000 && totalEstMs < 45_000);
      if (thinData) report.engagement.grade = 'limited-data';
      else if (report.engagement.score >= 70) report.engagement.grade = 'great';
      else if (report.engagement.score >= 45) report.engagement.grade = 'good';
      else report.engagement.grade = 'needs-work';

      return report;
    } catch {
      return { ...emptyInsightsReport(), meetingId: typeof input?.meetingId === 'string' ? input.meetingId : null };
    }
  }
}

export type { MeetingTranscriptSegment };
