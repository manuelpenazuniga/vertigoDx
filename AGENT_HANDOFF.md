# Agent handoff — VertigoDx hackathon sprint

If you are a delegated agent reading this file, **find the row that matches
your model and open the specific handoff for your task**.

| Your model | Read this file | Your task in one line |
|---|---|---|
| Claude **Sonnet 4.6** (or equivalent fast coder) | [`AGENT_HANDOFF_SONNET.md`](AGENT_HANDOFF_SONNET.md) | Real `ResultPanel.tsx` + `/demo` page (Day 3 parallel track A) |
| Claude **Opus 4.6 thinking** (or equivalent reasoner) | [`AGENT_HANDOFF_OPUS46.md`](AGENT_HANDOFF_OPUS46.md) | Real `QuestionWizard.tsx` with framer-motion (Day 3 parallel track B) |
| Gemini 3.1 Pro High / Sonnet 4.5 / others | — | No active task assigned. Ask the senior reviewer. |

The two Day-3 handoffs above are **independent and file-disjoint** — they can
run in parallel without merge conflicts.

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

- **2026-05-16, Day 3 parallel split**: `AGENT_HANDOFF_SONNET.md` (Sonnet 4.6 → ResultPanel + /demo) and `AGENT_HANDOFF_OPUS46.md` (Opus 4.6 thinking → QuestionWizard). Senior agent (Opus 4.7) reserves deploy decision, integration QA, and all Day 4 work.
- **2026-05-16, Day 3 prep round (Gemini)**: D3-T01, D2-T02, D2-T06 partial (/demo-cases only), D3-T02 questions list, D3-T06 landing polish. Shipped in commit `6b748aa`.
- **2026-05-15, Day 2 partial (Gemini)**: D2-T01, D2-T05 RAG corpus, D2-T08 Next.js scaffold, D2-T09 landing + OfflineBadge, D2-T10 diagnose-page shell. Shipped in commit `d341f8b`.
