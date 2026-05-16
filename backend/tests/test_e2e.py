"""End-to-end tests over the 5 demo cases.

These tests require a running uvicorn instance on http://localhost:8000.
If the API is not reachable, the whole module is skipped (do not fail CI on
a missing service).

The stroke case (case_04) loads the 17 GB heavy model via the autoscaler
and is therefore gated behind the `VERTIGODX_RUN_HEAVY=1` env var. Without
that flag, only the four non-stroke cases run — keeping default test runs
RAM-safe on the 24 GB dev machine. On recording day, set the flag to
validate the full set.

The Spanish heuristic enforces the V2 prompt's anglicism prohibitions:
any of the listed English clinical loanwords appearing in `clinical_reasoning`
fails the test. This is what protects us from silent prompt-quality regressions.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import httpx
import pytest

BASE_URL = "http://localhost:8000"
CASES_PATH = Path(__file__).parent.parent.parent / "data" / "demo_cases.json"

# Anglicisms that V2 is supposed to suppress. Match case-insensitively and on
# word boundaries to avoid false positives like "trastorno" containing "stroke"
# substrings. The list mirrors the PROHIBIDO block in prompts.py::SYSTEM_PROMPT_V2.
FORBIDDEN_EN_TERMS = [
    "stroke",
    "follow-up",
    "follow up",
    "imaging",
    "diagnosis is",
    "is diagnosed",
    "test of skew",
]

# Heavy-model test gate. case_04 routes to gemma4:26b-a4b-it-q4_K_M which
# pushes the M4 24GB Mac into swap pressure if other workloads are active.
RUN_HEAVY = os.getenv("VERTIGODX_RUN_HEAVY") == "1"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client() -> httpx.Client:
    """Return a long-timeout client; skip the module if the API is down."""
    try:
        r = httpx.get(f"{BASE_URL}/healthcheck", timeout=3)
        r.raise_for_status()
    except Exception:
        pytest.skip(
            "API not running on localhost:8000 "
            "(start it with `uvicorn app.main:app --port 8000`)"
        )
    # Generous timeout — first request after a cold start can take >60s.
    return httpx.Client(base_url=BASE_URL, timeout=240)


@pytest.fixture(scope="module")
def cases() -> list[dict]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_case(cases: list[dict], case_id: str) -> dict:
    return next(c for c in cases if c["id"] == case_id)


def _assert_no_anglicisms(reasoning: str, case_id: str) -> None:
    lowered = reasoning.lower()
    found = [term for term in FORBIDDEN_EN_TERMS if term in lowered]
    assert not found, (
        f"Case {case_id} reasoning contains forbidden English term(s) "
        f"{found}. Full reasoning:\n{reasoning}"
    )


def _assert_response_shape(payload: dict) -> None:
    """Schema check on the DiagnosticResult JSON shape."""
    for key in ("differential", "stroke_alert", "clinical_reasoning",
                "next_steps", "limitations"):
        assert key in payload, f"missing top-level key {key!r}"
    assert isinstance(payload["differential"], list)
    assert len(payload["differential"]) >= 1
    assert isinstance(payload["stroke_alert"], dict)
    for k in ("triggered", "reason", "urgency"):
        assert k in payload["stroke_alert"], f"missing stroke_alert.{k}"
    assert isinstance(payload["next_steps"], list)
    assert len(payload["next_steps"]) >= 1


# ---------------------------------------------------------------------------
# Healthcheck — fast smoke test, always runs
# ---------------------------------------------------------------------------

def test_healthcheck_reports_offline(client: httpx.Client) -> None:
    r = client.get("/healthcheck")
    assert r.status_code == 200
    body = r.json()
    assert body.get("offline") is True
    assert "model_light" in body
    assert "autoscaler" in body


# ---------------------------------------------------------------------------
# Parametrized end-to-end tests over the four non-stroke cases.
# These all route through gemma4:e4b (the light model), staying RAM-safe.
# ---------------------------------------------------------------------------

LIGHT_CASE_IDS = [
    "case_01_bppv_clasico",
    "case_02_meniere",
    "case_03_migrana_vestibular",
    "case_05_caso_complejo_overlap",
]


@pytest.mark.parametrize("case_id", LIGHT_CASE_IDS)
def test_demo_case_e2e_light(client: httpx.Client, cases: list[dict], case_id: str) -> None:
    case = _get_case(cases, case_id)
    r = client.post("/diagnose", json=case["responses"])
    assert r.status_code == 200, r.text
    payload = r.json()

    _assert_response_shape(payload)

    # Spanish discipline (V2 prompt invariant)
    reasoning = payload["clinical_reasoning"]
    assert len(reasoning) >= 30, f"reasoning too short for {case_id}: {reasoning!r}"
    _assert_no_anglicisms(reasoning, case_id)

    # Stroke alert expectation
    expected_alert = case.get("expected_stroke_alert")
    if expected_alert is not None:
        assert payload["stroke_alert"]["triggered"] is expected_alert, (
            f"Case {case_id}: expected_stroke_alert={expected_alert}, got "
            f"{payload['stroke_alert']['triggered']} "
            f"(reason: {payload['stroke_alert']['reason']})"
        )

    # Top-1 differential check (skipped for the deliberately ambiguous case_05)
    if "expected_top" in case:
        actual_top = payload["differential"][0]["diagnosis"]
        assert case["expected_top"] in actual_top, (
            f"Case {case_id}: expected top contains "
            f"{case['expected_top']!r}, got {actual_top!r}"
        )
    elif "expected_top_options" in case:
        actual_top = payload["differential"][0]["diagnosis"]
        assert any(opt in actual_top for opt in case["expected_top_options"]), (
            f"Case {case_id}: expected top in {case['expected_top_options']}, "
            f"got {actual_top!r}"
        )


# ---------------------------------------------------------------------------
# Stroke case — gated behind VERTIGODX_RUN_HEAVY=1 to avoid loading the
# 17 GB model during routine test runs.
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not RUN_HEAVY,
    reason="Stroke case loads the 17GB heavy model. Set VERTIGODX_RUN_HEAVY=1 to run.",
)
def test_stroke_case_e2e_heavy(client: httpx.Client, cases: list[dict]) -> None:
    case = _get_case(cases, "case_04_stroke_cerebeloso")
    r = client.post("/diagnose", json=case["responses"])
    assert r.status_code == 200, r.text
    payload = r.json()

    _assert_response_shape(payload)
    reasoning = payload["clinical_reasoning"]
    _assert_no_anglicisms(reasoning, case["id"])

    # Stroke alert must trigger with urgency 'inmediata'
    assert payload["stroke_alert"]["triggered"] is True
    assert payload["stroke_alert"]["urgency"] == "inmediata"

    # V2 prompt invariant: first sentence must start with an urgency cue.
    first_sentence = reasoning.split(".")[0].strip().lower()
    assert (
        first_sentence.startswith("derivación")
        or first_sentence.startswith("activar")
    ), (
        f"V2 invariant violated — first sentence does not start with "
        f"'Derivación' or 'Activar': {reasoning!r}"
    )

    # Top differential must be the central one
    actual_top = payload["differential"][0]["diagnosis"]
    assert "Central" in actual_top, (
        f"Expected top to contain 'Central', got {actual_top!r}"
    )
