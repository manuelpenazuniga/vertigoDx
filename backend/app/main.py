"""VertigoDx MVP FastAPI app.

Pipeline (per `POST /diagnose`):
    1. Rule engine    → list of DiagnosisCandidate
    2. Triage         → StrokeAlert (and the autoscaler signal)
    3. RAG retrieval  → relevant ICVD corpus chunks
    4. Gemma 4 client → structured clinical reasoning JSON
    5. Pydantic       → DiagnosticResult returned to caller

100% local. Ollama at localhost:11434 is the only external process touched.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .llm import MODEL_HEAVY, MODEL_LIGHT, pick_model, reason_clinically
from .rag import CORPUS_PATH, get_store
from .rules import run_all_rules
from .schemas import DiagnosisCandidate, DiagnosticResult, PatientResponses, StrokeAlert
from .triage import calculate_stroke_alert

# SHA-256 of icvd_corpus.md — computed once at import time (static per process).
CORPUS_VERSION: str = hashlib.sha256(CORPUS_PATH.read_bytes()).hexdigest()[:12]


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D401 — FastAPI lifespan signature
    """Warmup hook — pre-load the RAG store and the light Gemma model.

    Heavy model (26b) is intentionally NOT warmed up here. It loads on demand
    only when the autoscaler detects a triggered stroke case.
    """
    # Materialize the RAG collection (parses corpus, embeds chunks).
    get_store()
    # Warm e4b: tiny request so first real call returns within seconds.
    try:
        ollama.chat(
            model=MODEL_LIGHT,
            messages=[{"role": "user", "content": "Listo."}],
            options={"num_predict": 5},
        )
    except Exception:
        # Do not block startup if Ollama is unavailable; /healthcheck will reflect it.
        pass
    yield


app = FastAPI(
    title="VertigoDx API",
    description="Privacy-first vestibular diagnosis API — Gemma 4 + Ollama, 100% local.",
    version="0.1.0a0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthcheck")
def healthcheck() -> dict:
    return {
        "status": "ok",
        "model_light": MODEL_LIGHT,
        "model_heavy": "gemma4:26b-a4b-it-q4_K_M",
        "autoscaler": "stroke-triggered routes to heavy; otherwise light",
        "offline": True,
    }


@app.get("/demo-cases")
def list_demo_cases() -> list[dict]:
    """Return the 5 scripted clinical demo cases for the frontend to display."""
    cases_path = (
        Path(__file__).resolve().parents[2] / "data" / "demo_cases.json"
    )
    return json.loads(cases_path.read_text(encoding="utf-8"))


def _format_responses_for_llm(r: PatientResponses) -> str:
    return "\n".join(
        [
            f"- Duración del episodio: {r.episode_duration.value}",
            f"- Desencadenante: {r.trigger.value}",
            f"- Síntomas auditivos: {r.hearing_status.value}",
            f"- Historia de migraña: {r.migraine_history.value}",
            f"- Náusea / vómito: {r.nausea_vomiting.value}",
            f"- Edad: {r.age_bracket.value}",
            f"- Inicio: {r.onset.value}",
            f"- Marcha: {r.gait.value}",
            f"- Banderas rojas neurológicas: {'Sí' if r.neuro_red_flags else 'No'}",
            f"- Riesgo cardiovascular: {r.cv_risk.value}",
        ]
    )


def _format_candidates_for_llm(candidates: list[DiagnosisCandidate]) -> str:
    lines: list[str] = []
    for c in candidates:
        lines.append(
            f"**{c.diagnosis}** (confianza: {c.confidence.value})\n"
            f"  Cumple: {', '.join(c.supporting_criteria) or 'ninguno'}\n"
            f"  Falta:  {', '.join(c.missing_criteria) or 'ninguno'}"
        )
    return "\n".join(lines)


def _format_stroke_alert(alert: StrokeAlert) -> str:
    """Render the alert block. Avoid the English word 'stroke' here so the
    LLM does not pick it up by mimicry — V2 prompt forbids it in the output."""
    return (
        f"Disparada: {'SÍ' if alert.triggered else 'NO'}\n"
        f"Urgencia: {alert.urgency}\n"
        f"Score HINTS-adaptado: {alert.score_hints}\n"
        f"STANDING: {alert.score_standing}\n"
        f"Razón: {alert.reason}"
    )


@app.post("/diagnose", response_model=DiagnosticResult)
def diagnose(responses: PatientResponses) -> DiagnosticResult:
    start = time.perf_counter()

    # 1. Deterministic rule engine — produces the candidate pool.
    candidates = run_all_rules(responses)

    # 2. Stroke triage — drives the alert + the autoscaler.
    stroke_alert = calculate_stroke_alert(responses)

    # 3. RAG retrieval — query against the top-2 candidates plus alert flag.
    store = get_store()
    rag_query = (
        f"{candidates[0].diagnosis} {candidates[1].diagnosis} criterios diagnósticos"
    )
    rag_chunks = store.retrieve(rag_query, k=3)
    rag_context = "\n\n".join(c["content"] for c in rag_chunks)

    # 4. Gemma 4 reasoning — heavy model only when stroke alert triggers.
    llm_output = reason_clinically(
        responses_summary=_format_responses_for_llm(responses),
        rule_candidates=_format_candidates_for_llm(candidates),
        stroke_alert=_format_stroke_alert(stroke_alert),
        rag_context=rag_context,
        stroke_triggered=stroke_alert.triggered,
    )

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return DiagnosticResult(
        differential=candidates[:3],
        stroke_alert=stroke_alert,
        clinical_reasoning=llm_output.get("clinical_reasoning", ""),
        next_steps=llm_output.get("next_steps", []),
        limitations=llm_output.get("limitations", ""),
        processing_time_ms=elapsed_ms,
        model_used=pick_model(stroke_triggered=stroke_alert.triggered),
        generated_at=datetime.now(UTC).isoformat(timespec="seconds"),
        corpus_version=CORPUS_VERSION,
    )


def _sse(stage: str, payload: dict) -> str:
    """Format one Server-Sent Events frame.

    Uses ensure_ascii=False so Spanish characters (a, e, n) travel as
    UTF-8 directly instead of JSON-escaped sequences.
    """
    body = json.dumps({"stage": stage, "payload": payload}, ensure_ascii=False)
    return f"data: {body}\n\n"


@app.post("/diagnose/stream")
async def diagnose_stream(responses: PatientResponses) -> StreamingResponse:
    """Stream the diagnostic pipeline as Server-Sent Events.

    Mirrors POST /diagnose semantically but pushes per-stage updates so the
    frontend can render progressive feedback during the 3-5s Gemma inference.
    The autoscaler decision is unchanged -- stroke-triggered cases still
    route through the heavy model via pick_model().
    """

    async def event_generator():
        start = time.perf_counter()

        # Stage 1: deterministic rule engine
        candidates = run_all_rules(responses)
        yield _sse("rules", {"candidates": [c.model_dump(mode="json") for c in candidates]})
        await asyncio.sleep(0)  # yield to event loop so the frame flushes

        # Stage 2: stroke triage (drives the autoscaler)
        stroke_alert = calculate_stroke_alert(responses)
        yield _sse("triage", {"stroke_alert": stroke_alert.model_dump(mode="json")})
        await asyncio.sleep(0)

        # Stage 3: RAG retrieval (emit titles only — chunk bodies are too noisy)
        store = get_store()
        rag_query = (
            f"{candidates[0].diagnosis} {candidates[1].diagnosis} criterios diagnosticos"
        )
        rag_chunks = store.retrieve(rag_query, k=3)
        rag_context = "\n\n".join(c["content"] for c in rag_chunks)
        yield _sse("rag", {
            "chunks_retrieved": len(rag_chunks),
            "titles": [c["title"] for c in rag_chunks],
        })
        await asyncio.sleep(0)

        # Optional: notify the client that the heavy model is loading.
        # When stroke_alert.triggered is true, the autoscaler routes to
        # the 17 GB 26b model which may need 30+ seconds to load from
        # disk the first time. This event lets the frontend show a
        # specific loading message instead of a generic spinner.
        if stroke_alert.triggered:
            yield _sse("model_loading", {"model": MODEL_HEAVY})
            await asyncio.sleep(0)

        # Stage 4: Gemma reasoning — the slow step.
        # ollama.chat() is blocking I/O. Running it directly in the async
        # generator would block the event loop, preventing earlier events
        # from flushing to the client (they'd all arrive at once when the
        # LLM finishes). asyncio.to_thread offloads it to a thread pool,
        # keeping the event loop free to push the rules/triage/rag events
        # to the response writer while the model runs.
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
            model_used=pick_model(stroke_triggered=stroke_alert.triggered),
            generated_at=datetime.now(UTC).isoformat(timespec="seconds"),
            corpus_version=CORPUS_VERSION,
        )
        yield _sse("reasoning", result.model_dump(mode="json"))

        # Stage 5: complete sentinel — client should close the stream.
        yield _sse("complete", {"processing_time_ms": elapsed_ms})

    return StreamingResponse(event_generator(), media_type="text/event-stream")
