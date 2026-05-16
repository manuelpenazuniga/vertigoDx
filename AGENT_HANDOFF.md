# Agent handoff — VertigoDx hackathon sprint (round 2)

**Target agent:** Gemini 3.1 Pro High (or any coding agent with file-system + shell + git tools).
**Author of this handoff:** Claude Opus 4.7 (Day 2 end-of-shift).
**Date written:** 2026-05-16.
**Previous handoff:** completed and merged. See commits `d341f8b` and `6762080` on `main`.

This document is the contract. If anything below conflicts with what you "feel" should be done, **the contract wins**. When in doubt, stop and ask the human — do not improvise.

---

## 0. Read these files first, in this order

1. `CLAUDE.md` — repository invariants, code style, workflow rules.
2. `backlog.yaml` — every task, with explicit acceptance criteria (note: `runtime_decisions` section at top — those are constraints).
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
| R7 | **Never modify `data/demo_cases.json`.** Ground truth. |
| R8 | **Push directly to `main`** with Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). |
| R9 | **Model autoscaler is sacred.** The single decision point is `pick_model()` in `backend/app/llm.py`. Do not duplicate the logic anywhere. |
| R10 | **Never warm up `gemma4:26b-a4b-it-q4_K_M` at FastAPI startup.** Only `gemma4:e4b` warms up. |
| R11 | **Never touch the SYSTEM_PROMPT_V2 in `backend/app/prompts.py`.** Clinical prompt iteration is reserved for the senior agent. |
| R12 | **Never edit `data/demo_cases.json`.** If a test fails, fix the logic. |

---

## 2. What is already done (Days 1 and 2 — committed and verified)

- **Backend**: schemas, deterministic rule engine (`rules.py`), HINTS-adapted triage (`triage.py`), RAG layer (`rag.py`), Gemma client with autoscaler (`llm.py`), FastAPI app with `/healthcheck` and `/diagnose` (`main.py`), prompt v2 (`prompts.py`).
- **Backend tests**: 7 unit tests + 4 light E2E tests + 1 healthcheck E2E, all passing. Stroke E2E is gated behind `VERTIGODX_RUN_HEAVY=1`.
- **Backlog**: D1-T01..T14 completed; D2-T01, T03, T05, T07, T08, T09, T10, T11 completed.
- **Frontend**: Next.js 16.2.6 + React 19.2.4 + shadcn/ui bootstrapped. Landing page (`app/page.tsx`), `OfflineBadge` (working), `/diagnose` page shell, `QuestionWizard` and `ResultPanel` stubs.
- **Ollama**: running as a brew service; models live on the external volume `/Volumes/MacMiniExt/dev/ollama/models` via a symlink at `~/.ollama/models`. Service guardrails: `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_KEEP_ALIVE=60s`.

Do **not** redo any of this.

---

## 3. Your assignment

Pick tasks below **in the order listed**. Do not pick any task whose ID is not on this list — that task is reserved for the senior reviewer.

| Task | Backlog ID | Estimated time |
|---|---|---|
| A | D3-T01 morning checkpoint | 10 min |
| B | D2-T02 prompt evaluation script | 30 min |
| C | D2-T06 partial — `/demo-cases` endpoint only | 15 min |
| D | D3-T02 canonical 10-question list (`lib/questions.ts`) | 30 min |
| E | D3-T06 landing polish + favicon | 30 min |
| F | Final commit + push | 5 min |

---

### Task A — D3-T01: Morning checkpoint

Verify the previous-day state is still green before adding anything.

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# 1. Ollama service is up and the 3 models are present
ollama list | grep -E "gemma4:e4b|gemma4:26b-a4b-it-q4_K_M|nomic-embed-text"
# expected: 3 lines

# 2. Backend unit tests
cd backend && .venv/bin/python -m pytest tests/test_demo_cases.py -q
# expected: 7 passed

# 3. Frontend build
cd ../frontend && npm run build
# expected: exit 0, builds successfully
```

If any of these fails, **stop and report**. Do not try to fix.

Mark `D3-T01` in `backlog.yaml`: change `status: pending` to `status: completed`.

---

### Task B — D2-T02: Prompt evaluation helper script

**Goal:** create `backend/scripts/eval_prompts.py`. It takes a prompt version
identifier as a CLI argument (default `active`), runs the 5 demo cases through
the full pipeline against a running `uvicorn`, and prints expected vs actual
side-by-side for human review.

The script does NOT assert. It only prints, so the human can manually compare
prompt variants during clinical iteration.

**Required content** (write exactly this file):

```python
"""Prompt evaluation helper.

Runs the 5 demo cases through the full backend pipeline and prints, for each
case, the expected vs actual top diagnosis, expected vs actual stroke alert,
and the LLM-generated clinical_reasoning + next_steps + limitations.

This is NOT a test — it prints, it does not assert. Use it during prompt
iteration to compare variants side-by-side.

Prerequisites:
    - uvicorn app.main:app --port 8000 is running
    - venv is activated

Usage:
    cd backend && .venv/bin/python scripts/eval_prompts.py
    # or to label the run (purely cosmetic, helps when copy-pasting output):
    cd backend && .venv/bin/python scripts/eval_prompts.py v2
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

BASE_URL = "http://localhost:8000"
CASES_PATH = Path(__file__).resolve().parents[2] / "data" / "demo_cases.json"


def main() -> int:
    label = sys.argv[1] if len(sys.argv) > 1 else "active"

    try:
        r = httpx.get(f"{BASE_URL}/healthcheck", timeout=3)
        r.raise_for_status()
    except Exception as e:
        print(f"ERROR: API not reachable on {BASE_URL}: {e}", file=sys.stderr)
        print("Start it with: uvicorn app.main:app --port 8000", file=sys.stderr)
        return 1

    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    print(f"\n{'=' * 72}")
    print(f"PROMPT VARIANT: {label}")
    print(f"{'=' * 72}\n")

    client = httpx.Client(base_url=BASE_URL, timeout=240)
    for case in cases:
        cid = case["id"]
        label_str = case["label"]
        expected_top = case.get("expected_top") or case.get("expected_top_options")
        expected_alert = case.get("expected_stroke_alert")

        try:
            resp = client.post("/diagnose", json=case["responses"])
            resp.raise_for_status()
            payload = resp.json()
        except Exception as e:
            print(f"\n-- {cid} ({label_str}) -- FAILED: {e}")
            continue

        actual_top = payload["differential"][0]["diagnosis"]
        actual_alert = payload["stroke_alert"]["triggered"]
        reasoning = payload["clinical_reasoning"]
        steps = payload["next_steps"]
        limits = payload["limitations"]

        print(f"\n-- {cid} : {label_str} --")
        print(f"  expected top   : {expected_top}")
        print(f"  actual top     : {actual_top}")
        print(f"  expected alert : {expected_alert}")
        print(f"  actual alert   : {actual_alert}")
        print(f"\n  reasoning:")
        print(f"    {reasoning}")
        print(f"\n  next_steps:")
        for s in steps:
            print(f"    - {s}")
        print(f"\n  limitations:")
        print(f"    {limits}")
        print(f"\n{'-' * 72}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

**Acceptance criteria** (must pass):

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# 1. File exists at the expected path
test -f backend/scripts/eval_prompts.py

# 2. It exits 1 with a clear error when the API is down (no API right now)
cd backend && .venv/bin/python scripts/eval_prompts.py 2>&1 | grep -q "API not reachable"

# 3. Ruff is clean
.venv/bin/ruff check scripts/eval_prompts.py
```

You do NOT need to start uvicorn and run the script end-to-end. The acceptance
criteria above are sufficient. The senior agent will run it manually during
prompt iteration.

Commit message: `feat(backend): add eval_prompts.py helper for manual prompt iteration`.

Mark `D2-T02` as `completed`.

---

### Task C — D2-T06 partial: `/demo-cases` endpoint

**Important scope clarification:** the full D2-T06 task in `backlog.yaml`
includes three things: `/demo-cases`, `/diagnose/stream` (SSE streaming), and
a startup warmup. **You only do `/demo-cases`.** The other two are reserved
for the senior agent because they involve `async` generators and lifecycle
hooks that are subtle.

**Goal:** add a single new endpoint to `backend/app/main.py` that returns the
contents of `data/demo_cases.json` as JSON. The frontend `/demo` page will
consume this.

**Required change** — add this function in `backend/app/main.py`, right after
the `healthcheck` function:

```python
@app.get("/demo-cases")
def list_demo_cases() -> list[dict]:
    """Return the 5 scripted clinical demo cases for the frontend to display."""
    cases_path = (
        Path(__file__).resolve().parents[2] / "data" / "demo_cases.json"
    )
    return json.loads(cases_path.read_text(encoding="utf-8"))
```

You will need to add two imports near the top of `main.py` if they are not
already there. Check first; if either is already imported (e.g. via another
statement), do not duplicate:

```python
import json
from pathlib import Path
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"

# 1. The function exists in main.py
grep -q "def list_demo_cases" app/main.py

# 2. The route is registered
grep -q '@app.get("/demo-cases")' app/main.py

# 3. The file still imports cleanly (no syntax errors)
.venv/bin/python -c "from app.main import app; print([r.path for r in app.routes])"
# expected output includes '/demo-cases'

# 4. Ruff is still clean
.venv/bin/ruff check app/main.py

# 5. Existing unit tests still pass
.venv/bin/python -m pytest tests/test_demo_cases.py -q
# expected: 7 passed
```

Do **not** mark D2-T06 as `completed` — you only did one of three sub-parts.
Instead, in `backlog.yaml`, do this exactly:

1. Find the line `  - id: D2-T06`.
2. Below the existing `status: pending` line, add a sibling field on a new
   line at the same indentation:
   ```yaml
       progress_note: "demo-cases endpoint completed by Gemini handoff round 2 on 2026-05-16; /diagnose/stream and startup warmup still pending"
   ```
3. Leave `status` as `pending`.

Commit message: `feat(backend): expose /demo-cases endpoint for frontend demo page`.

---

### Task D — D3-T02: Canonical 10-question list

**Goal:** create `frontend/lib/questions.ts` with the 10 questions the frontend wizard will display. Labels are in Spanish; option values must match the backend Enum values exactly.

**Required content** (write exactly this file):

```typescript
// Canonical 10-question list for the VertigoDx diagnostic wizard.
//
// Each question's `field` maps 1:1 to a key in the backend's PatientResponses
// schema (backend/app/schemas.py). Each option's `value` must exactly match
// the corresponding Python Enum value — the backend will reject otherwise.
//
// Labels are in Spanish (the clinical UX language). Do not translate the
// option values; those are wire-protocol constants.

export type QuestionOption = { value: string; label: string };

export type Question = {
  field: string;
  title: string;
  description?: string;
  type: "single" | "boolean";
  options?: QuestionOption[];
};

export const QUESTIONS: Question[] = [
  {
    field: "episode_duration",
    title: "¿Cuánto dura cada episodio de vértigo?",
    description: "Considere el episodio típico, no el más largo.",
    type: "single",
    options: [
      { value: "under_1min", label: "Menos de 1 minuto" },
      { value: "1_to_2min", label: "Entre 1 y 2 minutos" },
      { value: "2min_to_1h", label: "Entre 2 minutos y 1 hora" },
      { value: "1_to_24h", label: "Entre 1 y 24 horas" },
      { value: "over_24h", label: "Más de 24 horas (continuo)" },
    ],
  },
  {
    field: "trigger",
    title: "¿Qué desencadena el vértigo?",
    type: "single",
    options: [
      { value: "position_change", label: "Cambio de posición (girarse en cama, agacharse)" },
      { value: "head_movement", label: "Movimientos de cabeza" },
      { value: "spontaneous", label: "Espontáneo, sin desencadenante claro" },
      { value: "loud_sound", label: "Ruido fuerte o cambio de presión" },
    ],
  },
  {
    field: "hearing_status",
    title: "¿Hay síntomas auditivos asociados?",
    description: "Hipoacusia, tinnitus o plenitud aural.",
    type: "single",
    options: [
      { value: "fluctuating", label: "Sí, fluctuante (varía entre episodios)" },
      { value: "permanent", label: "Sí, permanente" },
      { value: "none", label: "No, sin síntomas auditivos" },
    ],
  },
  {
    field: "migraine_history",
    title: "¿Historia de migraña o cefalea con foto / fonofobia?",
    type: "single",
    options: [
      { value: "frequent", label: "Sí, frecuente (≥ 2 al mes)" },
      { value: "occasional", label: "Ocasional" },
      { value: "none", label: "No" },
    ],
  },
  {
    field: "nausea_vomiting",
    title: "¿Hubo náusea o vómito?",
    type: "single",
    options: [
      { value: "vomiting", label: "Sí, con vómito" },
      { value: "nausea_only", label: "Solo náusea" },
      { value: "none", label: "No" },
    ],
  },
  {
    field: "age_bracket",
    title: "Edad del paciente",
    type: "single",
    options: [
      { value: "under_40", label: "Menos de 40 años" },
      { value: "40_60", label: "40 – 60 años" },
      { value: "60_75", label: "60 – 75 años" },
      { value: "over_75", label: "Más de 75 años" },
    ],
  },
  {
    field: "onset",
    title: "¿Cómo fue el inicio del cuadro?",
    type: "single",
    options: [
      { value: "sudden", label: "Súbito (en menos de 1 minuto)" },
      { value: "progressive", label: "Progresivo (minutos a horas)" },
      { value: "chronic", label: "Crónico (días a semanas)" },
    ],
  },
  {
    field: "gait",
    title: "¿Puede caminar y mantenerse sentado?",
    type: "single",
    options: [
      { value: "normal", label: "Camina sin problemas" },
      { value: "unstable", label: "Marcha inestable pero camina" },
      { value: "cant_sit", label: "No puede sentarse sin caer (ataxia severa)" },
    ],
  },
  {
    field: "neuro_red_flags",
    title: "¿Hay síntomas neurológicos focales?",
    description:
      "Cefalea nueva, visión doble, debilidad en una extremidad, dificultad para hablar, asimetría facial.",
    type: "boolean",
  },
  {
    field: "cv_risk",
    title: "Factores de riesgo cardiovascular",
    description:
      "HTA, diabetes, tabaquismo, fibrilación auricular, ACV previo, dislipidemia.",
    type: "single",
    options: [
      { value: "none", label: "Ninguno conocido" },
      { value: "1_to_2", label: "1 o 2 factores" },
      { value: "3_or_more", label: "3 o más factores" },
    ],
  },
];
```

**Acceptance criteria** (must pass):

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. File exists
test -f lib/questions.ts

# 2. Exactly 10 questions
node --input-type=module -e "import('./lib/questions.ts').then(m => { if (m.QUESTIONS.length !== 10) process.exit(1); })" 2>/dev/null \
  || grep -c "field:" lib/questions.ts
# expected: 10

# 3. Field order matches backend schema field order
grep -oE 'field: "[a-z_]+"' lib/questions.ts | sed 's/field: //; s/"//g'
# expected exactly, in this order:
#   episode_duration
#   trigger
#   hearing_status
#   migraine_history
#   nausea_vomiting
#   age_bracket
#   onset
#   gait
#   neuro_red_flags
#   cv_risk

# 4. Build still passes
npm run build
# expected: exit 0
```

**Cross-check against backend enums** — every `value` you wrote must appear
verbatim in `backend/app/schemas.py`. Run this check (it should produce no output):

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
python3 <<'PY'
import re, pathlib
qs = pathlib.Path("frontend/lib/questions.ts").read_text()
schema = pathlib.Path("backend/app/schemas.py").read_text()
values = re.findall(r'value: "([^"]+)"', qs)
missing = [v for v in values if f'"{v}"' not in schema]
if missing:
    print("MISSING in schemas.py:", missing)
    exit(1)
PY
```

If anything is missing, you mistyped a value — fix it, do not modify
`schemas.py`.

Commit message: `feat(frontend): canonical 10-question list mapped to backend enums`.

Mark `D3-T02` as `completed`.

---

### Task E — D3-T06: Landing polish + favicon

**Goal:** improve the existing landing page (`frontend/app/page.tsx`) and add
a proper favicon. The current landing already has three feature cards; this
task adds visual polish and the favicon Next.js will use.

**Step 1: Replace the favicon.**

Delete `frontend/app/favicon.ico` if present. Create a new file
`frontend/app/icon.svg` (Next.js 16 picks this up automatically) with this
exact content:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1e3a8a"/>
  <text x="50%" y="56%" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
        font-size="28" font-weight="700" text-anchor="middle" dominant-baseline="middle"
        fill="#ffffff" letter-spacing="-1">Vx</text>
</svg>
```

**Step 2: Improve `frontend/app/page.tsx`.**

Read the current file first (`cat frontend/app/page.tsx`). Then edit it so
that:

1. The root `<main>` uses a gradient background. Use these Tailwind classes
   exactly:
   ```
   min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
   dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950
   ```

2. The hero spacing is generous: `container mx-auto px-4 py-16 max-w-4xl`
   for the outer wrapper, `text-center space-y-6 mb-16` for the hero block.

3. After the three existing feature cards, add a thin footer block:
   ```tsx
   <div className="text-center text-xs text-muted-foreground border-t pt-6 mt-12">
     <p>
       <strong>Hackathon MVP</strong> · Apoyo al diagnóstico, no diagnóstico definitivo ·{" "}
       <a
         href="https://github.com/manuelpenazuniga/vertigoDx"
         className="underline hover:text-foreground"
         target="_blank"
         rel="noopener noreferrer"
       >
         Ver código en GitHub
       </a>
     </p>
   </div>
   ```

4. Keep the existing `OfflineBadge`, hero text, two CTA buttons, and three
   feature cards. Do not delete content.

5. **Do NOT** add new shadcn components, new dependencies, or animations.
   Plain Tailwind only.

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. Favicon SVG exists with the expected color
test -f app/icon.svg
grep -q '#1e3a8a' app/icon.svg

# 2. Old favicon.ico is gone (optional — fine if already gone)
test ! -f app/favicon.ico || rm app/favicon.ico

# 3. Landing has the gradient
grep -q 'from-slate-50 via-blue-50 to-indigo-50' app/page.tsx

# 4. GitHub link is present
grep -q 'github.com/manuelpenazuniga/vertigoDx' app/page.tsx

# 5. The three feature labels are still there
grep -q '100% Local' app/page.tsx
grep -q 'Basado en ICVD' app/page.tsx
grep -q 'Gemma 4' app/page.tsx

# 6. Build is green
npm run build
```

Commit message: `feat(frontend): landing polish with gradient, footer, and SVG icon`.

Mark `D3-T06` as `completed`.

---

### Task F — Final commit + push

After Tasks A–E pass, push.

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected modified/new files only under:
#   backend/scripts/eval_prompts.py        (Task B)
#   backend/app/main.py                    (Task C)
#   frontend/lib/questions.ts              (Task D)
#   frontend/app/page.tsx                  (Task E)
#   frontend/app/icon.svg                  (Task E)
#   backlog.yaml                           (status updates)
#
# If anything under docs/ or resources/ shows up, STOP. The gitignore is broken.

# You may have committed per-task already; if so, just push:
git push origin main

# Or, if you batched into a single commit (also fine):
git add backend/scripts backend/app/main.py frontend backlog.yaml
git commit -m "feat: day 3 prep — demo-cases endpoint, questions list, landing polish, eval helper"
git push origin main
```

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `backend/app/llm.py`, `rules.py`, `triage.py`, `schemas.py`, `prompts.py` | Reserved for senior review. |
| Implement `/diagnose/stream` SSE streaming | Subtle async-generator logic. Senior task. |
| Implement the real `QuestionWizard` or `ResultPanel` components | Highest-leverage UI; senior is writing them with framer-motion. |
| Touch `data/demo_cases.json` | Ground truth. |
| Add new npm dependencies | Stick to what is already installed. |
| Add new Python dependencies | Same. |
| Run `ollama pull` on any new model | The three models are fixed. |
| Skip pre-commit checks | Always run `npm run build` and `pytest -v` before committing. |
| Commit anything in `docs/` or `resources/` | Gitignored on purpose. |
| Edit `AGENT_HANDOFF.md` | This file is owned by the senior agent. |

---

## 5. When to stop and ask the human

Stop and report back if any of these happen — do not improvise around them:

1. Any acceptance-criteria check above returns a failure.
2. `npm run build` produces TypeScript or ESLint errors you can't fix in 2 attempts.
3. `pytest` regresses from the green baseline (7 unit + 4 light E2E = 11 passing, 1 skipped).
4. `git status` shows files under `docs/` or `resources/` (means the gitignore is broken).
5. A `backend/app/*.py` file you were NOT asked to modify shows as `M` in git.
6. The Python `cross-check` script in Task D reports `MISSING in schemas.py: [...]`.
7. You're tempted to do something that this document forbids.

When stopping, report: which task you were on, which command failed, the exact stderr, and what you were about to try next.

---

## 6. After Tasks A–F ship: hand back

When all six tasks pass and `git push` succeeded:

1. Print a one-paragraph summary of what changed.
2. List the commits you pushed (`git log --oneline -10`).
3. Confirm the final `backlog.yaml` shows:
   - `D3-T01` → completed
   - `D2-T02` → completed
   - `D2-T06` → pending (with the new `progress_note`)
   - `D3-T02` → completed
   - `D3-T06` → completed
4. Stop. Do not start any other task.

---

## 7. Reference: how to verify the backend is healthy at any point

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"
.venv/bin/python -m pytest tests/test_demo_cases.py -q
# Expect: 7 passed, ~0.07s

# If you want to verify the API itself (optional — only for Task B output):
.venv/bin/uvicorn app.main:app --port 8000 &
# Wait up to 2 minutes for the lifespan warmup of gemma4:e4b
until curl -fsS http://127.0.0.1:8000/healthcheck >/dev/null 2>&1; do sleep 5; done
curl -s http://127.0.0.1:8000/healthcheck | jq .
pkill -f "uvicorn app.main"
```

---

## 8. Reference: how the autoscaler works (read-only context)

`backend/app/llm.py::pick_model(stroke_triggered: bool) -> str`:
- `VERTIGODX_FORCE_HEAVY=1` env var → returns `gemma4:26b-a4b-it-q4_K_M`.
- `stroke_triggered is True` → returns `gemma4:26b-a4b-it-q4_K_M`.
- otherwise → returns `gemma4:e4b`.

You will not modify this logic. You will not bypass it from the frontend.

---

**End of handoff.** Read it again before starting.
