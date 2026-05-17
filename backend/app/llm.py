"""Gemma 4 client via Ollama, with load-aware model autoscaler and
Self-Consistency safety for stroke cases.

Memory model on a 24GB Apple Silicon Mac:
    - gemma4:e4b               ≈  9.6 GB RAM   → primary, cheap, low-pressure
    - gemma4:26b-a4b-it-q4_K_M ≈ 17.0 GB RAM   → reserved for critical cases

Strategy: route every request through e4b by default; promote to 26b only
when the deterministic triage layer has flagged a stroke (where clinical
reasoning quality matters most). The OLLAMA_MAX_LOADED_MODELS=1 service
setting guarantees the two models do not co-reside in RAM.

Self-Consistency (Wang et al., ICLR 2023): for stroke-triggered cases, run
the LLM 3 times with varying temperature and verify that all paths agree on
the urgency-referral framing (V2 prompt invariant: first sentence starts
with "Derivación" or "Activar"). The extra cost (3× inference) is paid only
where the patient's life is at risk; non-stroke cases keep the single-call
path. The returned dict carries `_consensus_paths` and
`_consensus_agreement_ratio` keys so callers can surface disagreement to
the clinician.

Overrides:
    VERTIGODX_FORCE_HEAVY=1       → pin every call to 26b (demo-day mode)
    VERTIGODX_SELF_CONSISTENCY=0  → disable SC even on stroke (fast iteration)
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

# Env vars
ENV_FORCE_HEAVY = "VERTIGODX_FORCE_HEAVY"
ENV_DISABLE_SC = "VERTIGODX_SELF_CONSISTENCY"  # set to "0" to disable

# Self-Consistency parameters
SC_TEMPERATURES: tuple[float, ...] = (0.3, 0.5, 0.7)
SC_URGENCY_PREFIXES: tuple[str, ...] = ("derivación", "activar")


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
        A dict with at minimum these five keys:
            - "clinical_reasoning": str
            - "next_steps": list[str]
            - "limitations": str
            - "_consensus_paths": int (1 for non-stroke; up to len(SC_TEMPERATURES) for stroke)
            - "_consensus_agreement_ratio": float in [0.0, 1.0]
              (fraction of paths whose reasoning starts with an urgency cue)

    Falls back to the light model if the chosen model raises an error.
    """
    chosen = model or pick_model(stroke_triggered)
    user_prompt = build_user_prompt(
        responses_summary, rule_candidates, stroke_alert, rag_context
    )

    # Self-Consistency only activates for stroke cases (where reasoning
    # quality matters most) and only when the env override isn't disabling it.
    use_self_consistency = (
        stroke_triggered and os.getenv(ENV_DISABLE_SC, "1") != "0"
    )

    if not use_self_consistency:
        out = _call_ollama_with_fallback(chosen, user_prompt, temperature)
        # Sentinel values so downstream consumers can treat all responses uniformly.
        out["_consensus_paths"] = 1
        out["_consensus_agreement_ratio"] = 1.0
        return out

    return _self_consistent_reasoning(chosen, user_prompt)


def _self_consistent_reasoning(model: str, user_prompt: str) -> dict:
    """Run N inference paths with varying temperature; vote on urgency framing.

    Returns the lowest-temperature output (most deterministic) augmented with
    consensus metadata. If any path raises an exception it is skipped — only
    a complete failure (zero successful paths) propagates the error up.
    """
    outputs: list[dict] = []
    for t in SC_TEMPERATURES:
        try:
            outputs.append(_call_ollama_with_fallback(model, user_prompt, t))
        except Exception:
            # Don't let one failed path bring down the whole vote.
            continue

    if not outputs:
        raise RuntimeError(
            f"All {len(SC_TEMPERATURES)} self-consistency paths failed for stroke case"
        )

    urgency_votes = sum(
        1 for o in outputs if _starts_with_urgency_cue(o.get("clinical_reasoning", ""))
    )
    agreement_ratio = urgency_votes / len(outputs)

    best = outputs[0]  # lowest temperature = most stable
    best["_consensus_paths"] = len(outputs)
    best["_consensus_agreement_ratio"] = agreement_ratio
    return best


def _starts_with_urgency_cue(reasoning: str) -> bool:
    """V2 prompt invariant: first sentence starts with 'Derivación' or 'Activar'."""
    first = reasoning.split(".", 1)[0].strip().lower()
    return any(first.startswith(p) for p in SC_URGENCY_PREFIXES)


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
