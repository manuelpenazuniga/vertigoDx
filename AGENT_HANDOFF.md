# Agent handoff — VertigoDx hackathon sprint

If you are a delegated agent reading this file, **find the row that matches
your model and open the specific handoff for your task**.

| Your model | Read this file | Your task in one line |
|---|---|---|
| Claude **Sonnet 4.6** (or equivalent fast coder) | [`AGENT_HANDOFF_SONNET.md`](AGENT_HANDOFF_SONNET.md) | Automated smoke test script in stdlib Python — 5 checks, ~60s (round 5) |
| Claude **Opus 4.6 thinking** | — | No active task. Round 4's SSE + PipelineProgress shipped. |
| Gemini 3.1 Pro High / others | — | No active task. Ask the senior reviewer. |

---

## Universal rules (apply to any delegated agent)

1. Read `CLAUDE.md` and `backlog.yaml` (`runtime_decisions`) before touching code.
2. Do not read or commit anything under `docs/` or `resources/`.
3. All clinical UX text in Spanish. All code / comments / commits in English.
4. No new dependencies. No `dict[str, Any]` in route signatures.
5. Push directly to `main` with Conventional Commits.
6. Stay in your lane.

---

## Senior-only retained tasks (post-round-5)

- `D4-T07` embed final video URL in README once uploaded.
- `D4-T11` git tag `v1.0-hackathon`.
- All Day-4 human production tasks (recording, voiceover, editing, Kaggle submit).

---

## Handoff history (most recent first)

- **2026-05-17 round 5 (now)**: Sonnet 4.6 → automated smoke test script (`scripts/smoke.py` + wrapper). Defensive infrastructure for the pre-grabación checkpoint and any same-day hotfix. Senior agent reviewed round 4 rigorously, found that self-consistency was emitting consensus metadata but not exposing it to the schema; fixed in commit `bef24f9`.
- **2026-05-17 round 4 (the WOW round)**: Sonnet shipped trazability triple (`model_used`, `generated_at`, `corpus_version`). Opus 4.6 thinking shipped SSE streaming + `PipelineProgress.tsx`. Senior shipped Self-Consistency (`#15`, Wang et al. ICLR 2023) on stroke cases.
- **2026-05-16 round 3**: CONTRIBUTING + SECURITY + OfflineBadge UX (Sonnet); `/diagnose/stream` SSE backend (Opus 4.6).
- **2026-05-16 round 2**: shared types + API helpers + onBack (Sonnet); cover image SVG + PNG (Opus 4.6). Senior fixed onComplete bug traced to original Gemini shell.
- **2026-05-16 round 1**: `ResultPanel` + `/demo` (Sonnet); `QuestionWizard` with defensive `internalStep` (Opus 4.6).
- **2026-05-16 Day 3 prep, 2026-05-15 Day 2 partial (Gemini)**: scaffolding, corpus, eval helper, landing polish.
