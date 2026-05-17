#!/usr/bin/env python3
"""VertigoDx Smoke Test — 5 structural checks that the system is alive.

WHAT THIS IS
------------
A fast (~60s), stdlib-only script that confirms the API is reachable, returns
the correct JSON shape, streams SSE events in the expected order, and carries
the traceability + consensus fields added in round 4.

WHAT THIS IS NOT
----------------
- Not a replacement for `pytest tests/test_e2e.py` (clinical correctness,
  Spanish quality, expected_top assertions, anglicism checks).
- Not a replacement for the manual 8-point smoke test (D3-T09) — it never
  views the UI.
- "ALIVE" means structurally correct, not clinically validated.

WHEN TO RUN
-----------
  ./scripts/smoke.sh

Run BEFORE recording the demo video and AFTER any hotfix that might have
broken the API shape (adding/renaming schema fields, restructuring endpoints).

HOW IT DIFFERS FROM THE E2E PYTEST SUITE
-----------------------------------------
| Layer    | Tool                        | What it checks               |
| -------- | --------------------------- | ---------------------------- |
| Unit     | pytest test_demo_cases.py   | Rule engine, triage in isol. |
| E2E      | pytest test_e2e.py          | Clinical correctness, Spanish|
| Smoke    | THIS SCRIPT                 | API alive + schema shape     |

IMPORTANT: only case_01_bppv_clasico (BPPV) is used. This is intentional —
BPPV routes through gemma4:e4b (~9.6 GB). Loading case_04 (stroke) would
invoke gemma4:26b-a4b-it-q4_K_M (~17 GB) via the autoscaler, which risks
swap pressure on the 24 GB dev machine. The script is RAM-safe by design.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

# ---------------------------------------------------------------------------
# ANSI color codes — no external libraries required
# ---------------------------------------------------------------------------
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_URL    = "http://localhost:8000"
REPO_ROOT   = Path(__file__).resolve().parent.parent
CASES_FILE  = REPO_ROOT / "data" / "demo_cases.json"

# IMPORTANT: Only BPPV case_01 is used here to keep the smoke test RAM-safe.
# case_01 routes through gemma4:e4b (light model) — never loads the 17 GB heavy model.
SAFE_CASE_ID = "case_01_bppv_clasico"

# Canonical SSE stage order for a non-stroke BPPV case (no model_loading event).
EXPECTED_STAGES = ["rules", "triage", "rag", "reasoning", "complete"]

# Traceability + Self-Consistency consensus fields added in round 4.
TRACEABILITY_FIELDS = [
    "model_used",
    "generated_at",
    "corpus_version",
    "consensus_paths",
    "consensus_agreement_ratio",
]

# Module-level cache so checks 3 and 4 share one SSE request (saves ~60s).
_stream_cache: list[dict] | None = None


# ---------------------------------------------------------------------------
# HTTP helpers — stdlib only (urllib.request)
# ---------------------------------------------------------------------------

def _load_bppv_payload() -> dict:
    """Load the BPPV responses block from data/demo_cases.json."""
    cases = json.loads(CASES_FILE.read_text(encoding="utf-8"))
    case = next(c for c in cases if c["id"] == SAFE_CASE_ID)
    return case["responses"]


def _get(path: str, timeout: float = 5) -> dict:
    url = f"{BASE_URL}{path}"
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _post_json(path: str, payload: dict, timeout: float = 180) -> dict:
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _stream_sse(path: str, payload: dict, timeout: float = 200) -> list[dict]:
    """POST to an SSE endpoint; return all events as a list of dicts.

    Frame format (SSE spec):
        data: {"stage": "<name>", "payload": {...}}\n
        \n
    Frames are separated by \\n\\n. We read in 4096-byte chunks, accumulate
    in a buffer, split on \\n\\n, and parse each line that starts with 'data: '.
    """
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    events: list[dict] = []
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        buf = ""
        while True:
            chunk = resp.read(4096)
            if not chunk:
                break
            # Normalize line endings before accumulating.
            buf += chunk.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            while "\n\n" in buf:
                frame, buf = buf.split("\n\n", 1)
                frame = frame.strip()
                if frame.startswith("data: "):
                    event = json.loads(frame[6:])
                    events.append(event)
                    if event.get("stage") == "complete":
                        return events
    return events


def _get_stream_events() -> list[dict]:
    """Return SSE events for case_01 BPPV, using a module-level cache."""
    global _stream_cache
    if _stream_cache is None:
        payload = _load_bppv_payload()
        _stream_cache = _stream_sse("/diagnose/stream", payload)
    return _stream_cache


# ---------------------------------------------------------------------------
# Check runner
# ---------------------------------------------------------------------------

def check(n: int, name: str, fn: Callable[[], None]) -> bool:
    """Run fn(), print a pass/fail line with elapsed time. Return True on pass."""
    print(f"\n[{n}/5] {BOLD}►{RESET} {name}...")
    t0 = time.monotonic()
    try:
        fn()
        elapsed = time.monotonic() - t0
        print(f"  {GREEN}✓ PASS{RESET} ({elapsed:.1f}s)")
        return True
    except urllib.error.URLError as exc:
        elapsed = time.monotonic() - t0
        msg = str(exc).lower()
        if "connection refused" in msg or "connection reset" in msg or "errno 61" in msg:
            print(
                f"  {RED}✗ FAIL{RESET} — uvicorn not running on port 8000 — "
                f"start it with: cd backend && .venv/bin/uvicorn app.main:app --port 8000"
            )
        else:
            print(f"  {RED}✗ FAIL{RESET} — network error: {exc} ({elapsed:.1f}s)")
        return False
    except AssertionError as exc:
        elapsed = time.monotonic() - t0
        print(f"  {RED}✗ FAIL{RESET} — {exc} ({elapsed:.1f}s)")
        return False
    except Exception as exc:
        elapsed = time.monotonic() - t0
        print(f"  {RED}✗ FAIL{RESET} — {type(exc).__name__}: {exc} ({elapsed:.1f}s)")
        return False


# ---------------------------------------------------------------------------
# The 5 checks
# ---------------------------------------------------------------------------

def check1_healthcheck() -> None:
    """GET /healthcheck → 200, offline=true, model_light + model_heavy present."""
    body = _get("/healthcheck", timeout=5)
    assert body.get("offline") is True, \
        f"expected offline=true, got offline={body.get('offline')!r}"
    assert "model_light" in body, \
        f"model_light key missing from healthcheck response: {list(body)}"
    assert "model_heavy" in body, \
        f"model_heavy key missing from healthcheck response: {list(body)}"


def check2_sync_diagnose() -> None:
    """POST /diagnose with BPPV case → 200, all top-level keys present, no stroke alert."""
    payload = _load_bppv_payload()
    body = _post_json("/diagnose", payload, timeout=180)

    # Core clinical keys
    for key in ("differential", "stroke_alert", "clinical_reasoning",
                "next_steps", "limitations", "processing_time_ms"):
        assert key in body, f"missing core key {key!r} in /diagnose response"

    # Traceability + consensus keys (round 4)
    for field in TRACEABILITY_FIELDS:
        assert field in body, f"missing traceability field {field!r} in /diagnose response"

    # Shape assertions
    assert isinstance(body["differential"], list) and len(body["differential"]) >= 1, \
        "differential must be a non-empty list"
    assert isinstance(body["clinical_reasoning"], str) and len(body["clinical_reasoning"]) >= 20, \
        f"clinical_reasoning too short ({len(body['clinical_reasoning'])} chars)"
    assert isinstance(body["next_steps"], list) and len(body["next_steps"]) >= 1, \
        "next_steps must be a non-empty list"
    assert isinstance(body["processing_time_ms"], int), \
        f"processing_time_ms must be int, got {type(body['processing_time_ms']).__name__}"

    # BPPV must NOT trigger stroke alert
    assert body["stroke_alert"]["triggered"] is False, \
        f"BPPV case should not trigger stroke alert (triggered={body['stroke_alert']['triggered']})"

    # Traceability value checks
    assert body["model_used"] == "gemma4:e4b", \
        f"model_used should be 'gemma4:e4b' for non-stroke case, got {body['model_used']!r}"
    assert isinstance(body["generated_at"], str) and body["generated_at"] >= "2026-", \
        f"generated_at should be ISO 8601 >= '2026-', got {body['generated_at']!r}"
    assert (
        isinstance(body["corpus_version"], str)
        and len(body["corpus_version"]) == 12
    ), f"corpus_version should be 12 hex chars, got {body['corpus_version']!r}"

    # Non-stroke → single path, full consensus
    assert body["consensus_paths"] == 1, \
        f"consensus_paths should be 1 for non-stroke case, got {body['consensus_paths']}"
    assert body["consensus_agreement_ratio"] == 1.0, \
        f"consensus_agreement_ratio should be 1.0 for non-stroke case, " \
        f"got {body['consensus_agreement_ratio']}"


def check3_stream_events() -> None:
    """POST /diagnose/stream with BPPV case → 5 SSE stages in canonical order."""
    events = _get_stream_events()
    stages = [e.get("stage") for e in events]

    assert stages == EXPECTED_STAGES, (
        f"SSE stages out of order.\n"
        f"  Expected: {EXPECTED_STAGES}\n"
        f"  Got:      {stages}"
    )
    # For BPPV (non-stroke), model_loading must NOT appear — it signals the
    # autoscaler is loading the heavy model, which we never want here.
    assert "model_loading" not in stages, \
        f"model_loading event must not appear for non-stroke case; stages seen: {stages}"


def check4_reasoning_frame() -> None:
    """Reasoning SSE frame carries all traceability + consensus fields; top diff is BPPV."""
    events = _get_stream_events()
    reasoning_events = [e for e in events if e.get("stage") == "reasoning"]
    assert reasoning_events, \
        "No 'reasoning' event found in SSE stream; all stages seen: " \
        f"{[e.get('stage') for e in events]}"

    frame_payload = reasoning_events[0].get("payload", {})

    # Traceability + consensus fields must be present in the full DiagnosticResult payload
    for field in TRACEABILITY_FIELDS:
        assert field in frame_payload, \
            f"missing field {field!r} in reasoning frame payload; keys: {list(frame_payload)}"

    # Top differential must be BPPV
    diff = frame_payload.get("differential", [])
    assert diff, "differential is empty in reasoning frame payload"
    top_diagnosis = diff[0].get("diagnosis", "")
    assert "BPPV" in top_diagnosis, \
        f"Top differential should contain 'BPPV', got {top_diagnosis!r}"


def check5_demo_cases() -> None:
    """GET /demo-cases → 200, exactly 5 items, each with required keys, case_04 flagged."""
    body = _get("/demo-cases", timeout=5)
    assert isinstance(body, list), \
        f"/demo-cases should return a list, got {type(body).__name__}"
    assert len(body) == 5, \
        f"/demo-cases should return exactly 5 items, got {len(body)}"

    required_keys = {"id", "label", "narrative", "responses"}
    for i, item in enumerate(body):
        missing = required_keys - set(item.keys())
        assert not missing, f"item[{i}] (id={item.get('id')!r}) missing keys: {missing}"

    stroke_case = next(
        (c for c in body if c["id"] == "case_04_stroke_cerebeloso"), None
    )
    assert stroke_case is not None, \
        "case_04_stroke_cerebeloso not found in /demo-cases"
    assert stroke_case.get("expected_stroke_alert") is True, \
        (f"case_04 should have expected_stroke_alert=true, "
         f"got {stroke_case.get('expected_stroke_alert')!r}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"\n{BOLD}VertigoDx Smoke Test{RESET}")
    print("=" * 60)
    print(f"Target : {BASE_URL}")
    print(f"Case   : {SAFE_CASE_ID}  (light model only — never loads the 17 GB heavy model)")
    print(f"Checks : {len(EXPECTED_STAGES)} SSE stages + {len(TRACEABILITY_FIELDS)} traceability fields")

    t_start = time.monotonic()

    results = [
        check(1, "Healthcheck reachable + offline=true", check1_healthcheck),
        check(2, "POST /diagnose — full schema (sync)", check2_sync_diagnose),
        check(3, "POST /diagnose/stream — 5 SSE stages in order", check3_stream_events),
        check(4, "Reasoning frame carries traceability + consensus fields", check4_reasoning_frame),
        check(5, "GET /demo-cases — 5 valid items, case_04 flagged", check5_demo_cases),
    ]

    total_time = time.monotonic() - t_start
    passed = sum(results)
    failed = len(results) - passed

    print()
    print("=" * 60)
    if failed == 0:
        print(
            f"{GREEN}{BOLD}═══ {passed}/5 passed in {total_time:.1f}s "
            f"— SYSTEM IS ALIVE ✓{RESET}"
        )
        sys.exit(0)
    else:
        print(
            f"{RED}{BOLD}═══ {passed}/5 passed in {total_time:.1f}s "
            f"— {failed} CHECK(S) FAILED, see above{RESET}"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
