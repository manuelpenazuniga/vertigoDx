"""Pydantic schemas for typed clinical input/output.

Every value crossing the API boundary goes through these models.
No `dict[str, Any]` in route signatures — that is an architecture invariant.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

# =============================================================================
# INPUT — patient responses to the 10-question questionnaire
# =============================================================================

class EpisodeDuration(str, Enum):
    UNDER_1MIN = "under_1min"
    BETWEEN_1_2MIN = "1_to_2min"
    BETWEEN_2MIN_1H = "2min_to_1h"
    BETWEEN_1_24H = "1_to_24h"
    OVER_24H = "over_24h"


class Trigger(str, Enum):
    POSITION_CHANGE = "position_change"   # rolling in bed, looking up, bending
    HEAD_MOVEMENT = "head_movement"
    SPONTANEOUS = "spontaneous"
    LOUD_SOUND = "loud_sound"


class HearingStatus(str, Enum):
    FLUCTUATING = "fluctuating"
    PERMANENT = "permanent"
    NONE = "none"


class MigraineHistory(str, Enum):
    FREQUENT = "frequent"
    OCCASIONAL = "occasional"
    NONE = "none"


class NauseaVomiting(str, Enum):
    VOMITING = "vomiting"
    NAUSEA_ONLY = "nausea_only"
    NONE = "none"


class AgeBracket(str, Enum):
    UNDER_40 = "under_40"
    BETWEEN_40_60 = "40_60"
    BETWEEN_60_75 = "60_75"
    OVER_75 = "over_75"


class Onset(str, Enum):
    SUDDEN = "sudden"            # <1 min
    PROGRESSIVE = "progressive"  # minutes to hours
    CHRONIC = "chronic"          # days to weeks


class Gait(str, Enum):
    NORMAL = "normal"
    UNSTABLE = "unstable"
    CANT_SIT = "cant_sit"        # grade-3 truncal ataxia; 100% specific for central (Carmona & Kaski 2023)


class CardiovascularRisk(str, Enum):
    NONE = "none"
    ONE_TO_TWO = "1_to_2"
    THREE_OR_MORE = "3_or_more"


class PatientResponses(BaseModel):
    """The 10 evidence-based questionnaire answers driving the diagnosis."""

    episode_duration: EpisodeDuration
    trigger: Trigger
    hearing_status: HearingStatus
    migraine_history: MigraineHistory
    nausea_vomiting: NauseaVomiting
    age_bracket: AgeBracket
    onset: Onset
    gait: Gait
    neuro_red_flags: bool = Field(
        description="New-onset headache, diplopia, dysarthria, focal weakness, facial asymmetry."
    )
    cv_risk: CardiovascularRisk


# =============================================================================
# OUTPUT — differential diagnosis + stroke alert + clinical reasoning
# =============================================================================

class Confidence(str, Enum):
    HIGH = "alta"
    MEDIUM = "media"
    LOW = "baja"


class DiagnosisCandidate(BaseModel):
    diagnosis: str
    confidence: Confidence
    supporting_criteria: list[str]
    missing_criteria: list[str]
    icvd_reference: str | None = None


class StrokeAlert(BaseModel):
    triggered: bool
    reason: str
    urgency: Literal["inmediata", "alta", "baja"]
    score_hints: int | None = None
    score_standing: str | None = None


class DiagnosticResult(BaseModel):
    """Full payload returned by POST /diagnose."""

    differential: list[DiagnosisCandidate]
    stroke_alert: StrokeAlert
    clinical_reasoning: str
    next_steps: list[str]
    limitations: str
    processing_time_ms: int | None = None
