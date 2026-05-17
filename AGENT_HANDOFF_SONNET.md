# Agent handoff — Sonnet 4.6 (round 4)

**Target agent:** Claude Sonnet 4.6.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-17, round 4.
**Previous rounds shipped:** ResultPanel, /demo page, shared types + API helpers, OfflineBadge polish, CONTRIBUTING.md, SECURITY.md. Discipline across rounds: A.

This is a small but high-leverage round. Two trazability features that take ~1 hour combined but signal "this team thinks about reproducibility and audit trails" to the clinical-safety judge.

You are running in **parallel** with Opus 4.6 thinking (`AGENT_HANDOFF_OPUS46.md`). Opus 4.6 is adding live pipeline progress in the frontend — touching `lib/api.ts`, a new `PipelineProgress.tsx`, and both `/diagnose` and `/demo` pages. Your work is **disjoint**: backend schema additions + `ResultPanel` footer only.

---

## 0. Read these files first

1. `CLAUDE.md` (especially the autoscaler invariant)
2. `backlog.yaml` runtime_decisions block
3. `backend/app/schemas.py` — you add 3 fields to `DiagnosticResult`
4. `backend/app/main.py` — you populate those 3 fields in `/diagnose` and `/diagnose/stream`
5. `backend/app/llm.py` — read-only: confirm that `pick_model()` returns the model name string you need to surface
6. `frontend/components/ResultPanel.tsx` — you add a small footer block; keep everything else untouched
7. `frontend/lib/types.ts` — you mirror the 3 new fields here
8. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All UX strings in Spanish. |
| R2 | All code, comments, commits in English. |
| R3 | Never touch `backend/app/llm.py`, `rules.py`, `triage.py`, `rag.py`, `prompts.py`. |
| R4 | Backend changes are **additive only** — add new optional fields, don't change existing ones. |
| R5 | Never touch any frontend file other than `frontend/components/ResultPanel.tsx` and `frontend/lib/types.ts`. |
| R6 | The parallel agent (Opus 4.6 thinking) owns `lib/api.ts`, `components/PipelineProgress.tsx`, `app/demo/page.tsx`, `app/diagnose/page.tsx`. Do NOT touch them. |
| R7 | Push directly to `main` with Conventional Commits. |
| R8 | Never commit under `docs/` or `resources/`. |
| R9 | No new dependencies. Use Python's standard `hashlib` and `datetime`. |

---

## 2. What is already done

- Backend: complete. Endpoints `/healthcheck`, `/diagnose`, `/diagnose/stream`, `/demo-cases`. The autoscaler is sacred — `pick_model()` is the single decision point in `llm.py`.
- Frontend: complete with shared types, API helpers, real components, polished landing.
- Tests: 7 unit + 4 light E2E + 1 healthcheck all passing.

You are NOT redoing any of this.

---

## 3. Your assignment

| Task | Estimated time | File(s) |
|---|---|---|
| A | Add 3 new optional fields to `DiagnosticResult` (Pydantic) | 15 min |
| B | Populate those fields in both `/diagnose` and `/diagnose/stream` | 20 min |
| C | Mirror the 3 fields in `frontend/lib/types.ts` | 5 min |
| D | Render them in `ResultPanel` footer | 20 min |
| E | Final commit + push | 5 min |

---

### Task A — Add 3 fields to `DiagnosticResult`

**Goal:** add `model_used`, `generated_at`, and `corpus_version` as optional fields on the `DiagnosticResult` Pydantic model. Optional so existing tests don't regress.

**Edit `backend/app/schemas.py`.** Find the `DiagnosticResult` class (currently last in the file) and add three fields after `processing_time_ms`:

```python
class DiagnosticResult(BaseModel):
    """Full payload returned by POST /diagnose."""

    differential: list[DiagnosisCandidate]
    stroke_alert: StrokeAlert
    clinical_reasoning: str
    next_steps: list[str]
    limitations: str
    processing_time_ms: int | None = None
    # --- NEW ---
    model_used: str | None = Field(
        default=None,
        description="Ollama model name that produced clinical_reasoning (e.g. 'gemma4:e4b').",
    )
    generated_at: str | None = Field(
        default=None,
        description="ISO 8601 UTC timestamp of when the response was produced.",
    )
    corpus_version: str | None = Field(
        default=None,
        description="First 12 hex chars of SHA-256 of icvd_corpus.md — for reproducibility.",
    )
```

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"
.venv/bin/python -c "
from app.schemas import DiagnosticResult
fields = DiagnosticResult.model_fields
assert 'model_used' in fields
assert 'generated_at' in fields
assert 'corpus_version' in fields
# All three must be optional (no required default)
for k in ('model_used', 'generated_at', 'corpus_version'):
    assert fields[k].default is None, f'{k} must default to None'
print('schema OK')
"
.venv/bin/python -m pytest tests/test_demo_cases.py -q
```

---

### Task B — Populate the 3 fields in `main.py`

**Goal:** at the point where the `DiagnosticResult` is constructed (both in `/diagnose` and `/diagnose/stream`), pass the three new values.

**Step 1:** add a module-level constant near the top of `backend/app/main.py` (after the imports):

```python
import hashlib
from datetime import datetime, timezone

from .llm import MODEL_HEAVY, MODEL_LIGHT, pick_model, reason_clinically
from .rag import CORPUS_PATH, get_store
# ... other existing imports ...

# SHA-256 of icvd_corpus.md, computed once at import time so it's free per request.
CORPUS_VERSION: str = hashlib.sha256(CORPUS_PATH.read_bytes()).hexdigest()[:12]
```

Note: `CORPUS_PATH` is exported from `rag.py` (verify with `grep -n CORPUS_PATH backend/app/rag.py` — it is at the top). If `CORPUS_PATH` is not exported, do NOT modify `rag.py`; instead compute the path inline:

```python
_corpus_path = Path(__file__).parent / "data" / "icvd_corpus.md"
CORPUS_VERSION: str = hashlib.sha256(_corpus_path.read_bytes()).hexdigest()[:12]
```

**Step 2:** update the `DiagnosticResult(...)` construction in `/diagnose` (around line 156-164). Change:

```python
return DiagnosticResult(
    differential=candidates[:3],
    stroke_alert=stroke_alert,
    clinical_reasoning=llm_output.get("clinical_reasoning", ""),
    next_steps=llm_output.get("next_steps", []),
    limitations=llm_output.get("limitations", ""),
    processing_time_ms=elapsed_ms,
)
```

To:

```python
return DiagnosticResult(
    differential=candidates[:3],
    stroke_alert=stroke_alert,
    clinical_reasoning=llm_output.get("clinical_reasoning", ""),
    next_steps=llm_output.get("next_steps", []),
    limitations=llm_output.get("limitations", ""),
    processing_time_ms=elapsed_ms,
    model_used=pick_model(stroke_triggered=stroke_alert.triggered),
    generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    corpus_version=CORPUS_VERSION,
)
```

**Step 3:** do the EXACT same change in `/diagnose/stream` — find where `result = DiagnosticResult(...)` is constructed (around line 240) and add the same three kwargs.

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"

# 1. Both endpoints set the three fields
grep -c "model_used=pick_model" app/main.py
# expected: 2 (once per endpoint)
grep -c "corpus_version=CORPUS_VERSION" app/main.py
# expected: 2

# 2. CORPUS_VERSION is computed at module level
grep -q "CORPUS_VERSION.*sha256" app/main.py
grep -q "hashlib" app/main.py

# 3. Existing tests still pass
.venv/bin/python -m pytest tests/test_demo_cases.py -q
# expected: 7 passed

# 4. Lint clean
.venv/bin/ruff check app/main.py
```

---

### Task C — Mirror the 3 fields in `frontend/lib/types.ts`

**Goal:** keep the frontend type in sync with the backend schema.

**Edit `frontend/lib/types.ts`.** Find the `DiagnosticResult` type and add the three new fields after `processing_time_ms`:

```typescript
export type DiagnosticResult = {
  differential: DiagnosisCandidate[];
  stroke_alert: StrokeAlert;
  clinical_reasoning: string;
  next_steps: string[];
  limitations: string;
  processing_time_ms?: number | null;
  // --- NEW ---
  model_used?: string | null;
  generated_at?: string | null;
  corpus_version?: string | null;
};
```

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
grep -q "model_used" lib/types.ts
grep -q "generated_at" lib/types.ts
grep -q "corpus_version" lib/types.ts
npm run build
```

---

### Task D — Render in `ResultPanel` footer

**Goal:** add a small block to the existing footer row in `ResultPanel.tsx` showing model, timestamp, and corpus hash. Keep the existing `processing_time_ms` line; add the new metadata as a second line below it.

**Edit `frontend/components/ResultPanel.tsx`.** Find the footer row (around line 207-220). Currently:

```tsx
<div className="flex items-center justify-between pt-2">
  <div>
    {processing_time_ms != null && (
      <p className="text-xs text-muted-foreground">
        Procesado en {(processing_time_ms / 1000).toFixed(1)}s · 100% local · sin internet
      </p>
    )}
  </div>
  <Button variant="outline" onClick={onRestart}>
    <RotateCcw className="w-4 h-4 mr-2" />
    Nueva evaluación
  </Button>
</div>
```

Change to:

```tsx
<div className="flex items-end justify-between pt-2 gap-4">
  <div className="space-y-1 text-xs text-muted-foreground">
    {processing_time_ms != null && (
      <p>
        Procesado en {(processing_time_ms / 1000).toFixed(1)}s · 100% local · sin internet
      </p>
    )}
    {(result.model_used || result.generated_at || result.corpus_version) && (
      <p className="font-mono text-[10px] leading-tight">
        {result.model_used && <>Modelo: {result.model_used}</>}
        {result.model_used && result.generated_at && <> · </>}
        {result.generated_at && <>Generado: {result.generated_at}</>}
        {(result.model_used || result.generated_at) && result.corpus_version && <> · </>}
        {result.corpus_version && <>Corpus: {result.corpus_version}</>}
      </p>
    )}
  </div>
  <Button variant="outline" onClick={onRestart}>
    <RotateCcw className="w-4 h-4 mr-2" />
    Nueva evaluación
  </Button>
</div>
```

Adjust the destructuring at the top of the component (where `processing_time_ms` is currently destructured) to include `model_used`, `generated_at`, `corpus_version` — OR just reference them via `result.<field>` as in the snippet above. Either works; the snippet uses the latter so you don't need to touch the destructuring.

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
grep -q "Modelo:" components/ResultPanel.tsx
grep -q "Generado:" components/ResultPanel.tsx
grep -q "Corpus:" components/ResultPanel.tsx
grep -q "font-mono" components/ResultPanel.tsx
npm run build
```

---

### Task E — Final commit + push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected modified files only:
#   backend/app/schemas.py
#   backend/app/main.py
#   frontend/lib/types.ts
#   frontend/components/ResultPanel.tsx
#
# If lib/api.ts, app/demo/page.tsx, app/diagnose/page.tsx, or
# PipelineProgress.tsx show as modified — STOP, that's Opus 4.6's lane.

git push origin main
```

Commit message: `feat: traceability fields — model_used, generated_at, corpus SHA-256 hash`.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `backend/app/llm.py`, `rules.py`, `triage.py`, `rag.py`, `prompts.py` | Frozen. Senior only. |
| Touch `frontend/lib/api.ts` | Opus 4.6 is adding `streamDiagnose` there. |
| Touch `frontend/components/PipelineProgress.tsx` (new file from Opus 4.6) | Owned by parallel agent. |
| Touch `frontend/app/demo/page.tsx` or `app/diagnose/page.tsx` | Opus 4.6 rewires them. |
| Add a new shadcn component or new npm dependency | Use plain Tailwind + native APIs. |
| Compute CORPUS_VERSION inside the request handler (per-request) | Module-level only — it's static for the process lifetime. |
| Render the corpus hash in a "scary" way (big red text, warning icon) | It's a quiet trazability detail in muted mono font. |

---

## 5. When to stop and ask

1. Acceptance check fails.
2. `pytest` regresses.
3. `git status` shows files outside your assigned set as modified.
4. `CORPUS_PATH` doesn't exist in `rag.py` AND you've already tried both approaches (export it OR inline path).

---

## 6. After Tasks A–E ship

1. One-paragraph summary including the actual CORPUS_VERSION your run produced.
2. `git log --oneline -3`.
3. Stop.

---

**End of handoff.**
