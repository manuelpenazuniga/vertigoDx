# Agent handoff — Opus 4.6 thinking (round 3)

**Target agent:** Claude Opus 4.6 with extended thinking enabled.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16, round 3.
**Previous rounds shipped:** commits `9d1e408` (QuestionWizard with internalStep defense), `6240af0` (cover.svg + cover.png). Both reviewed and merged with high marks.

This document is the contract. Use extended thinking on the streaming lifecycle and shutdown handling. Use direct execution on the boilerplate of the endpoint signature.

You are running in **parallel** with Sonnet 4.6 (see `AGENT_HANDOFF_SONNET.md`). Sonnet is writing `CONTRIBUTING.md`, `SECURITY.md`, and enhancing `OfflineBadge.tsx`. Your work and theirs are file-disjoint.

---

## 0. Read these files first, in this order

1. `CLAUDE.md` — invariants, code style.
2. `backlog.yaml` — see D2-T06 (your target), runtime_decisions.
3. `backend/app/main.py` — the file you will modify (additively only — do not change `/healthcheck`, `/demo-cases`, `/diagnose`, or the lifespan hook).
4. `backend/app/llm.py` — read-only context. Understand `pick_model()` and the autoscaler before touching anything that calls `reason_clinically`.
5. `backend/app/rules.py`, `backend/app/triage.py`, `backend/app/rag.py` — read-only context. Your endpoint reuses them; understand their signatures.
6. This file.

Do **not** read anything under `docs/` or `resources/` — gitignored.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All clinical UX strings remain in Spanish — JSON payload values too. |
| R2 | All code, comments, commits in English. |
| R3 | Never modify the existing `/healthcheck`, `/demo-cases`, `/diagnose` endpoints. ONLY add a new endpoint. |
| R4 | Never modify the lifespan hook or the `warmup` call. |
| R5 | Never modify `llm.py`, `rules.py`, `triage.py`, `rag.py`, `schemas.py`, `prompts.py`. |
| R6 | The autoscaler invariant is sacred. Your new endpoint must pass `stroke_triggered=stroke_alert.triggered` to `reason_clinically` (or equivalent). Do NOT route the heavy model directly. |
| R7 | Push directly to `main` with Conventional Commits. |
| R8 | Never commit under `docs/` or `resources/`. |
| R9 | No new dependencies. |
| R10 | The parallel Sonnet 4.6 agent is touching `frontend/components/OfflineBadge.tsx`, `CONTRIBUTING.md`, `SECURITY.md`. Do not touch any of those. |

---

## 2. What is already done

- Backend: `/healthcheck`, `/diagnose`, `/demo-cases` endpoints live. Rule engine, triage, RAG, Gemma 4 client with load-aware autoscaler all functional. 7 unit tests + 4 light E2E tests passing.
- Frontend: complete. The streaming endpoint you add today will be consumed in a future task — your scope is backend-only.

---

## 3. Your assignment — D2-T06 (the streaming half)

D2-T06 has three parts: `/demo-cases`, `/diagnose/stream`, and a startup warmup. The first and third are already shipped (Gemini and Day-1 me). You finish the second.

### Goal

Add `POST /diagnose/stream` that mirrors the synchronous `/diagnose` endpoint but emits progress events via Server-Sent Events (SSE). The frontend can subscribe with `EventSource` and render each stage as it completes — making the 3-5-second Gemma inference feel responsive instead of opaque.

### Event format

The stream emits text/event-stream chunks. Each chunk is one `data:` line followed by a blank line, per the SSE spec:

```
data: {"stage": "rules", "payload": {...}}

data: {"stage": "triage", "payload": {...}}

...
```

Specifically, emit these five events in order, exactly once each:

| Stage | Payload shape | When |
|---|---|---|
| `rules` | `{"candidates": [DiagnosisCandidate, ...]}` | Immediately after `run_all_rules()` returns. |
| `triage` | `{"stroke_alert": StrokeAlert}` | After `calculate_stroke_alert()`. |
| `rag` | `{"chunks_retrieved": int, "titles": [str, ...]}` | After RAG retrieval. Do NOT include chunk bodies — too noisy on the wire. |
| `reasoning` | The full DiagnosticResult object (same shape as the sync endpoint's response) | After Gemma completes. |
| `complete` | `{"processing_time_ms": int}` | Final signal. The client should close the stream after this. |

All payloads must use the existing Pydantic models' `.model_dump(mode="json")` so enum values serialize the same way as the sync endpoint.

### Required imports (add to `backend/app/main.py` only if not already there)

```python
import asyncio
import json
from fastapi.responses import StreamingResponse
```

### Implementation skeleton (you fill the body)

```python
@app.post("/diagnose/stream")
async def diagnose_stream(responses: PatientResponses) -> StreamingResponse:
    """Stream the diagnostic pipeline as Server-Sent Events.

    Mirrors POST /diagnose semantically but pushes per-stage updates so the
    frontend can render progressive feedback during the Gemma inference.
    The autoscaler decision is unchanged — stroke-triggered cases still
    route through the heavy model.
    """

    async def event_generator():
        start = time.perf_counter()

        # Stage 1: rules
        candidates = run_all_rules(responses)
        yield _sse("rules", {"candidates": [c.model_dump(mode="json") for c in candidates]})
        await asyncio.sleep(0)  # let the event flush

        # Stage 2: triage
        stroke_alert = calculate_stroke_alert(responses)
        yield _sse("triage", {"stroke_alert": stroke_alert.model_dump(mode="json")})
        await asyncio.sleep(0)

        # Stage 3: RAG
        store = get_store()
        rag_query = (
            f"{candidates[0].diagnosis} {candidates[1].diagnosis} criterios diagnósticos"
        )
        rag_chunks = store.retrieve(rag_query, k=3)
        rag_context = "\n\n".join(c["content"] for c in rag_chunks)
        yield _sse("rag", {
            "chunks_retrieved": len(rag_chunks),
            "titles": [c["title"] for c in rag_chunks],
        })
        await asyncio.sleep(0)

        # Stage 4: Gemma reasoning (the slow step)
        # Run the blocking ollama.chat in a thread so we don't block the event loop.
        llm_output = await asyncio.to_thread(
            reason_clinically,
            responses_summary=_format_responses_for_llm(responses),
            rule_candidates=_format_candidates_for_llm(candidates),
            stroke_alert=_format_stroke_alert(stroke_alert),
            rag_context=rag_context,
            stroke_triggered=stroke_alert.triggered,
        )

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        result = DiagnosticResult(
            differential=candidates[:3],
            stroke_alert=stroke_alert,
            clinical_reasoning=llm_output.get("clinical_reasoning", ""),
            next_steps=llm_output.get("next_steps", []),
            limitations=llm_output.get("limitations", ""),
            processing_time_ms=elapsed_ms,
        )
        yield _sse("reasoning", result.model_dump(mode="json"))

        # Stage 5: complete sentinel
        yield _sse("complete", {"processing_time_ms": elapsed_ms})

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

And add this helper function (module-level, near the other `_format_*` helpers):

```python
def _sse(stage: str, payload: dict) -> str:
    """Format one Server-Sent Events frame."""
    body = json.dumps({"stage": stage, "payload": payload}, ensure_ascii=False)
    return f"data: {body}\n\n"
```

### Use extended thinking on

1. **Why `asyncio.to_thread` for the LLM call?** The `ollama.chat()` call is blocking I/O. Running it directly inside an async generator blocks the event loop, which prevents earlier events from actually being flushed to the client — they all arrive at the end. `to_thread` offloads to a thread, freeing the event loop to push the `rules`/`triage`/`rag` events first. Verify this in your design and document it in a comment.

2. **Why `await asyncio.sleep(0)` between yields?** It cooperatively yields to the event loop so the response writer can flush the pending event before the next stage starts. Without it, sequential `yield` statements can be coalesced. Document this too.

3. **What if the client disconnects mid-stream?** FastAPI's `StreamingResponse` handles client disconnect by raising inside the generator (the next `yield` raises). For this MVP we accept that — partial work is lost, no DB to clean up. Do NOT add complicated cleanup logic.

4. **Should we add a 26B-loading event?** The autoscaler may need to evict the light model and load the heavy 17 GB model. That can take 30+ seconds the first time. **Decision: yes**, emit an extra event `{"stage": "model_loading", "payload": {"model": "gemma4:26b-a4b-it-q4_K_M"}}` ONLY when `stroke_alert.triggered` is true and right before the `reasoning` stage starts (i.e., immediately before the `asyncio.to_thread` call). This gives the frontend a chance to show "loading the heavy model — this is the big one" instead of just spinning silently.

5. **JSON encoding of accented characters**: `ensure_ascii=False` in `json.dumps` is important so Spanish characters like `á`, `é` go over the wire as themselves, not as `á`. The frontend will display them correctly; smaller payload too.

### Acceptance criteria

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"

# 1. Endpoint registered
.venv/bin/python -c "from app.main import app; assert '/diagnose/stream' in [r.path for r in app.routes], 'not registered'"

# 2. Existing endpoints unchanged
.venv/bin/python -c "from app.main import app; assert '/diagnose' in [r.path for r in app.routes]"
.venv/bin/python -c "from app.main import app; assert '/demo-cases' in [r.path for r in app.routes]"
.venv/bin/python -c "from app.main import app; assert '/healthcheck' in [r.path for r in app.routes]"

# 3. Existing tests still pass
.venv/bin/python -m pytest tests/test_demo_cases.py -q
# expected: 7 passed

# 4. Lint clean
.venv/bin/ruff check app/main.py

# 5. Async generator wired through StreamingResponse — grep tells us the shape
grep -q "StreamingResponse" app/main.py
grep -q "media_type=\"text/event-stream\"" app/main.py
grep -q "asyncio.to_thread" app/main.py

# 6. SSE format helper present
grep -q "def _sse" app/main.py

# 7. The 5 stage names appear at least once (sanity that the generator covers all stages)
for stage in rules triage rag reasoning complete; do
  grep -q "\"$stage\"" app/main.py || { echo "missing stage: $stage"; exit 1; }
done

# 8. Optional heavy-model-loading event when stroke triggered
grep -q "model_loading" app/main.py
```

If you want a manual end-to-end check (optional, takes ~2 minutes with cold backend):

```bash
.venv/bin/uvicorn app.main:app --port 8000 &
until curl -fsS http://127.0.0.1:8000/healthcheck >/dev/null 2>&1; do sleep 5; done

# BPPV case (light model)
curl -N -X POST http://127.0.0.1:8000/diagnose/stream \
  -H "Content-Type: application/json" \
  -d '{
    "episode_duration": "under_1min",
    "trigger": "position_change",
    "hearing_status": "none",
    "migraine_history": "none",
    "nausea_vomiting": "nausea_only",
    "age_bracket": "40_60",
    "onset": "sudden",
    "gait": "normal",
    "neuro_red_flags": false,
    "cv_risk": "none"
  }'
# expected: see `data: {"stage":"rules", ...}` printed within 1 second,
# then `data: {"stage":"triage", ...}`, `data: {"stage":"rag", ...}`,
# then ~5-10 second pause, then `data: {"stage":"reasoning", ...}`,
# then `data: {"stage":"complete", ...}`.

pkill -f "uvicorn app.main"
```

Do NOT run the stroke case in this manual check — that would load the 17 GB model and you should avoid that unless explicitly asked.

Commit message: `feat(backend): /diagnose/stream SSE endpoint with per-stage events`.

Mark `D2-T06` in `backlog.yaml` as `completed` and remove the `progress_note` field that mentions the streaming work is pending.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Modify the existing `/healthcheck`, `/demo-cases`, `/diagnose` endpoints | Frozen. |
| Modify the `lifespan` hook | Frozen. |
| Modify ANY `*.py` file other than `backend/app/main.py` | Out of scope. |
| Touch ANY frontend file | Out of scope. |
| Touch `CONTRIBUTING.md`, `SECURITY.md`, `frontend/components/OfflineBadge.tsx` | Owned by parallel agent. |
| Add a new dependency to `pyproject.toml` | We're using only standard FastAPI + ollama + chromadb. |
| Add WebSocket support | The contract is SSE, not WS. They are different. |
| Add an in-memory cache or background worker | Out of scope. |
| Run the stroke demo case during testing | Loads the 17 GB heavy model and impacts the dev Mac. |
| Edit `AGENT_HANDOFF*.md` files | Senior owns them. |

---

## 5. When to stop and ask

1. Acceptance check fails after one fix attempt.
2. Existing tests regress.
3. You realize the spec contradicts itself (e.g., you can't both pass `stroke_triggered` and use `to_thread` cleanly).
4. You're tempted to refactor any of the read-only files.

---

## 6. After it ships

1. One-paragraph summary including: the exact line count added to `main.py`, whether the manual curl check was run, and what you observed.
2. `git log --oneline -3`.
3. Confirm `D2-T06` in `backlog.yaml` → completed.
4. Stop.

---

**End of handoff.** Read once more before coding.
