# Agent handoff — VertigoDx hackathon sprint

If you are a delegated agent reading this file, **find the row that matches
your model and open the specific handoff for your task**.

| Your model | Read this file | Your task in one line |
|---|---|---|
| Claude **Sonnet 4.6** (or equivalent fast coder) | [`AGENT_HANDOFF_SONNET.md`](AGENT_HANDOFF_SONNET.md) | Add `model_used` + `generated_at` + `corpus_version` trazability fields end-to-end (round 4) |
| Claude **Opus 4.6 thinking** (or equivalent reasoner) | [`AGENT_HANDOFF_OPUS46.md`](AGENT_HANDOFF_OPUS46.md) | Consume `/diagnose/stream` SSE + live `PipelineProgress` animation (round 4 — the WOW round) |
| Gemini 3.1 Pro High / Sonnet 4.5 / others | — | No active task. Ask the senior reviewer. |

The two handoffs above are **file-disjoint by design**:

| Owner | Owns |
|---|---|
| Opus 4.6 | `lib/api.ts`, `components/PipelineProgress.tsx` (new), `app/demo/page.tsx`, `app/diagnose/page.tsx` |
| Sonnet 4.6 | `backend/app/schemas.py`, `backend/app/main.py`, `lib/types.ts`, `components/ResultPanel.tsx` |

If your `git status` ever shows a file owned by the other agent, **stop and report**.

---

## Universal rules

1. Read `CLAUDE.md` and `backlog.yaml` (`runtime_decisions`) before touching code.
2. Do not read or commit anything under `docs/` or `resources/`.
3. All clinical UX text in Spanish. All code / comments / commits in English.
4. No new dependencies. No `dict[str, Any]` in route signatures.
5. Push directly to `main` with Conventional Commits.
6. Stay in your lane.

---

## Senior agent (Opus 4.7) running in parallel

While you work, the senior agent is implementing:

- **#13 JSON Schema constrained decoding** — replace `format="json"` with `format=schema` in `llm.py`. Senior coordinates with your `model_used` field by exposing `MODEL_LIGHT` / `MODEL_HEAVY` constants.
- **#15 Self-Consistency for stroke cases** — N=3 inference paths + majority vote when `stroke_alert.triggered`. Adds `agreement_ratio` field to `DiagnosticResult` (compatible with your additive changes).

If you see `agreement_ratio` appear in `schemas.py` between when you read it and when you commit, that's the senior agent — your additions are still valid because Pydantic optional fields compose freely.

---

## Handoff history (most recent first)

- **2026-05-17, round 4 — the ambitious final push**: SSE+animation (Opus 4.6) + trazability triple field (Sonnet 4.6) + JSON Schema constrained decoding + Self-Consistency on stroke cases (senior). Targets the Video Pitch (30pt) + Technical Depth (30pt) rubrics directly.
- **2026-05-16, round 3**: CONTRIBUTING + SECURITY + OfflineBadge (Sonnet); `/diagnose/stream` SSE backend (Opus 4.6).
- **2026-05-16, round 2**: shared types + API helpers + onBack (Sonnet); cover SVG+PNG (Opus 4.6). Senior fixed an `onComplete` bug traced to the original Gemini shell.
- **2026-05-16, round 1**: `ResultPanel.tsx` + `/demo` page (Sonnet); `QuestionWizard.tsx` with defensive `internalStep` (Opus 4.6).
- **2026-05-16 Day 3 prep, 2026-05-15 Day 2 partial (Gemini)**: scaffolding, corpus, eval helper, landing polish.

---

## Senior-only retained tasks (post-round-4)

- `D4-T07` embed final video URL in README (once uploaded).
- `D4-T11` git tag `v1.0-hackathon`.
- Day 4 human production tasks (recording, edit, upload, submit).
