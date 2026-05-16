"""Gemma 4 client via Ollama, with load-aware model autoscaler.

Memory model on a 24GB Apple Silicon Mac:
    - gemma4:e4b               ≈  9.6 GB RAM   → primary, cheap, low-pressure
    - gemma4:26b-a4b-it-q4_K_M ≈ 17.0 GB RAM   → reserved for critical cases

Strategy: route every request through e4b by default; promote to 26b only
when the deterministic triage layer has flagged a stroke (where clinical
reasoning quality matters most). The OLLAMA_MAX_LOADED_MODELS=1 service
setting guarantees the two models do not co-reside in RAM.

Override: `VERTIGODX_FORCE_HEAVY=1` pins every call to 26b — useful for
demo-day recording where model consistency matters.
"""
from __future__ import annotations

import json
import os
import re

import ollama

from .prompts import SYSTEM_PROMPT_ACTIVE, build_user_prompt

# Model identifiers — keep in sync with the README + CLAUDE.md tables
MODEL_LIGHT = "gemma4:e4b"
MODEL_HEAVY = "gemma4:26b-a4b-it-q4_K_M"

# Env var to force-pin the heavy model for the entire process
ENV_FORCE_HEAVY = "VERTIGODX_FORCE_HEAVY"


def pick_model(stroke_triggered: bool) -> str:
    """Decide which Gemma variant to use for this request.

    - If `VERTIGODX_FORCE_HEAVY=1` is set, always use the heavy model.
    - Otherwise: heavy on triggered stroke cases (quality matters most),
      light everywhere else (keep the Mac responsive during dev + demo).
    """
    if os.getenv(ENV_FORCE_HEAVY) == "1":
        return MODEL_HEAVY
    return MODEL_HEAVY if stroke_triggered else MODEL_LIGHT


def reason_clinically(
    responses_summary: str,
    rule_candidates: str,
    stroke_alert: str,
    rag_context: str,
    *,
    stroke_triggered: bool = False,
    model: str | None = None,
    temperature: float = 0.3,
) -> dict:
    """Call Gemma 4 with the clinical context and return parsed JSON output.

    Args:
        responses_summary: pre-formatted patient responses block.
        rule_candidates:   pre-formatted candidates from the rule engine.
        stroke_alert:      pre-formatted stroke alert summary.
        rag_context:       concatenated RAG-retrieved corpus chunks.
        stroke_triggered:  decides autoscaling when `model` is not provided.
        model:             explicit Ollama model name; overrides autoscaling.
        temperature:       sampling temperature (default low for medical use).

    Returns:
        A dict with at minimum these three keys:
            - "clinical_reasoning": str
            - "next_steps": list[str]
            - "limitations": str

    Falls back to the light model if the chosen model raises an error.
    """
    chosen = model or pick_model(stroke_triggered)
    user_prompt = build_user_prompt(
        responses_summary, rule_candidates, stroke_alert, rag_context
    )
    return _call_ollama_with_fallback(chosen, user_prompt, temperature)


def _call_ollama_with_fallback(model: str, user_prompt: str, temperature: float) -> dict:
    try:
        return _call_ollama(model, user_prompt, temperature)
    except Exception:
        if model != MODEL_LIGHT:
            # Last-resort fallback: the lightest model that we know fits in RAM
            return _call_ollama(MODEL_LIGHT, user_prompt, temperature)
        raise


def _call_ollama(model: str, user_prompt: str, temperature: float) -> dict:
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ACTIVE},
            {"role": "user", "content": user_prompt},
        ],
        options={
            "temperature": temperature,
            "top_p": 0.95,
            "top_k": 64,
            "num_ctx": 8192,
        },
        format="json",  # native JSON mode for Gemma 4
    )
    content = response["message"]["content"]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Lenient fallback: extract the first balanced JSON object
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise
