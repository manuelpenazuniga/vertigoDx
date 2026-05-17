# Agent handoff — Sonnet 4.6 (round 5)

**Target agent:** Claude Sonnet 4.6.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-17, round 5 — pre-grabación.
**Previous rounds shipped:** ResultPanel, /demo page, shared types + API helpers, OfflineBadge polish, CONTRIBUTING + SECURITY, trazability triple field. Track record: A across the board.

This round is **defensive infrastructure**: an automated smoke test script that the human will run before recording the video and after any hotfix. Your work today saves the human from re-running a 30-minute manual checklist every time something might have regressed.

You are **NOT running in parallel** with another agent this round. No file-disjoint coordination needed. Take your time on the script's UX (clear pass/fail output, exit codes for CI).

---

## 0. Read these files first

1. `CLAUDE.md`
2. `backlog.yaml` runtime_decisions block
3. `backend/tests/test_e2e.py` — the existing E2E suite. Your script is a complementary tool, not a replacement. Understand the difference (see section 2 below).
4. `data/demo_cases.json` — the 5 cases. Your script uses case_01 (BPPV) to avoid loading the 17 GB heavy model.
5. `backend/app/main.py` — to know which endpoints exist and what shape they return.
6. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | Spanish only for UX strings the script might print (none expected — script is for developer eyes). All other text in English. |
| R2 | All code, comments, commits in English. |
| R3 | Never modify any `backend/app/*.py` file. The script reads from running endpoints; it doesn't change source. |
| R4 | Never modify any `frontend/` file. Same reason. |
| R5 | Push directly to `main` with Conventional Commits. |
| R6 | Never commit under `docs/` or `resources/`. |
| R7 | No new Python dependencies. Use stdlib `urllib`, `json`, `sys`, `subprocess`, `time`. No `httpx`, no `requests`, no `rich` — script must run on any Python 3.11+ without `pip install`. |
| R8 | The script must NEVER load the heavy 17 GB model (`gemma4:26b-a4b-it-q4_K_M`). Use case_01 BPPV only. Mention this in a comment so future maintainers understand. |
| R9 | The script must exit cleanly even if uvicorn is not running. It should print a clear error and exit 1, never hang or stack-trace. |

---

## 2. What is a smoke test (read carefully)

The codebase already has `pytest` unit tests (`test_demo_cases.py`) and `pytest` E2E tests (`test_e2e.py`). Your script is **not** a replacement for either. It is a third, complementary tool. Here is the boundary:

| Type | What | When | Tool |
|---|---|---|---|
| Unit tests | Functions in isolation | Pre-commit, fast (<1s) | `pytest tests/test_demo_cases.py` |
| E2E tests | Pipeline + Spanish heuristics + clinical correctness | Pre-commit when uvicorn is up, slow (5-10 min) | `pytest tests/test_e2e.py` |
| **Smoke test (NEW — yours)** | **"Is the system on and responding with the right shape?"** | **Before recording video, after any hotfix** — fast (30-60s) | `./scripts/smoke.sh` |

Your script does NOT test clinical correctness or Spanish quality. It tests:
- Is the API alive (`/healthcheck` returns 200)?
- Does `POST /diagnose` return JSON with all expected top-level keys?
- Does `POST /diagnose/stream` emit the 5 SSE events in the correct order?
- Does the `reasoning` frame payload carry the new round-4 traceability fields (`model_used`, `generated_at`, `corpus_version`, `consensus_paths`, `consensus_agreement_ratio`)?

If any of these fail, something is structurally broken. If all pass, the system is **alive** — clinical correctness still has to be verified by the manual smoke test (D3-T09) and by the user's eyes.

---

## 3. Your assignment

Two artifacts, one wrapper.

| Task | Estimated time | File(s) |
|---|---|---|
| A | Python smoke test runner (`scripts/smoke.py`) | 45 min |
| B | Shell wrapper that starts uvicorn if needed (`scripts/smoke.sh`) | 15 min |
| C | Final commit + push | 5 min |

---

### Task A — `scripts/smoke.py`

**Goal:** a standalone Python script (no pytest, no httpx) that runs 5 smoke checks against `localhost:8000` and prints a clear pass/fail summary.

**File location:** `scripts/smoke.py` at the **repo root** (not under `backend/scripts/`, which is for backend-specific helpers like `eval_prompts.py`).

**Required behavior:**

- Script accepts no arguments — runs all 5 checks unconditionally.
- Output uses **ANSI color codes**: green ✓ for pass, red ✗ for fail, yellow ⚠ for skipped.
- Each check prints:
  - Line 1: `[N/5] ► <Check name>...`
  - Line 2: result (✓ PASS or ✗ FAIL with one-line reason)
- Final summary:
  - `═══ 5/5 passed in 28.3s — SYSTEM IS ALIVE ✓` (green) or
  - `═══ 3/5 passed in 12.1s — 2 CHECKS FAILED, see above` (red)
- Exit code 0 if all pass, 1 otherwise.

**The 5 checks (write them in this order):**

#### Check 1 — Healthcheck reachable

```
GET http://localhost:8000/healthcheck
```
- Expect: HTTP 200.
- Expect: JSON body with `offline: true`.
- Expect: `model_light` and `model_heavy` keys present.
- If connection refused → fail with message `"uvicorn not running on port 8000 — start it with: cd backend && .venv/bin/uvicorn app.main:app --port 8000"`.

#### Check 2 — Sync `/diagnose` returns full schema

```
POST http://localhost:8000/diagnose with case_01 BPPV payload
```
- Load `data/demo_cases.json`, find `case_01_bppv_clasico`, post its `.responses` block.
- Expect HTTP 200 within 180 seconds (the cold-start budget).
- Parse JSON and verify these top-level keys exist:
  - `differential` (list, non-empty)
  - `stroke_alert` (object with `triggered: bool`)
  - `clinical_reasoning` (str, length >= 20)
  - `next_steps` (list, non-empty)
  - `limitations` (str)
  - `processing_time_ms` (int)
  - `model_used` (str — must equal `"gemma4:e4b"` for non-stroke case)
  - `generated_at` (str, ISO 8601 format — must start with `2026-` or later)
  - `corpus_version` (str, 12 hex chars)
  - `consensus_paths` (int — must equal 1 for non-stroke)
  - `consensus_agreement_ratio` (float — must equal 1.0 for non-stroke)
- For BPPV, `stroke_alert.triggered` must be `False`.

#### Check 3 — Stream `/diagnose/stream` emits 5 events in order

```
POST http://localhost:8000/diagnose/stream with case_01 BPPV payload
```
- Read the SSE stream until EOF (or until you see the `complete` event).
- Collect stage names in arrival order.
- Expect exactly these 5 stages, in this exact order: `["rules", "triage", "rag", "reasoning", "complete"]`.
- For BPPV (non-stroke), the `model_loading` event MUST NOT appear.
- If reordering is detected → fail with the actual sequence as message.

#### Check 4 — Reasoning frame payload carries traceability + consensus

- Reuse the stream from check 3 (or re-stream if simpler; the curl is cheap once e4b is warm).
- Find the `reasoning` event frame.
- Parse its `payload` (which is the full `DiagnosticResult`).
- Verify the same fields as check 2 are present (model_used, generated_at, corpus_version, consensus_paths, consensus_agreement_ratio).
- Verify the payload's `differential[0].diagnosis` contains `"BPPV"` (substring match).

#### Check 5 — Demo cases endpoint returns 5 cases

```
GET http://localhost:8000/demo-cases
```
- Expect HTTP 200.
- Expect a JSON array of length exactly 5.
- Expect each item has `id`, `label`, `narrative`, `responses` keys.
- Expect that `case_04_stroke_cerebeloso` exists and has `expected_stroke_alert: true`.

**Implementation guidance:**

- Use `urllib.request` for both GET and POST (no httpx).
- For SSE parsing, read the response body line by line (or in chunks) and split frames by `"\n\n"` — same pattern as the frontend `streamDiagnose` helper.
- Timeouts: 5s for healthcheck and `/demo-cases`, 180s for `/diagnose` (cold start), 200s for the stream.
- Pretty terminal output: ANSI codes `\033[32m` (green), `\033[31m` (red), `\033[33m` (yellow), `\033[0m` (reset). No external libraries.
- Helper: `def check(n: int, name: str, fn: Callable[[], None]) -> bool:` that calls `fn()`, catches any exception, prints pass/fail with timing, returns the boolean.
- Top of file docstring should explain: what this is, what it is NOT, when to run it, how it differs from pytest E2E.

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# 1. File exists at the right path
test -f scripts/smoke.py
file scripts/smoke.py | grep -q "Python script\|text"

# 2. No banned imports (script must be stdlib-only)
! grep -E "^(import|from) (httpx|requests|rich|click|typer|aiohttp)" scripts/smoke.py

# 3. Uses urllib.request (stdlib HTTP)
grep -q "urllib.request" scripts/smoke.py

# 4. References all 5 expected SSE stages
for stage in rules triage rag reasoning complete; do
  grep -q "\"$stage\"" scripts/smoke.py || echo "MISSING stage: $stage"
done

# 5. References all 5 new traceability fields
for field in model_used generated_at corpus_version consensus_paths consensus_agreement_ratio; do
  grep -q "$field" scripts/smoke.py || echo "MISSING field: $field"
done

# 6. References case_01 BPPV (the safe-case)
grep -q "case_01_bppv_clasico" scripts/smoke.py

# 7. Has exit code logic
grep -qE "sys.exit\(0\)|sys.exit\(1\)" scripts/smoke.py

# 8. Has a docstring at the top explaining what it is and isn't
head -30 scripts/smoke.py | grep -qi "smoke"
head -30 scripts/smoke.py | grep -qi "not a replacement\|not.*pytest\|alive"

# 9. Script is syntactically valid
python3 -c "import ast; ast.parse(open('scripts/smoke.py').read())"

# 10. Manual run: should exit 1 with a clear error when uvicorn is not running
python3 scripts/smoke.py 2>&1 | grep -qi "uvicorn\|not.*running\|connection"
echo "smoke.py runs cleanly when API is down: $?"
# expected: 0 (grep found the expected error message)
```

---

### Task B — `scripts/smoke.sh`

**Goal:** a 1-screen bash wrapper for users who don't want to think about Python. Calls `smoke.py` and exits with its status code.

**File location:** `scripts/smoke.sh` at repo root. Make it executable.

**Required content:**

```bash
#!/usr/bin/env bash
# VertigoDx smoke test — verifies the system is alive in ~60 seconds.
#
# Run this BEFORE recording the demo video and AFTER any hotfix.
# It does NOT replace pytest E2E or the manual 8-point smoke test (D3-T09).
# See scripts/smoke.py docstring for the full rationale.
#
# Prerequisites:
#   - uvicorn running on port 8000 (cd backend && .venv/bin/uvicorn app.main:app --port 8000)
#   - Ollama service up with gemma4:e4b model pulled
#
# Exit codes:
#   0 = all 5 checks pass — system is alive
#   1 = at least one check failed — see output for which

set -e
cd "$(dirname "$0")/.."

# Prefer the project venv's python if available; fall back to system python3.
if [ -x backend/.venv/bin/python ]; then
  PYTHON=backend/.venv/bin/python
else
  PYTHON=python3
fi

exec "$PYTHON" scripts/smoke.py
```

Make it executable:

```bash
chmod +x scripts/smoke.sh
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
test -x scripts/smoke.sh
head -1 scripts/smoke.sh | grep -q "#!/usr/bin/env bash"
grep -q "exec.*scripts/smoke.py" scripts/smoke.sh
```

---

### Task C — Final commit + push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected new files only:
#   scripts/smoke.py
#   scripts/smoke.sh
#
# No other files should be modified. If anything in backend/ or frontend/ is
# touched, STOP — that wasn't your task.

git push origin main
```

Commit message: `feat(scripts): automated smoke test — 5 checks in ~60s validate system aliveness`.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch ANY backend/ file | Out of scope. Script is read-only against the API. |
| Touch ANY frontend/ file | Same. |
| Touch `backend/scripts/eval_prompts.py` | That's a different tool (Day 2 prompt iteration helper). |
| Touch `pyproject.toml` to add a dependency | Script is stdlib-only. |
| Use httpx, requests, rich, click, typer, aiohttp | Stdlib only. urllib.request + json + sys. |
| Load the gemma4:26b heavy model in any check | RAM-safe — only use case_01 BPPV. |
| Run check 5 (`/demo-cases`) first | Order matters: healthcheck first, then sync diagnose (which warms the model), then stream (which reuses the warm model), then demo-cases (cheap). |
| Add a `--verbose` flag or any CLI argument parsing | Keep it dead simple — no flags. If we need flags later, the senior agent will add them. |
| Write tests for the smoke test | Meta-yak-shaving. The smoke test IS the test. |
| Create a `README.md` for the script | The docstring at the top of `smoke.py` is enough. |
| Edit `AGENT_HANDOFF*.md` | Senior owns them. |
| Commit anything under `docs/` or `resources/` | Gitignored. |

---

## 5. When to stop and ask

1. Acceptance check #2 fails — meaning you imported a banned library. Replace with `urllib.request`.
2. Acceptance check #9 fails — script has a syntax error. Fix it.
3. Acceptance check #10 fails — script doesn't exit cleanly when uvicorn is down. Add a try/except around the healthcheck.
4. You realize the SSE parsing is non-trivial and you'd need to add a dependency to do it well. Don't — read the frontend `streamDiagnose` for reference; the protocol is just "data: " prefix + JSON + blank line.
5. You're tempted to add a 6th check or a CLI flag. Don't — stick to the spec.

---

## 6. After Tasks A–C ship

1. One-paragraph summary of what changed.
2. `git log --oneline -3`.
3. Confirm that running `./scripts/smoke.sh` WITHOUT uvicorn produces a clear error and exit 1.
4. Note in your summary: did you also run it WITH uvicorn? If yes, report the timing. If no (because uvicorn is busy elsewhere), say so honestly — the senior agent will run it.
5. Stop.

---

## 7. Reference: the SSE frame format

Each frame is:

```
data: {"stage": "<name>", "payload": {...}}

```

Frames are separated by `"\n\n"` (blank line). Read the response body in chunks, accumulate in a buffer, split on `"\n\n"`, parse each frame starting with `"data: "`.

The full event sequence for case_01 BPPV (which your script must observe):

```
data: {"stage": "rules", "payload": {"candidates": [...]}}

data: {"stage": "triage", "payload": {"stroke_alert": {...}}}

data: {"stage": "rag", "payload": {"chunks_retrieved": 3, "titles": [...]}}

data: {"stage": "reasoning", "payload": {<full DiagnosticResult>}}

data: {"stage": "complete", "payload": {"processing_time_ms": <int>}}
```

For stroke (case_04), there's an extra `model_loading` event between `rag` and `reasoning` — but your script never tests stroke, so you don't have to handle it.

---

**End of handoff.**
