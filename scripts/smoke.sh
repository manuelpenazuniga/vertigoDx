#!/usr/bin/env bash
# VertigoDx smoke test — verifies the system is alive in ~60 seconds.
#
# Run this BEFORE recording the demo video and AFTER any hotfix.
# It does NOT replace pytest E2E or the manual 8-point smoke test (D3-T09).
# See scripts/smoke.py docstring for the full rationale.
#
# Prerequisites:
#   - uvicorn running on port 8000 (cd backend && .venv/bin/uvicorn app.main:app --port 8000)
#   - Ollama service up with gemma4:e4b model pulled
#
# Exit codes:
#   0 = all 5 checks pass — system is alive
#   1 = at least one check failed — see output for which

set -e
cd "$(dirname "$0")/.."

# Prefer the project venv's python if available; fall back to system python3.
if [ -x backend/.venv/bin/python ]; then
  PYTHON=backend/.venv/bin/python
else
  PYTHON=python3
fi

exec "$PYTHON" scripts/smoke.py
