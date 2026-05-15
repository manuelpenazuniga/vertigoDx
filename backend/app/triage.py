"""HINTS-adapted stroke triage scoring (Level 1 — self-report).

Real HINTS / STANDING / Sudbury require bedside examination. This module
encodes a weighted approximation usable from a 10-question questionnaire,
calibrated against the literature:

    - Carmona & Kaski (Eur J Neurol 2023): grade-3 truncal ataxia has
      specificity 100% for central cause → dominant weight.
    - Newman-Toker TiTrATE (Neurol Clin 2015): sudden onset + sustained
      + focal red flags = AVS-stroke pattern.
    - Sudbury Score (Atzema et al. 2025): age >65 + vascular risk
      factors contribute meaningfully.

Output is a StrokeAlert with urgency (`inmediata`, `alta`, `baja`) and a
score that drives downstream display + LLM-model autoscaler decisions.
"""
from __future__ import annotations

from .schemas import (
    AgeBracket,
    CardiovascularRisk,
    Gait,
    Onset,
    PatientResponses,
    StrokeAlert,
)


def calculate_stroke_alert(r: PatientResponses) -> StrokeAlert:
    """Compute the stroke-risk signal for a given set of patient responses."""
    score = 0
    reasons: list[str] = []

    # Single most specific finding — grade-3 truncal ataxia
    if r.gait == Gait.CANT_SIT:
        score += 100
        reasons.append("Ataxia troncal grado 3 (no se sostiene sentado)")

    # Explicit focal neurological red flags
    if r.neuro_red_flags:
        score += 80
        reasons.append(
            "Banderas rojas neurológicas focales "
            "(cefalea nueva / diplopia / debilidad / disartria)"
        )

    # Sudden onset → Acute Vestibular Syndrome pattern
    if r.onset == Onset.SUDDEN:
        score += 30
        reasons.append("Inicio súbito agudo (< 1 minuto)")

    # Cardiovascular burden
    if r.cv_risk == CardiovascularRisk.THREE_OR_MORE:
        score += 25
        reasons.append("≥ 3 factores de riesgo cardiovascular")
    elif r.cv_risk == CardiovascularRisk.ONE_TO_TWO:
        score += 10

    # Age stratification
    if r.age_bracket == AgeBracket.OVER_75:
        score += 15
        reasons.append("Edad > 75 años")
    elif r.age_bracket == AgeBracket.BETWEEN_60_75:
        score += 8

    # Decision tree
    if score >= 100:
        triggered = True
        urgency: str = "inmediata"
        reason_str = "CRITERIO DE STROKE PROBABLE: " + "; ".join(reasons[:3])
    elif score >= 50:
        triggered = True
        urgency = "alta"
        reason_str = "ALTO RIESGO DE CAUSA CENTRAL: " + "; ".join(reasons[:3])
    elif score >= 25:
        triggered = False
        urgency = "baja"
        reason_str = (
            "Riesgo bajo pero presente: " + "; ".join(reasons[:2])
            if reasons
            else "Riesgo bajo de causa central"
        )
    else:
        triggered = False
        urgency = "baja"
        reason_str = "Sin signos de alarma central"

    standing_label = "POSITIVO" if score >= 50 else "NEGATIVO"

    return StrokeAlert(
        triggered=triggered,
        reason=reason_str,
        urgency=urgency,
        score_hints=score,
        score_standing=standing_label,
    )
