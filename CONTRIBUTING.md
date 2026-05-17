# Contributing to VertigoDx

VertigoDx is an active project. It started as a hackathon MVP, but the
production roadmap (12-month timeline, clinical validation, regulatory
clearance) is real. We welcome contributions that move us in that direction.

This document is short on purpose. If something is unclear, open an issue.

---

## What we need

| Skill set | Where to start |
|---|---|
| **Otoneurology / vestibular medicine** | Review `backend/app/data/icvd_corpus.md` and the ICVD rule logic in `backend/app/rules.py`. Open issues with corrections or expansions. |
| **Latin American primary care** | Country-specific adaptation of the questionnaire (`frontend/lib/questions.ts`) and clinical reasoning style. |
| **Frontend (React / Next.js / shadcn)** | UI polish, accessibility (WCAG 2.1 AA), additional demo cases, mobile-responsive testing. |
| **Backend (FastAPI / Pydantic / Ollama)** | Streaming endpoints, function-calling refactor, additional pathologies (we ship 4 of 15 ICVD-defined). |
| **Translation** | Portuguese (Brazilian primary care), Quechua, Mapudungun, English (for global expansion). |
| **Documentation** | Tutorials, case studies, clinician onboarding. |

---

## Before you start

1. Read [`README.md`](README.md) end-to-end. It is the source of truth for what the project does and why.
2. Read [`CLAUDE.md`](CLAUDE.md). It contains the architectural invariants that any change must respect (Spanish-first UX, English-only code, 100% local execution, deterministic-before-probabilistic, etc.).
3. Open an issue describing what you want to change **before** writing code. We will save you time.

---

## Development setup

See the [Quickstart section of `README.md`](README.md#quickstart-60-seconds). Briefly:

```bash
brew install ollama
brew services start ollama
ollama pull gemma4:e4b
ollama pull gemma4:26b-a4b-it-q4_K_M
ollama pull nomic-embed-text

cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --port 8000

cd ../frontend
npm install
npm run dev
```

---

## Style guide

- **Python**: PEP 8, type hints, `from __future__ import annotations` at top. Lint with `ruff`. Prefer Pydantic models over `TypedDict`.
- **TypeScript**: strict mode, no `any`, prefer `type` over `interface` for component props, use shadcn primitives over custom components.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- **No emojis in code comments or commit messages.** Emojis are acceptable in user-facing UI strings only when they aid clinical recognition (e.g., the 🚨 in the stroke alert).

---

## Clinical changes need extra care

Any change to `backend/app/rules.py`, `backend/app/triage.py`, `backend/app/data/icvd_corpus.md`, or `data/demo_cases.json` affects clinical output. These changes should:

1. Be flagged in the commit message as `clinical:` (in addition to the Conventional Commit prefix).
2. Cite the source: ICVD criteria, Bárány Society guideline, peer-reviewed paper, or named subspecialist review.
3. Pass `pytest -v` against the 5 demo cases in `data/demo_cases.json`.
4. Ideally, be reviewed by a practicing otoneurology subspecialist before merge.

---

## Pull requests

- Branch from `main`. Keep PRs focused on a single change.
- Run `pytest -v` (backend) and `npm run build` (frontend) before opening the PR. CI must stay green.
- The PR description should answer: **what changed, why, and how was it tested?**
- We squash-merge. Your commit history within the PR can be exploratory; the merge commit is the one we keep.

---

## License

By contributing you agree to license your contribution under the [Apache License 2.0](LICENSE), the same license that covers the rest of the project.

---

## A note on hackathon-mode workflow

During the May 2026 Gemma 4 Good Hackathon sprint we are pushing directly to `main` with conventional commits to maximize velocity. That mode ends with the submission. After May 18, 2026, contributions go through PRs as described above.
