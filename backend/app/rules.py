"""Deterministic ICVD rule engine.

Encodes Bárány Society ICVD criteria for the four MVP pathologies as boolean
predicates. Output is the source of truth for which diagnoses are candidates —
the downstream LLM may rank and explain, but cannot invent new diagnoses.

References:
    BPPV (posterior canal)   — Bárány Society 2015
    Vestibular Migraine      — Bárány / IHS 2012
    Ménière's Disease        — Bárány Society 2015
    Central Vertigo (stroke) — Newman-Toker TiTrATE 2015; GRACE-3 2023;
                                Carmona & Kaski 2023
"""
from __future__ import annotations

from .schemas import (
    AgeBracket,
    CardiovascularRisk,
    Confidence,
    DiagnosisCandidate,
    EpisodeDuration,
    Gait,
    HearingStatus,
    MigraineHistory,
    Onset,
    PatientResponses,
    Trigger,
)


def evaluate_bppv_posterior(r: PatientResponses) -> DiagnosisCandidate:
    """ICVD posterior-canal BPPV (Bárány Society 2015).

    Criteria:
        A. Recurrent positional vertigo triggered by head-position changes
           relative to gravity.
        B. Duration < 1 minute per episode.
        C. Characteristic nystagmus on Dix-Hallpike (Level 2 — not evaluable here).
        D. Not better explained by another disorder.

    At MVP Level 1 we evaluate A, B, D (the D is implicit via absence of red flags).
    """
    supporting: list[str] = []
    missing: list[str] = []

    if r.trigger == Trigger.POSITION_CHANGE:
        supporting.append("Vértigo desencadenado por cambios de posición de la cabeza (criterio A)")
    else:
        missing.append("Desencadenante posicional (giro en cama, agacharse, mirar arriba)")

    if r.episode_duration in (EpisodeDuration.UNDER_1MIN, EpisodeDuration.BETWEEN_1_2MIN):
        supporting.append(f"Duración breve del episodio ({r.episode_duration.value}) — criterio B")
    else:
        missing.append("Episodios < 1 minuto (criterio B)")

    if r.hearing_status == HearingStatus.NONE:
        supporting.append("Ausencia de síntomas auditivos (apoya BPPV vs Ménière)")
    else:
        missing.append("Ausencia de hipoacusia/tinnitus")

    # Red flags that exclude BPPV
    if r.gait == Gait.CANT_SIT or r.neuro_red_flags:
        missing.append(
            "Ausencia de banderas rojas neurológicas (presentes → priorizar causa central)"
        )

    if len(supporting) >= 3 and not missing:
        confidence = Confidence.HIGH
    elif len(supporting) >= 2:
        confidence = Confidence.MEDIUM
    else:
        confidence = Confidence.LOW

    return DiagnosisCandidate(
        diagnosis="BPPV del canal posterior",
        confidence=confidence,
        supporting_criteria=supporting,
        missing_criteria=missing,
        icvd_reference="ICVD Bárány Society 2015 — BPPV criterios A, B, D",
    )


def evaluate_vestibular_migraine(r: PatientResponses) -> DiagnosisCandidate:
    """ICVD Vestibular Migraine (Bárány / IHS 2012).

    Criteria for Definite VM:
        A. >=5 episodes of vestibular symptoms, moderate-to-severe, 5 min – 72 h.
        B. Current or past history of migraine with or without aura (ICHD).
        C. >=1 migrainous feature in >=50% of vestibular episodes (headache
           features, photo/phonophobia, visual aura).
        D. Not better explained by another diagnosis.
    """
    supporting: list[str] = []
    missing: list[str] = []

    duration_compatible = r.episode_duration in (
        EpisodeDuration.BETWEEN_2MIN_1H,
        EpisodeDuration.BETWEEN_1_24H,
    )
    if duration_compatible:
        supporting.append(
            f"Duración compatible (5 min – 72 h): {r.episode_duration.value} — criterio A"
        )
    else:
        missing.append("Duración entre 5 minutos y 72 horas (criterio A)")

    if r.migraine_history == MigraineHistory.FREQUENT:
        supporting.append("Historia frecuente de migraña (criterio B)")
    elif r.migraine_history == MigraineHistory.OCCASIONAL:
        supporting.append("Historia ocasional de migraña (criterio B parcial)")
    else:
        missing.append("Historia de migraña con o sin aura (criterio B)")

    # Comorbid VM + Ménière is explicitly allowed in ICVD
    if r.hearing_status == HearingStatus.NONE:
        supporting.append("Sin síntomas auditivos permanentes (apoya VM pura)")

    # Confidence: high requires duration + frequent migraine + no hearing
    if (
        duration_compatible
        and r.migraine_history == MigraineHistory.FREQUENT
        and r.hearing_status == HearingStatus.NONE
    ):
        confidence = Confidence.HIGH
    elif r.migraine_history != MigraineHistory.NONE and duration_compatible:
        confidence = Confidence.MEDIUM
    else:
        confidence = Confidence.LOW

    return DiagnosisCandidate(
        diagnosis="Migraña Vestibular",
        confidence=confidence,
        supporting_criteria=supporting,
        missing_criteria=missing,
        icvd_reference="ICVD Bárány / IHS 2012 — Migraña Vestibular criterios A–D",
    )


def evaluate_meniere(r: PatientResponses) -> DiagnosisCandidate:
    """ICVD Ménière's Disease — Definite (Bárány Society 2015).

    Criteria:
        A. >=2 spontaneous vertigo episodes, 20 min – 12 h each.
        B. Audiometric low-to-mid frequency SNHL in the affected ear (Level 2).
        C. Fluctuating auditory symptoms (hearing, tinnitus, fullness) in the
           affected ear.
        D. Not better explained by another vestibular disorder.

    MVP Level 1: A, C + inferred audiology by reported fluctuating hearing.
    """
    supporting: list[str] = []
    missing: list[str] = []

    if r.episode_duration in (EpisodeDuration.BETWEEN_2MIN_1H, EpisodeDuration.BETWEEN_1_24H):
        supporting.append("Duración episódica 20 min – 12 h (criterio A)")
    else:
        missing.append("Episodios de 20 minutos a 12 horas (criterio A)")

    if r.hearing_status == HearingStatus.FLUCTUATING:
        supporting.append("Hipoacusia / tinnitus fluctuante (criterio C — clave)")
    elif r.hearing_status == HearingStatus.PERMANENT:
        supporting.append("Síntomas auditivos presentes pero no fluctuantes")
        missing.append("Carácter fluctuante de la hipoacusia (requerido para EM Definida)")
    else:
        missing.append("Hipoacusia o tinnitus en oído afecto (criterio C)")

    if r.trigger == Trigger.SPONTANEOUS:
        supporting.append("Episodios espontáneos, no posicionales (criterio A)")
    else:
        missing.append("Episodios espontáneos (no desencadenados por posición)")

    if r.hearing_status == HearingStatus.FLUCTUATING and len(supporting) >= 3:
        confidence = Confidence.HIGH
    elif r.hearing_status == HearingStatus.FLUCTUATING:
        confidence = Confidence.MEDIUM
    else:
        confidence = Confidence.LOW

    return DiagnosisCandidate(
        diagnosis="Enfermedad de Ménière",
        confidence=confidence,
        supporting_criteria=supporting,
        missing_criteria=missing,
        icvd_reference="ICVD Bárány Society 2015 — Enfermedad de Ménière (Definida) criterios A–D",
    )


def evaluate_central_vertigo(r: PatientResponses) -> DiagnosisCandidate:
    """Central vertigo (stroke suspicion).

    No single ICVD code. Combines:
        - HINTS+ (head impulse, nystagmus, test of skew) — Level 2, not evaluable here.
        - Carmona & Kaski 2023: grade-3 truncal ataxia → specificity 100%.
        - GRACE-3 2023: sudden onset + sustained + red flags pattern.
        - Vascular risk factors.

    High confidence in this evaluator drives the stroke alert.
    """
    supporting: list[str] = []
    missing: list[str] = []

    if r.onset == Onset.SUDDEN:
        supporting.append("Inicio súbito (< 1 min) — patrón de Síndrome Vestibular Agudo")
    else:
        missing.append("Inicio súbito agudo")

    if r.gait == Gait.CANT_SIT:
        supporting.append(
            "Ataxia troncal grado 3 (no se sostiene sentado) — "
            "especificidad 100% para causa central (Carmona & Kaski 2023)"
        )
    elif r.gait == Gait.UNSTABLE:
        supporting.append("Marcha inestable")

    if r.neuro_red_flags:
        supporting.append("Banderas rojas neurológicas focales reportadas")

    if r.cv_risk == CardiovascularRisk.THREE_OR_MORE:
        supporting.append("≥ 3 factores de riesgo cardiovascular")
    elif r.cv_risk == CardiovascularRisk.ONE_TO_TWO:
        supporting.append("Factores de riesgo cardiovascular presentes (1–2)")

    if r.age_bracket in (AgeBracket.BETWEEN_60_75, AgeBracket.OVER_75):
        supporting.append(f"Edad de riesgo ({r.age_bracket.value})")

    # High confidence == stroke alarm. Any of:
    #   - cant_sit (specificity 100%)
    #   - explicit neuro red flags
    #   - sudden onset + heavy vascular risk
    if (
        r.gait == Gait.CANT_SIT
        or r.neuro_red_flags
        or (r.onset == Onset.SUDDEN and r.cv_risk == CardiovascularRisk.THREE_OR_MORE)
    ):
        confidence = Confidence.HIGH
    elif len(supporting) >= 3:
        confidence = Confidence.MEDIUM
    else:
        confidence = Confidence.LOW

    missing.append("Examen HINTS+ presencial por profesional entrenado (Nivel 2)")
    missing.append("Neuroimagen MRI con DWI para confirmación (Nivel 3)")

    return DiagnosisCandidate(
        diagnosis="Vértigo Central (sospecha de stroke)",
        confidence=confidence,
        supporting_criteria=supporting,
        missing_criteria=missing,
        icvd_reference="Newman-Toker TiTrATE 2015; GRACE-3 2023; Carmona & Kaski 2023",
    )


def run_all_rules(r: PatientResponses) -> list[DiagnosisCandidate]:
    """Run all four evaluators; return list sorted by confidence (alta → baja)."""
    candidates = [
        evaluate_bppv_posterior(r),
        evaluate_vestibular_migraine(r),
        evaluate_meniere(r),
        evaluate_central_vertigo(r),
    ]
    rank = {Confidence.HIGH: 0, Confidence.MEDIUM: 1, Confidence.LOW: 2}
    return sorted(candidates, key=lambda c: rank[c.confidence])
