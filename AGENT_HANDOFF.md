# Agent handoff — VertigoDx hackathon sprint

If you are a delegated agent reading this file, **find the row that matches
your model and open the specific handoff for your task**.

| Your model | Read this file | Your task in one line |
|---|---|---|
| Claude **Sonnet 4.6** (or equivalent fast coder) | [`AGENT_HANDOFF_SONNET.md`](AGENT_HANDOFF_SONNET.md) | `CONTRIBUTING.md` + `SECURITY.md` + `OfflineBadge` retry-on-visibility (round 3) |
| Claude **Opus 4.6 thinking** (or equivalent reasoner) | [`AGENT_HANDOFF_OPUS46.md`](AGENT_HANDOFF_OPUS46.md) | `/diagnose/stream` SSE endpoint in `backend/app/main.py` (round 3) |
| Gemini 3.1 Pro High / Sonnet 4.5 / others | — | No active task assigned. Ask the senior reviewer. |

The two handoffs above are **file-disjoint** — they can run in parallel without merge conflicts.

---

## Universal rules (apply to any delegated agent)

1. Read `CLAUDE.md` and `backlog.yaml` (with its `runtime_decisions` block) before touching code.
2. Do not read or commit anything under `docs/` or `resources/` — gitignored on purpose.
3. All clinical UX text in Spanish. All code / comments / commits in English.
4. No new dependencies. No `dict[str, Any]` in route signatures.
5. Push directly to `main` with Conventional Commits.
6. Stay in your lane. Each handoff lists exactly which files you own and which are forbidden.
7. When stopping for help, report: which task, which command failed, exact stderr, what you were about to try.

---

## Handoff history (most recent first)

- **2026-05-16, round 3 (now)**: `AGENT_HANDOFF_SONNET.md` (Sonnet 4.6 → CONTRIBUTING + SECURITY docs + OfflineBadge UX polish). `AGENT_HANDOFF_OPUS46.md` (Opus 4.6 thinking → SSE streaming endpoint with autoscaler-aware `model_loading` event). Senior agent (Opus 4.7) drafts D4-T09 Kaggle writeup in parallel.
- **2026-05-16, round 2**: Sonnet 4.6 shipped shared types + API helpers + onBack wiring (commits `d669aea`, `3ea9232`). Opus 4.6 thinking shipped cover image SVG + PNG (commit `6240af0`). Senior caught a preserved-from-Gemini `onComplete` bug in `/diagnose` and fixed it in commit `d2ff019`; also removed a `lib/` gitignore false-positive that had been hiding `frontend/lib/utils.ts` (commit `16072d0`).
- **2026-05-16, round 1**: Sonnet 4.6 shipped real `ResultPanel.tsx` + `/demo` page (commits `60fcc10`, `d31692b`). Opus 4.6 thinking shipped real `QuestionWizard.tsx` with defensive `internalStep` state (commit `9d1e408`).
- **2026-05-16, Day 3 prep (Gemini)**: D3-T01, D2-T02, D2-T06 partial (/demo-cases), D3-T02 questions list, D3-T06 landing polish (commit `6b748aa`).
- **2026-05-15, Day 2 partial (Gemini)**: D2-T01, D2-T05 RAG corpus, D2-T08 Next.js scaffold, D2-T09 landing + OfflineBadge, D2-T10 diagnose-page shell (commit `d341f8b`).

---

## Senior-only retained tasks

- `D4-T09` Kaggle writeup (1500 words, Impact Track Health & Sciences) — drafted by Opus 4.7 in parallel with this round.
- `D2-T04` `SYSTEM_PROMPT_V3` few-shot examples — only triggered if V2 shows clinical regressions.
- All human-only Day 4 tasks: recording, voiceover, editing, YouTube upload, Kaggle submit.
