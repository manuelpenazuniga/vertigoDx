# CLAUDE.md

Context for Claude Code (and any other coding agent) when working on this repository.

> **If you are a Sonnet / Opus / Haiku / Gemini / other coding agent picking up this repo for the first time:**
> read this file end-to-end **and** `backlog.yaml` **before touching any code**. The backlog is the machine-readable execution plan; this file holds the invariants and the rationale. If you were delegated a specific sub-task (not asked to drive the whole sprint), also read `AGENT_HANDOFF.md` — it scopes your assignment and lists what you must NOT touch.

---

## Project

**VertigoDx MVP** — Privacy-first vestibular diagnosis AI for underserved Latin American primary care clinics. Built for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon).

**Submission deadline:** May 18, 2026 @ 23:59 UTC. Target submit time: May 17 EOD (24h buffer).

**Maintainer:** Manuel Peña Zúñiga ([@manuelpenazuniga](https://github.com/manuelpenazuniga)) — engineering and product lead, working with an otoneurology subspecialist team in Chile.

**Target tracks:** Impact Track — Health & Sciences ($10K) + Special Tech Track — Ollama ($10K) + potential Main Track.

This is a **4-day hackathon MVP**, not the production VertigoDx product. The 12-month production roadmap is summarized in `README.md`; this MVP is a focused subset designed for a 3-minute video demo backed by real, functional code.

---

## Why this exists (the clinical problem)

- 35–40% of vestibular strokes are missed in emergency rooms (Tarnutzer, *Neurology* 2017)
- Vertigo patients see 4–5 doctors over 3–5 years before correct diagnosis (VeDA Registry)
- Chile has <30 otoneurology subspecialists for 19M people, almost all in Santiago
- No vestibular triage guidelines exist in Latin America (except ACORL Colombia 2024)
- VertigoDx brings ICVD Bárány Society + HINTS reasoning to primary care, fully offline

---

## Tech stack

- **LLM:** Gemma 4 `26b-a4b-it-q4_K_M` (primary, ~18 GB) + `e4b` fallback, via Ollama
- **Embeddings:** `nomic-embed-text` via Ollama (local, ~274 MB)
- **Vector store:** ChromaDB in-memory (zero-config, local)
- **Backend:** FastAPI + Pydantic v2 (Python 3.11+)
- **Frontend:** Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind
- **Everything runs offline** — no API keys, no cloud calls. This is a hard product invariant.

---

## Repository layout

```
backend/
  app/
    main.py          FastAPI app
    rules.py         Deterministic ICVD rule engine (4 pathologies)
    triage.py        HINTS / STANDING / Sudbury stroke risk scores
    rag.py           ChromaDB + Ollama embedder
    llm.py           Gemma 4 client via Ollama
    prompts.py       Versioned system prompts
    schemas.py       Pydantic models for typed I/O
    data/
      icvd_corpus.md ICVD criteria corpus for RAG
  tests/             pytest — demo cases as ground truth
frontend/
  app/               Next.js App Router pages
  components/        shadcn/ui components + custom
  lib/               Shared helpers (questions.ts, etc.)
data/
  demo_cases.json    5 scripted clinical cases (the video script)
backlog.yaml         Machine-readable execution backlog for the 4-day plan
README.md            Public-facing project README
CLAUDE.md            This file
LICENSE              Apache 2.0
```

**Note:** `docs/` and `resources/` are intentionally `.gitignore`d. They contain private strategy artifacts that must not be published. **Never reference them from public files** (README, code, tests, public docs). If you find such a reference, remove it.

---

## Target pathologies (only 4 in MVP scope)

1. **BPPV (posterior canal)** — the "happy case"
2. **Vestibular migraine** — high volume, hard to diagnose without training
3. **Ménière's disease** — invasive treatment decision, needs specificity
4. **Central vertigo (stroke)** — the dramatic case, drives the pitch

Pathologies explicitly **out of scope for MVP**: vestibular neuritis, PPPD, vestibular paroxysmia, perilymphatic fistula, superior canal dehiscence, orthostatic dizziness. **Do not add these without explicit instruction** — they would dilute the demo.

---

## Architecture invariants (do not violate)

1. **Three layers, graceful degradation.** Rules engine works alone. RAG augments it. Gemma adds reasoning. If Gemma fails, rules + RAG still return a diagnosis.
2. **100% local.** No external API calls anywhere in the request path. Ollama is the only external process, and it runs on `localhost:11434`.
3. **Spanish-first.** All clinical outputs (reasoning, next steps, limitations) must be in Spanish. The pitch is LATAM rural primary care.
4. **Type safety.** Every clinical input/output goes through Pydantic schemas. No `dict[str, Any]` in route signatures.
5. **Deterministic before probabilistic.** Rule engine outputs are the source of truth for which diagnoses are candidates. Gemma explains and ranks but never invents diagnoses absent from the rule output.
6. **Honest uncertainty.** Confidence levels are `alta` / `media` / `baja`. Never claim "definitive diagnosis" — this is a CDS (clinical decision support) tool, not a diagnostic device.
7. **Model autoscaler is load-aware.** The default Gemma variant is `gemma4:e4b` (≈ 9.6 GB). The heavy `gemma4:26b-a4b-it-q4_K_M` (≈ 17 GB) is used *only* when `stroke_alert.triggered == true`, plus a `VERTIGODX_FORCE_HEAVY=1` override for demo recording. The single decision point is `pick_model()` in `app/llm.py` — do not introduce model selection logic elsewhere (and never route through the heavy model from the frontend).

---

## Load-aware model autoscaler (operational invariant)

The reference dev machine is a Mac M4 with 24 GB of unified memory. Pinning the 17 GB `26b-a4b-it-q4_K_M` model in RAM for every request leaves the OS, editor, browser and recording tools fighting for ~6-7 GB of headroom — the system gets visibly laggy. The autoscaler exists to solve this.

**Routing rules (in `pick_model()`):**

| Condition | Model |
|---|---|
| `VERTIGODX_FORCE_HEAVY=1` env var set | `gemma4:26b-a4b-it-q4_K_M` |
| `stroke_triggered == True` (otherwise) | `gemma4:26b-a4b-it-q4_K_M` |
| default | `gemma4:e4b` |

**Ollama service guardrails** (set via `launchctl setenv` and verified to be active on the dev machine):

```bash
OLLAMA_MAX_LOADED_MODELS=1   # loading one model auto-evicts the other
OLLAMA_NUM_PARALLEL=1        # serialize inferences — never overlap big and small
OLLAMA_KEEP_ALIVE=60s        # unload from RAM 60s after the last request
OLLAMA_FLASH_ATTENTION=1     # default from brew, reduces KV cache pressure
OLLAMA_KV_CACHE_TYPE=q8_0    # default from brew, quantizes KV cache
```

**When you modify `llm.py`:**
- Keep `pick_model()` as the single decision function — do not duplicate selection logic in callers.
- Always pass `stroke_triggered=stroke_alert.triggered` from `main.py` (or any new caller).
- Preserve the fallback path that retries the light model on heavy-model exceptions.
- If you add a new model tier, document it in the table above *and* in `README.md`'s autoscaler section.

**When testing:**
- Default tests should exercise `e4b` only (fast, low memory). The 26B path is exercised explicitly with the stroke demo case or via `VERTIGODX_FORCE_HEAVY=1 pytest`.
- Never warm up the 26B model in `lifespan` startup hooks — only `e4b` warms up at startup.

---

## Workflow

### Setup once
```bash
brew install ollama && brew services start ollama
ollama pull gemma4:26b-a4b-it-q4_K_M
ollama pull gemma4:e4b
ollama pull nomic-embed-text
```

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
pytest -v              # always run before commit
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### Verify end-to-end with the stroke case
```bash
curl -X POST http://localhost:8000/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "episode_duration": "over_24h",
    "trigger": "spontaneous",
    "hearing_status": "none",
    "migraine_history": "none",
    "nausea_vomiting": "vomiting",
    "age_bracket": "60_75",
    "onset": "sudden",
    "gait": "cant_sit",
    "neuro_red_flags": true,
    "cv_risk": "3_or_more"
  }' | jq
```

Expected: `stroke_alert.triggered: true`, `urgency: "inmediata"`, clinical reasoning in Spanish citing truncal ataxia and HINTS.

---

## Code style

- **Python:** PEP 8, type hints everywhere, `from __future__ import annotations` at the top of files. Use `ruff` (not `black`). Prefer Pydantic models over `TypedDict`.
- **TypeScript:** strict mode on, no `any`, prefer `type` over `interface` for component props, use shadcn primitives over custom components.
- **Imports:** absolute imports from `app.*` in backend, `@/*` in frontend.
- **Naming:** function names in Spanish for clinical domain logic when it improves clarity (e.g., `evaluar_bppv_posterior` is acceptable inside `rules.py`); English for infrastructure. Mixing is OK if intentional.
- **No emojis in code comments or commit messages.** Emojis are OK in user-facing UI strings if they aid recognition (e.g., red stroke alert badge).

---

## Workflow rules

- **Source of truth for tasks:** `backlog.yaml`. Pick the lowest-id `pending` task whose dependencies are `completed`, mark it `in_progress` while you work, mark it `completed` when its acceptance criteria pass. Do not invent tasks that aren't there.
- **Commit and push directly to `main`.** During the hackathon we prioritize speed over PRs. CI must stay green; if you break it, fix forward immediately. (This is a deliberate hackathon policy — it should not be applied to post-hackathon work without re-discussion.)
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **Tests before commit:** `pytest -v` after every change to `rules.py`, `triage.py`, `schemas.py`. The 5 demo cases are the ground truth.
- **Never modify a demo case** in `data/demo_cases.json` to make a failing test pass. The test is right; fix the logic.
- **Before each commit:** `ruff check . --fix` (backend) + `npm run lint` (frontend).
- **Never commit files inside `docs/` or `resources/`.** They are gitignored on purpose — strategy artifacts must stay private.
- **All public-facing text must be in English** (README, code comments, commit messages, public docs). **User-facing UI clinical content is in Spanish** (questions, reasoning, alerts).

---

## Gotchas

- **Gemma 4 JSON mode is enabled in `llm.py`** via `format="json"`. If you change the system prompt, validate that Gemma still emits parseable JSON. The fallback regex `\{.*\}` handles minor preamble but not malformed JSON.
- **ChromaDB collection is rebuilt at every FastAPI startup** (in-memory client). This costs ~5s on boot. Do not switch to a persistent client without testing — RAG quality may degrade if old chunks linger.
- **The 26B-A4B model takes ~30s to warm up the first time** after Ollama starts. A warmup call must run in `app.main` startup before the service is "ready" for video recording.
- **macOS Activity Monitor** will show high memory pressure when 26B is loaded on the M4 24GB. This is expected. If memory pressure goes yellow, restart Ollama with `OLLAMA_NUM_PARALLEL=1`.
- **The demo cases JSON is the source of truth for the video.** If you add a case for testing, add it to a separate `tests/fixtures/` directory, **not** to `data/demo_cases.json`.
- **Never inject patient-identifying data into prompts.** Even synthetic cases should use age brackets, not exact ages, and avoid names. This matters for the privacy pitch.
- **Clinical content requires subspecialist review.** When modifying ICVD criteria, HINTS scoring logic, or anything in `icvd_corpus.md`, flag it in the commit message so the otoneurology team can review.

---

## What this MVP intentionally does NOT have

When tempted to add these, **resist** — they have been deliberately scoped out:

- FHIR / SMART-on-FHIR integration (the production roadmap has it; the MVP does not)
- EHR integration (RAYEN, TrakCare)
- User authentication, multi-tenancy, sessions, database persistence
- SaMD regulatory compliance scaffolding (ISO 13485, IEC 62304)
- Real ML model (CatBoost / XGBoost) — rules + Gemma are enough for the 3-min video
- All 8 ICVD pathologies — only the 4 in scope
- Adaptive questionnaire branching — 10 linear questions are fine
- PWA / offline service worker — "offline" is demonstrated by disconnecting WiFi on camera
- Fine-tuning Gemma (that would be the Unsloth track; we are doing the Ollama track)
- Wearable / audiometry / vHIT input
- FHIR AuditEvent logging
- Spanish-Portuguese-English i18n (Spanish only for MVP)

---

## Hackathon deliverables checklist

- [ ] Kaggle Writeup (≤1500 words) — drafted privately, then pasted into Kaggle
- [ ] YouTube video (≤3 min, public) — link in README
- [ ] Public code repo with Apache 2.0 license — this repo
- [ ] Live demo URL — Vercel deploy (TBD; may use localhost screen recording if deploy proves complex)
- [ ] Cover image (1280×720)
- [ ] Track selected on Kaggle: Impact Track — Health & Sciences

---

## Submission

**Deadline:** May 18, 2026 @ 23:59 UTC.
**Target submit time:** May 17 EOD to leave a 24-hour buffer.

---

## References

- Hackathon page: https://www.kaggle.com/competitions/gemma-4-good-hackathon
- Gemma 4 on Ollama: https://ollama.com/library/gemma4
- ICVD Bárány Society: https://www.thebaranysociety.org
- This repo's machine-readable backlog: [`backlog.yaml`](backlog.yaml)
