"""Prompt evaluation helper.

Runs the 5 demo cases through the full backend pipeline and prints, for each
case, the expected vs actual top diagnosis, expected vs actual stroke alert,
and the LLM-generated clinical_reasoning + next_steps + limitations.

This is NOT a test — it prints, it does not assert. Use it during prompt
iteration to compare variants side-by-side.

Prerequisites:
    - uvicorn app.main:app --port 8000 is running
    - venv is activated

Usage:
    cd backend && .venv/bin/python scripts/eval_prompts.py
    # or to label the run (purely cosmetic, helps when copy-pasting output):
    cd backend && .venv/bin/python scripts/eval_prompts.py v2
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

BASE_URL = "http://localhost:8000"
CASES_PATH = Path(__file__).resolve().parents[2] / "data" / "demo_cases.json"


def main() -> int:
    label = sys.argv[1] if len(sys.argv) > 1 else "active"

    try:
        r = httpx.get(f"{BASE_URL}/healthcheck", timeout=3)
        r.raise_for_status()
    except Exception as e:
        print(f"ERROR: API not reachable on {BASE_URL}: {e}", file=sys.stderr)
        print("Start it with: uvicorn app.main:app --port 8000", file=sys.stderr)
        return 1

    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    print(f"\n{'=' * 72}")
    print(f"PROMPT VARIANT: {label}")
    print(f"{'=' * 72}\n")

    client = httpx.Client(base_url=BASE_URL, timeout=240)
    for case in cases:
        cid = case["id"]
        label_str = case["label"]
        expected_top = case.get("expected_top") or case.get("expected_top_options")
        expected_alert = case.get("expected_stroke_alert")

        try:
            resp = client.post("/diagnose", json=case["responses"])
            resp.raise_for_status()
            payload = resp.json()
        except Exception as e:
            print(f"\n-- {cid} ({label_str}) -- FAILED: {e}")
            continue

        actual_top = payload["differential"][0]["diagnosis"]
        actual_alert = payload["stroke_alert"]["triggered"]
        reasoning = payload["clinical_reasoning"]
        steps = payload["next_steps"]
        limits = payload["limitations"]

        print(f"\n-- {cid} : {label_str} --")
        print(f"  expected top   : {expected_top}")
        print(f"  actual top     : {actual_top}")
        print(f"  expected alert : {expected_alert}")
        print(f"  actual alert   : {actual_alert}")
        print("\n  reasoning:")
        print(f"    {reasoning}")
        print("\n  next_steps:")
        for s in steps:
            print(f"    - {s}")
        print("\n  limitations:")
        print(f"    {limits}")
        print(f"\n{'-' * 72}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
