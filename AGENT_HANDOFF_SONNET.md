# Agent handoff — Sonnet 4.6 (round 3)

**Target agent:** Claude Sonnet 4.6.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16, round 3.
**Previous rounds shipped:** commits `60fcc10`, `d31692b`, `d669aea`, `3ea9232` — ResultPanel, /demo page, types/api refactor, force-track workaround. All reviewed and merged.

**Note about round 2 review**: the senior agent (me) initially attributed an `onComplete` bug to your refactor. After tracing git blame, that line came from the original `/diagnose` shell (commit `d341f8b`, Gemini Day 2). Your refactor preserved existing behavior correctly — which is the right call during a refactor. The bug was caught and fixed in commit `d2ff019`. The lesson is on my side (acceptance criteria should have been functional, not grep-based). Your execution discipline earned this round.

---

## 0. Read these files first

1. `CLAUDE.md`
2. `backlog.yaml` (especially `runtime_decisions`)
3. `README.md` — the new docs you write must feel consistent with its tone.
4. `frontend/components/OfflineBadge.tsx` — current implementation; you will enhance it.
5. This file.

Do **not** read anything under `docs/` or `resources/` — gitignored.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All UX text in Spanish (UI strings). |
| R2 | All code, comments, commit messages, and public docs in English. |
| R3 | Never touch any `backend/app/*.py` file — that's the other agent's territory this round. |
| R4 | Never touch any frontend component except `OfflineBadge.tsx`. |
| R5 | Push directly to `main` with Conventional Commits. |
| R6 | Never commit under `docs/` or `resources/`. |
| R7 | No new dependencies. |
| R8 | Never warm up `gemma4:26b-a4b-it-q4_K_M`. |
| R9 | The parallel agent (Opus 4.6 thinking) is touching `backend/app/main.py` to add `/diagnose/stream`. Do not touch that file. |

---

## 2. What is already done

- Backend: rule engine, RAG, Gemma client, `/healthcheck`, `/diagnose`, `/demo-cases`. 7 unit tests pass.
- Frontend: landing, `/diagnose`, `/demo`, real `QuestionWizard`, real `ResultPanel`, shared types in `lib/types.ts`, API helpers in `lib/api.ts`.
- Day 3 essentially closed. Day 4 prep ongoing in parallel.

---

## 3. Your assignment

Three tasks, in order. Estimated total: 60 minutes.

| Task | Estimated time | File(s) |
|---|---|---|
| A | Write `CONTRIBUTING.md` at repo root | 20 min |
| B | Write `SECURITY.md` at repo root | 15 min |
| C | Enhance `OfflineBadge` with retry on tab focus / visibility | 20 min |
| D | Final commit + push | 5 min |

---

### Task A — `CONTRIBUTING.md`

**Goal:** standard OSS contributing guide that signals to GitHub visitors and future contributors that this is a serious open project, not a hackathon throwaway.

**File location:** `CONTRIBUTING.md` at repo root (alongside `README.md` and `LICENSE`).

**Required structure (write exactly these sections):**

```markdown
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
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
test -f CONTRIBUTING.md
grep -q "Apache License 2.0" CONTRIBUTING.md
grep -q "ICVD criteria" CONTRIBUTING.md
grep -q "Bárány Society" CONTRIBUTING.md
grep -q "Conventional Commits" CONTRIBUTING.md
wc -w CONTRIBUTING.md  # expected: 400-600 words
```

Commit message: `docs: add CONTRIBUTING.md`.

---

### Task B — `SECURITY.md`

**Goal:** standard `SECURITY.md` at repo root. Critical for a medical-AI project — judges will check whether the team takes security disclosure seriously.

**File location:** `SECURITY.md` at repo root.

**Required content (write exactly this):**

```markdown
# Security Policy

VertigoDx is a clinical decision support (CDS) prototype. The MVP shipped
for the Gemma 4 Good Hackathon is **not a regulated medical device** and
must not be used in production clinical care without proper validation
and regulatory clearance. That said, we take security and clinical-safety
reporting seriously even at the MVP stage.

---

## Reporting a vulnerability

If you discover a security issue, **do not open a public GitHub issue**.
Instead, email the maintainer directly:

**[manuelpenazuniga@gmail.com](mailto:manuelpenazuniga@gmail.com)**

Please include:

- A description of the issue and the impact you believe it has.
- Steps to reproduce.
- The commit hash or version you tested against.
- Whether you would like to be credited in the fix's release notes.

We will acknowledge receipt within 72 hours and aim to provide a remediation
plan within 7 days for credible reports.

---

## In-scope concerns

We care about:

- **Patient data exposure.** The project runs 100% locally on purpose. Any code path that sends patient data to a remote service (including telemetry, error reporting, or model providers) is a critical bug.
- **Clinical-safety regressions.** If a change makes the rule engine, triage scoring, or LLM reasoning produce systematically less safe output (e.g., stops triggering stroke alerts when they should), that is in scope.
- **Prompt-injection vectors.** The questionnaire inputs are typed enums, but if someone finds a path to inject arbitrary text into the system prompt or RAG context, we want to know.
- **Dependency vulnerabilities.** Critical CVEs in our direct dependencies (`fastapi`, `pydantic`, `chromadb`, `ollama`, `next`, etc.).

## Out of scope

- **Performance issues** that don't have security implications.
- **Theoretical risks** that require an attacker to already have local code execution on the clinician's machine — in that scenario, the patient's data is already compromised by other means.
- **Social-engineering scenarios** against individual clinicians.

---

## Clinical-safety reporting

If you are a clinician who notices that VertigoDx produces unsafe or
clinically incorrect output for a real-world case, please open a
[GitHub issue](https://github.com/manuelpenazuniga/vertigoDx/issues)
with the label `clinical-safety`. Include the questionnaire responses
(anonymized) and the actual vs. expected output. Do **not** include any
patient identifiers.

---

## Disclosure process

For security issues we follow coordinated disclosure:

1. You report privately.
2. We confirm and develop a fix.
3. We release the fix with the vulnerability disclosed in the release notes, crediting you unless you prefer to remain anonymous.
4. Public disclosure happens at the same time as the fix release.

We do not currently offer monetary rewards, but we will credit you publicly and warmly.
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
test -f SECURITY.md
grep -q "manuelpenazuniga@gmail.com" SECURITY.md
grep -q "Reporting a vulnerability" SECURITY.md
grep -q "clinical-safety" SECURITY.md
wc -w SECURITY.md  # expected: 300-500 words
```

Commit message: `docs: add SECURITY.md with private reporting channel`.

---

### Task C — Enhance `OfflineBadge` with retry on visibility / focus

**Goal:** the current `OfflineBadge` checks `/healthcheck` only on mount. If the user closes the laptop lid, opens it later, and comes back to the tab, the badge can show "Backend no detectado" even after the backend recovers. Add automatic re-check when the tab regains focus or visibility.

**File:** `frontend/components/OfflineBadge.tsx` — modify the existing file. Keep the visual output identical for the three states (`checking`, `offline`, `error`). Only change the data-fetching layer.

**Required changes:**

1. Extract the healthcheck call into a small reusable function inside the component:
   ```typescript
   const check = async () => {
     try {
       const res = await fetch("http://localhost:8000/healthcheck");
       if (!res.ok) throw new Error("not ok");
       const data = await res.json();
       setStatus(data.offline === true ? "offline" : "error");
     } catch {
       setStatus("error");
     }
   };
   ```

2. The existing `useEffect` should call `check()` once on mount, and additionally subscribe to:
   - `window.addEventListener("visibilitychange", handler)` — fires when the user switches tabs or comes back from a system sleep.
   - `window.addEventListener("focus", handler)` — fires when the window/tab regains focus.

   The handler re-runs `check()` only when `document.visibilityState === "visible"` (avoids a double-run when `focus` and `visibilitychange` fire close together).

3. Properly **clean up** the listeners in the `useEffect` return:
   ```typescript
   return () => {
     window.removeEventListener("visibilitychange", handler);
     window.removeEventListener("focus", handler);
   };
   ```

4. Add an optional 30-second polling backoff **only when the status is `error`** — once the backend recovers, you want the badge to flip back to "offline / OK" without a manual page refresh. Use `setInterval` started inside the same `useEffect`, gated on `status === "error"`, and cleared in cleanup. **Do NOT poll when status is `offline`** — there's nothing to retry.

5. Use `useCallback` to memoize `check` if it's referenced from the listener and the polling interval — this avoids the "stale closure" trap that `setInterval` is famous for.

### Edge cases to think through

- **First render is `"checking"`** — listeners must not run `check()` again before the first one finishes (otherwise you spam the backend on mount). The simplest pattern is to call `check()` once at the top of the effect, then attach listeners, then optionally start the interval.
- **The cleanup function must run even if `check` is mid-flight** — that's fine, fetch responses to an unmounted component are harmless (React will warn in dev, not in prod). Don't add an AbortController unless you can do it without changing the visible API.
- **Don't double-poll** — if the user comes back to the tab while the interval is also active, both will fire `check()`. That's annoying but acceptable; do not add a debounce mechanism. Simpler is better.

### Acceptance criteria

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. File still exists with the right export
grep -q "export function OfflineBadge" components/OfflineBadge.tsx

# 2. New listeners
grep -q "visibilitychange" components/OfflineBadge.tsx
grep -q "addEventListener" components/OfflineBadge.tsx
grep -q "removeEventListener" components/OfflineBadge.tsx

# 3. Polling on error
grep -q "setInterval" components/OfflineBadge.tsx
grep -q "clearInterval" components/OfflineBadge.tsx

# 4. Spanish UI strings preserved (the three states still render correctly)
grep -q "100% Local · Offline" components/OfflineBadge.tsx
grep -q "Backend no detectado" components/OfflineBadge.tsx

# 5. Build is green
npm run build
```

Commit message: `feat(frontend): OfflineBadge re-checks healthcheck on focus, visibility, and error backoff`.

---

### Task D — Final push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected modified/new files only:
#   CONTRIBUTING.md                              (new)
#   SECURITY.md                                  (new)
#   frontend/components/OfflineBadge.tsx         (modified)
#
# If backend/app/main.py shows as modified, STOP — that means a race with
# the parallel Opus 4.6 thinking agent. Report immediately.

git push origin main
```

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `backend/app/main.py` | Owned by parallel Opus 4.6 thinking agent. |
| Touch any other `backend/app/*.py` file | Frozen. |
| Touch any frontend file other than `components/OfflineBadge.tsx` | Out of scope. |
| Add new npm dependencies | Stick to what's installed. |
| Add a generic "useFocus" / "useVisibility" hook abstraction | Premature; the listener pattern is fine inline for one component. |
| Add an AbortController for the in-flight fetch | Out of scope; the React warning is dev-only. |
| Edit `AGENT_HANDOFF*.md` files | Senior owns them. |
| Commit under `docs/` or `resources/` | Gitignored. |

---

## 5. When to stop and ask

1. Any acceptance check fails.
2. `npm run build` fails with TypeScript errors you can't fix in 2 attempts.
3. `git status` shows files outside your assigned set as modified.
4. You're tempted to refactor anything beyond the spec.

---

## 6. After Tasks A–D ship

1. One-paragraph summary including word counts of CONTRIBUTING.md and SECURITY.md.
2. `git log --oneline -5`.
3. Stop.

---

**End of handoff.**
