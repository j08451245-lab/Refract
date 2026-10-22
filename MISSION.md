# MISSION.md — Worklog & backlog

Persistent memory for autonomous cycles. Read this first, update it last.
Format: newest cycle at the top of "Done". Keep it honest — no claimed work.

Last updated: 2026-10-22 (night cycle, after autonomy setup)

---

## Done (most recent first)

### 2026-10-22 — autonomy setup + first backlog items

- `docs(agents)`: `AGENTS.md` (operating agreement; gitignored by repo policy —
  lives locally) + `MISSION.md` (this worklog) committed.
- `b569589` feat(usage): budget guard now reaches the user — stable dedupe key
  (`budgetAdvisoryKey`) + one silent native Notification per month/threshold
  per run; console line kept. Warn-only. 4 new tests (17 total in the file).
  Also dropped dead `budgetCacheKey` field. Backlog items 1 and 3 done.
- `955deff` docs(readme): What's new (insights, AI usage guard, safe copy).
- `7c24330` feat(usage): AI usage card refreshes on `onMeetingsUpdated`.
- `cd5f8f6` feat(insights): transcript coverage line when usableTurns < turns.
- `e8fd81d` feat(privacy): CNPJ detector (mod-11 DV) in safe copy, masked + bare,
  invalid patterns survive. 15 tests in the file.

### 2026-10-22 — overnight: 3 features (all pushed to `application/main`)

- `583ae89` chore(build): NSIS per-machine installs (`perMachine: true`).
- `a68c979` feat(privacy): **ExportRedactionShield** — pure, never-throws
  redaction of validated PII (email, phone, CPF mod-11, card Luhn) and live
  secrets (OpenAI/GitHub/AWS/Google/Slack/GitLab keys, JWT, bearer). IPC
  `privacy:redact-text` / `privacy:analyze-text` (counts only). MeetingDetails
  "Safe copy" button (fail-closed). 14 tests.
- `1aaa7d0` feat(usage): **UsageLedger** — per-stream estimated token counts
  (chars/4) from the single `LLMHelper.streamChat` funnel; JSONL store with
  rotation + corruption tolerance; monthly budget guard (warn-only). IPC
  `usage-ledger:*`. Settings → Intelligence → "AI usage" card. 13 tests.
- `8e5b1d8` feat(insights): **MeetingInsightsEngine** — deterministic post-
  meeting analytics (talk-time, engagement 0–100 + 5 subscores, questions,
  keywords, pace, silence dynamics, key moments). Persisted at
  `summary_json.detailedSummary.meetingInsights` (additive, no flag, no
  migration). Backfill via `DatabaseManager.backfillMeetingInsights` + IPC.
  MeetingDetails "Insights" tab. 15 tests.
- `9125f09` fix(intelligence): deflake HindsightMemory drain tests (polling).

Suite status at end of cycle: intelligence 550 (541 pass / 9 todo),
llm 2315 (2297 pass), renderer 156/156, typecheck 0, vite + esbuild OK.

### 2026-10-21 — presentation-ready repo

- Launch film v5 in README (GIF preview + links; GitHub strips `<video>` tags).
- Overlay showcase section (`assets/overlay-preview.png`).
- Electron binary restored; 2.9.0 installer built (per-machine) and installed.

---

## In progress

- Nothing half-finished. Everything committed and pushed.

## Next (ordered backlog)

1. **Screenshots for the new features** (needs the app running with real data —
   do this interactively with the user, not headless): Insights tab, AI usage
   card, Safe copy notice. Then wire into README "What's new".
2. **Insights trends across meetings:** a small "last 5 meetings" engagement
   sparkline in Launcher, computed from persisted `meetingInsights` (pure
   helper + test). Bigger item; design first.
3. **Safe copy preview count in the button** (e.g. "Safe copy (3)") using the
   existing `privacy:analyze-text` channel, debounced on panel open.
4. **origin fork sync** — waiting on user decision. Do not touch.

## Decisions log

- 2026-10-22: Features are additive and flag-free by default; no new
  intelligence flags (avoids touching the 3 pinned flag tests).
- 2026-10-22: Usage analytics store counts only (never text). Estimated tokens
  (chars/4) are labeled "est." in UI — never presented as billing truth.
- 2026-10-22: Redaction is fail-closed (if IPC fails, nothing is copied).
- 2026-10-22: `ProfileIntelligenceIcon.tsx` (untracked, broken `import react
  from 'refract'`, unused) was moved out of the repo to
  `%TEMP%\opencode\ProfileIntelligenceIcon.tsx.bak` because it broke `tsc`.
- 2026-10-21: README videos → animated GIF preview + links (GitHub sanitizer
  strips `<video>`).
- 2026-10-21: NSIS installer switched to per-machine Program Files.

## Known environment constraints

- `better-sqlite3` ABI mismatch under plain node: DB paths untestable headless.
  Keep logic in pure modules (see `MeetingInsightsEngine`, `UsageLedger`,
  `ExportRedaction` as the pattern).
- Visual UI cannot be verified headlessly; verify via `npm run build` (tsc +
  vite) and, when the user is around, an isolated-profile dev run.
- Windows timers have ~15 ms granularity: use polling in timing tests.
- `npm run build` wipes `dist-electron/` (clean step) — run `build:electron`
  afterwards before launching the app.
