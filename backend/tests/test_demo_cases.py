"""Demo cases as ground truth.

These five tests guard the deterministic core (rules + triage). They do NOT
touch Ollama or the LLM — those are validated end-to-end on Day 2 once the
RAG + prompt pipeline is stable.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.rules import run_all_rules
from app.schemas import PatientResponses
from app.triage import calculate_stroke_alert

CASES_PATH = Path(__file__).parent.parent.parent / "data" / "demo_cases.json"


@pytest.fixture(scope="module")
def demo_cases() -> list[dict]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


def _get(cases: list[dict], case_id: str) -> dict:
    return next(c for c in cases if c["id"] == case_id)


def test_all_cases_parseable(demo_cases: list[dict]) -> None:
    for case in demo_cases:
        responses = PatientResponses(**case["responses"])
        assert responses is not None, f"Case {case['id']} did not parse"


def test_bppv_classic_detected(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_01_bppv_clasico")
    responses = PatientResponses(**case["responses"])
    candidates = run_all_rules(responses)
    assert candidates[0].diagnosis == case["expected_top"], (
        f"Expected BPPV top, got {candidates[0].diagnosis}"
    )


def test_stroke_alert_triggers(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_04_stroke_cerebeloso")
    responses = PatientResponses(**case["responses"])
    alert = calculate_stroke_alert(responses)
    assert alert.triggered is True
    assert alert.urgency == "inmediata"


def test_meniere_confidence_with_fluctuating(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_02_meniere")
    responses = PatientResponses(**case["responses"])
    candidates = run_all_rules(responses)
    em = next(c for c in candidates if c.diagnosis == "Enfermedad de Ménière")
    assert em.confidence.value in ("alta", "media")


def test_no_false_stroke_alarm_in_bppv(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_01_bppv_clasico")
    responses = PatientResponses(**case["responses"])
    alert = calculate_stroke_alert(responses)
    assert alert.triggered is False


def test_migraine_top_with_frequent_history(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_03_migrana_vestibular")
    responses = PatientResponses(**case["responses"])
    candidates = run_all_rules(responses)
    # Top should be Migraña Vestibular for this canonical pattern
    assert candidates[0].diagnosis == case["expected_top"], (
        f"Expected {case['expected_top']}, got {candidates[0].diagnosis}"
    )


def test_complex_overlap_returns_one_of_expected(demo_cases: list[dict]) -> None:
    case = _get(demo_cases, "case_05_caso_complejo_overlap")
    responses = PatientResponses(**case["responses"])
    candidates = run_all_rules(responses)
    assert candidates[0].diagnosis in case["expected_top_options"]
