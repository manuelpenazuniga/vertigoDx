# Agent handoff — VertigoDx hackathon sprint

**Target agent:** Gemini 3.1 Pro High (or any coding agent with file-system + shell + git tools).
**Author of this handoff:** Claude Opus 4.7 (Day 1 of the hackathon).
**Date written:** 2026-05-15.

This document is the contract. If anything below conflicts with what you "feel" should be done, **the contract wins**. When in doubt, stop and ask the human — do not improvise.

---

## 0. Read these files first, in this order

1. `CLAUDE.md` — repository invariants, code style, workflow rules.
2. `backlog.yaml` — every task you are allowed to execute, with explicit acceptance criteria.
3. `README.md` — public-facing project description (useful for prose tasks).
4. This file (`AGENT_HANDOFF.md`) — your specific assignment.

Do **not** read anything under `docs/` or `resources/` — those directories are gitignored on purpose and contain private strategy artifacts.

---

## 1. Hard rules you must respect

These are not negotiable. Violating any of them means you must revert your change and stop.

| # | Rule |
|---|---|
| R1 | **All clinical UX text in Spanish** (questions, reasoning, alerts, next steps, limitations). |
| R2 | **All code, comments, commit messages, public docs in English.** |
| R3 | **100% local.** No external API calls. Ollama on `localhost:11434` is the only external process. |
| R4 | **No `dict[str, Any]` in route signatures.** Every clinical I/O goes through Pydantic models in `backend/app/schemas.py`. |
| R5 | **Confidence values are exactly `alta`, `media`, `baja`.** Never claim "definitive diagnosis". |
| R6 | **Never commit anything under `docs/` or `resources/`.** Both are gitignored. |
| R7 | **Never modify `data/demo_cases.json`** to make a failing test pass. If a test fails, fix the logic. |
| R8 | **Push directly to `main`** with Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). No PRs during the hackathon. |
| R9 | **Model autoscaler is sacred.** The single decision point is `pick_model()` in `backend/app/llm.py`. Do not duplicate model-selection logic anywhere. |
| R10 | **Never warm up `gemma4:26b-a4b-it-q4_K_M` at FastAPI startup.** Only `gemma4:e4b` warms up. The heavy model loads on demand when stroke is triggered. |

---

## 2. What is already done (Day 1 — completed)

Everything below is committed to `main` and verified working. Do not redo any of this.

- Backend FastAPI app boots, healthcheck returns 200.
- 7 pytest tests pass (`cd backend && pytest -v`).
- `POST /diagnose` returns Spanish reasoning for the BPPV demo case end-to-end.
- Ollama is installed and running. Models live on the external volume at `/Volumes/MacMiniExt/dev/ollama/models` via a symlink at `~/.ollama/models`. Do not move them.
- Backlog tasks D1-T01 through D1-T14 are marked `status: completed` in `backlog.yaml`.

---

## 3. Your assignment (do these, in this order)

Pick tasks from `backlog.yaml` only if the task ID appears in the list below. **Do not pick any task whose ID is not on this list — that task is reserved for the senior reviewer.**

### Task A — D2-T01: Morning checkpoint

Run the three checks below. If any fails, **stop and report**. Do not try to fix Day 1 code.

```bash
ollama list | grep -q gemma4 && echo "ollama OK" || echo "ollama FAIL"
cd backend && .venv/bin/python -m pytest -v
cd backend && .venv/bin/uvicorn app.main:app --port 8000 &
sleep 60
curl -fsS http://127.0.0.1:8000/healthcheck && echo "API OK"
pkill -f "uvicorn app.main"
```

Mark in `backlog.yaml`: change `D2-T01`'s `status: pending` to `status: completed`.

---

### Task B — D2-T05: Expand the RAG corpus

**Goal:** add three sections to `backend/app/data/icvd_corpus.md` without breaking the existing ones.

**What to add (verbatim Spanish content, append at end of file):**

1. A section titled `## Diagnóstico Diferencial de Vértigo Agudo Sostenido` containing a 4-row markdown table comparing **Neuritis vestibular**, **Stroke cerebeloso (AICA, PICA)**, **Laberintitis**, and **Migraña vestibular** across columns: **HINTS, Hipoacusia, Inicio, Banderas rojas**.

2. A section titled `## Manejo de la Sospecha de Causa Central` listing 5 actions in Spanish: protocol activation, neuroimaging order, contraindicated medications (dimenhidrinato/prometazina), vital sign monitoring, and family communication.

3. A section titled `## Comorbilidad Migraña Vestibular + Ménière` (3-4 sentences) explaining that ICVD explicitly allows dual coding, that ~30% of Ménière patients also meet VM criteria, and the practical consequence: when both rule-engine candidates score "media" or "alta", the clinical reasoning must address the overlap rather than pick one arbitrarily.

**Acceptance criteria (must pass):**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
# 1. The corpus has at least 3 new H2 sections
grep -c "^## " backend/app/data/icvd_corpus.md
# expected output: 12 or more (was 9 at end of Day 1)

# 2. New section titles exist
grep "^## Diagnóstico Diferencial de Vértigo Agudo Sostenido$" backend/app/data/icvd_corpus.md
grep "^## Manejo de la Sospecha de Causa Central$" backend/app/data/icvd_corpus.md
grep "^## Comorbilidad Migraña Vestibular + Ménière$" backend/app/data/icvd_corpus.md

# 3. RAG ingest still works
cd backend && .venv/bin/python -c "from app.rag import RAGStore; s = RAGStore(); print('chunks:', s.collection.count())"
# expected: chunks >= 12
```

Commit message: `feat(rag): expand ICVD corpus with differential table, central management, and VM+EM overlap`.

Mark `D2-T05` as `completed`.

---

### Task C — D2-T08: Bootstrap Next.js 14 frontend with shadcn/ui

**Run these commands exactly. Do not change flags. Do not change versions.**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# 1. Create the Next.js project (will prompt — answer with the flags below; if it still asks anything, accept the default)
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias '@/*' \
  --use-npm \
  --eslint \
  --no-turbopack

# 2. Initialize shadcn/ui with the defaults expected by future tasks
cd frontend
npx shadcn@latest init -d

# 3. Add the components the wizard + result panel will need
npx shadcn@latest add button card progress radio-group select badge alert separator label

# 4. Animation + icons
npm install framer-motion lucide-react

# 5. Verify it builds
npm run build
```

**Acceptance criteria:**

```bash
test -f frontend/package.json && echo "package.json OK"
test -f frontend/components/ui/button.tsx && echo "shadcn button OK"
grep -q '"framer-motion"' frontend/package.json && echo "framer-motion OK"
grep -q '"lucide-react"' frontend/package.json && echo "lucide-react OK"
cd frontend && npm run build  # must exit 0
```

**If `npm run build` fails:** report the exact error. Do not attempt to patch unrelated Next.js / TypeScript / Tailwind config files.

Commit message: `feat(frontend): bootstrap Next.js 14 + shadcn/ui + framer-motion + lucide-react`.

Mark `D2-T08` as `completed`.

---

### Task D — D2-T09: Landing page + OfflineBadge + Spanish metadata

Create exactly the three files below. Do not create extras.

**File 1: `frontend/app/layout.tsx`** — replace the file `create-next-app` generated. Required content:
- `<html lang="es">` (not `en`).
- `metadata.title = "VertigoDx — Privacy-First Vestibular Diagnosis AI"`.
- `metadata.description = "Subspecialist reasoning. Anywhere. Offline."`.
- Use the Inter font from `next/font/google` with `subsets: ["latin"]`.
- Keep the existing `import "./globals.css"`.

**File 2: `frontend/app/page.tsx`** — the landing page. Required:
- Server component (no `"use client"` directive at top).
- Renders `<OfflineBadge />` (imported from `@/components/OfflineBadge`).
- An `<h1>` containing the text `VertigoDx`.
- A subtitle (Spanish): `Razonamiento de subespecialista en otoneurología. Donde sea. Sin conexión.`.
- Two CTA buttons using shadcn `Button`:
  - `Ver casos demo` → `<Link href="/demo">`.
  - `Iniciar evaluación` → `<Link href="/diagnose">`.
- Three feature cards using shadcn `Card`, each with a `lucide-react` icon and text in Spanish:
  - Card 1: `WifiOff` icon, title `100% Local`, body `Funciona sin internet. Los datos del paciente nunca salen del dispositivo.`
  - Card 2: `Stethoscope` icon, title `Basado en ICVD`, body `Criterios oficiales de la Bárány Society y algoritmos HINTS / STANDING.`
  - Card 3: `Lock` icon, title `Gemma 4 + Ollama`, body `Razonamiento en español por LLM open-weight, ejecutado localmente.`
- A muted footer text in Spanish: `Hackathon MVP — Apoyo al diagnóstico, no diagnóstico definitivo.`

**File 3: `frontend/components/OfflineBadge.tsx`** — client component (`"use client"` at top). Required:
- A fixed-positioned pill at `top-4 right-4 z-50`.
- On mount, fetches `http://localhost:8000/healthcheck` and reads `data.offline`.
- Renders the `WifiOff` icon from `lucide-react` and the text `100% Local · Offline` when the backend confirms `offline === true`.
- If the fetch fails, render the same pill with a warning style (`bg-amber-100 text-amber-800`) and the text `Backend no detectado`. Do not crash.
- Use `useEffect` and `useState`. Do not introduce SWR, react-query, or any other data-fetching library.

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. All three files exist
test -f app/layout.tsx
test -f app/page.tsx
test -f components/OfflineBadge.tsx

# 2. Spanish metadata in layout
grep -q 'lang="es"' app/layout.tsx
grep -q 'VertigoDx' app/layout.tsx

# 3. Landing has both CTAs
grep -q '/demo' app/page.tsx
grep -q '/diagnose' app/page.tsx

# 4. OfflineBadge fetches healthcheck
grep -q 'localhost:8000/healthcheck' components/OfflineBadge.tsx
grep -q '"use client"' components/OfflineBadge.tsx

# 5. Build is green
npm run build  # must exit 0
```

Commit message: `feat(frontend): landing page + OfflineBadge with Spanish metadata`.

Mark `D2-T09` as `completed`.

---

### Task E — D2-T10: Diagnose-page shell + stubs

Create:

**File 1: `frontend/app/diagnose/page.tsx`** — client component. Required:
- Has `"use client"` at top.
- Imports `QuestionWizard` and `ResultPanel` (which you also create as stubs in Task E2/E3).
- Imports `OfflineBadge`, `Progress` from shadcn, `Card` from shadcn.
- State: `step` (number), `responses` (object), `result` (any|null), `loading` (boolean).
- Renders a `<Progress value={(step/10)*100} />` bar.
- Renders `<QuestionWizard step={step} responses={responses} onAnswer={...} onComplete={handleSubmit} loading={loading} />` when `!result`.
- Renders `<ResultPanel result={result} onRestart={reset} />` when `result` is truthy.
- `handleSubmit(payload)`: POSTs `payload` to `http://localhost:8000/diagnose`, sets `result` on success, alerts on error.

**File 2: `frontend/components/QuestionWizard.tsx`** — temporary stub. Required:
- Has `"use client"`.
- Accepts the props: `{ step, responses, onAnswer, onComplete, loading }`.
- Renders `<div>TODO: question wizard — step {step}/10</div>` (this is a stub; a senior agent will finish it later).
- Exports as named export `QuestionWizard`.

**File 3: `frontend/components/ResultPanel.tsx`** — temporary stub. Required:
- Has `"use client"`.
- Accepts `{ result, onRestart }`.
- Renders `<div>TODO: result panel — got {JSON.stringify(result).slice(0,80)}…</div>`.
- Exports as named export `ResultPanel`.

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
test -f app/diagnose/page.tsx
test -f components/QuestionWizard.tsx
test -f components/ResultPanel.tsx
grep -q "'QuestionWizard'" components/QuestionWizard.tsx || grep -q 'export function QuestionWizard' components/QuestionWizard.tsx
npm run build  # must exit 0
```

Commit message: `feat(frontend): /diagnose page shell with wizard + result stubs`.

Mark `D2-T10` as `completed`.

---

### Task F — Day 2 partial commit

After tasks A–E pass their acceptance criteria, do **one** combined commit if you haven't committed per-task already. Then push.

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
git status
# Verify only backend/app/data/icvd_corpus.md, frontend/*, and backlog.yaml changed.
# If anything under docs/ or resources/ shows up, STOP. They are gitignored — if visible, the gitignore is broken.

git add backend/app/data/icvd_corpus.md frontend backlog.yaml
git commit -m "feat: day 2 partial — RAG corpus expansion + Next.js scaffold"
git push origin main
```

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `backend/app/llm.py`, `backend/app/rules.py`, `backend/app/triage.py`, `backend/app/schemas.py`, `backend/app/main.py` | These are stable. Modification needs senior review. |
| Iterate on `SYSTEM_PROMPT_V1` or create `V2` / `V3` | Clinical prompt iteration is reserved for the senior agent (D2-T03, D2-T04). |
| Add new dependencies to `backend/pyproject.toml` | The dependency set is frozen. |
| Switch the React state library, add Redux/Zustand/Jotai | Plain `useState` is enough; no new state library. |
| Touch `data/demo_cases.json` | Ground truth — do not modify. |
| Run `ollama pull` on any new model | The three models we use are fixed. |
| Skip pre-commit checks | Always run `npm run build` (frontend) and `pytest -v` (backend) before committing. |
| Commit anything in `docs/` or `resources/` | Gitignored on purpose. |

---

## 5. When to stop and ask the human

Stop and report back if any of these happen — do not improvise around them:

1. Any acceptance-criteria check above returns a failure.
2. `npm run build` produces TypeScript or ESLint errors you can't resolve in 2 attempts.
3. `pytest` regresses (was 7 green, now anything less).
4. `git status` shows files under `docs/` or `resources/` (means the gitignore is broken).
5. You hit a missing dependency or a missing file that should have been there per "what is already done".
6. You're tempted to do something that this document forbids.

When stopping, report: which task you were on, which command failed, the exact stderr, and what you were about to try next.

---

## 6. After Tasks A–E ship: hand back

When all five tasks pass and `git push` succeeded:

1. Print a one-paragraph summary of what changed.
2. List the commits you pushed (`git log --oneline -10`).
3. List the new files (`git diff --name-only HEAD~5..HEAD`).
4. Confirm the final `backlog.yaml` shows D2-T01, D2-T05, D2-T08, D2-T09, D2-T10 as `completed` and the others still `pending`.
5. Stop. Do not start D2-T02, D2-T03, D2-T04, D2-T06, D2-T07, D2-T11 — those are for the senior reviewer.

---

## 7. Reference: how to verify the backend is healthy at any point

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"
.venv/bin/python -m pytest -v                           # expect: 7 passed
.venv/bin/uvicorn app.main:app --port 8000 &
sleep 60                                                # let lifespan warmup finish
curl -s http://127.0.0.1:8000/healthcheck | jq          # expect: offline=true
pkill -f "uvicorn app.main"
```

If `pytest` fails before you start, **do not touch anything**. Report it.

---

## 8. Reference: how the autoscaler works (read-only context)

`backend/app/llm.py::pick_model(stroke_triggered: bool) -> str`:
- `VERTIGODX_FORCE_HEAVY=1` env var set → returns `gemma4:26b-a4b-it-q4_K_M`.
- `stroke_triggered is True` → returns `gemma4:26b-a4b-it-q4_K_M`.
- otherwise → returns `gemma4:e4b`.

You will not modify this logic. You will not bypass it from the frontend. The frontend simply calls `/diagnose`; the backend decides which model to use.

---

**End of handoff.** Read it again before starting.
