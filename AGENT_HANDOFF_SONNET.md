# Agent handoff — Sonnet 4.6 (Day 3 wrap, round 2)

**Target agent:** Claude Sonnet 4.6.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16 (round 2 of your assignments).
**Previous round shipped:** commits `60fcc10` and `d31692b` — ResultPanel and /demo page. Reviewed and merged. Excellent work.

This document is the contract. The contract wins where it specifies behavior. When in doubt, stop and ask the human — do not improvise.

You are running in **parallel** with another agent (Opus 4.6 thinking, in `AGENT_HANDOFF_OPUS46.md`). That agent is producing an SVG cover image. Your work and theirs are file-disjoint.

---

## 0. Read these files first, in this order

1. `CLAUDE.md`
2. `backlog.yaml` (especially the `runtime_decisions` block).
3. `frontend/components/ResultPanel.tsx` — note the inline `DiagnosisCandidate` / `StrokeAlert` / `DiagnosticResult` type definitions; you will move them to a shared file.
4. `frontend/app/demo/page.tsx` — note the `as any` cast on line 65 with an eslint-disable. You will replace it with the new shared types.
5. `frontend/app/diagnose/page.tsx` — note the `any | null` for `result` state and the lack of `onBack` wiring.
6. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All UX text in Spanish. |
| R2 | All code, comments, commits in English. |
| R3 | Never touch any `backend/app/*.py` file. |
| R4 | Never touch `frontend/components/QuestionWizard.tsx` except as explicitly directed in Task C below (only its imports/usage in `/diagnose/page.tsx`, not the component itself). |
| R5 | Never touch `frontend/lib/questions.ts`. |
| R6 | Push directly to `main` with Conventional Commits. |
| R7 | Never commit anything under `docs/` or `resources/`. |
| R8 | No new dependencies. |
| R9 | Never warm up `gemma4:26b-a4b-it-q4_K_M`. |
| R10 | Other parallel agent owns `frontend/public/cover.svg`, `frontend/public/cover.png`, or anything matching `cover.*` — do not touch. |

---

## 2. What is already done

- `ResultPanel`, `QuestionWizard`, `/demo` page — all real and working.
- Backend complete; `/diagnose` and `/demo-cases` endpoints live.
- Frontend `npm run build` is green with 4 routes.
- 7 backend pytest unit tests + 4 light E2E tests passing.

Do **not** redo any of this.

---

## 3. Your assignment

Three tasks in order. The first two are refactoring; the third is a small wire-up.

| Task | Estimated time | File(s) |
|---|---|---|
| A | Create `frontend/lib/types.ts` with shared diagnostic types | 15 min |
| B | Create `frontend/lib/api.ts` with typed fetch helpers | 20 min |
| C | Refactor 3 files to consume the shared types + helpers and wire `onBack` | 30 min |
| D | Final commit + push | 5 min |

---

### Task A — Create `frontend/lib/types.ts`

**Goal:** centralize the TypeScript types that mirror the backend's `DiagnosticResult` Pydantic model so the frontend stops duplicating them inline.

**Required content (write exactly this file):**

```typescript
// Shared TypeScript mirror of the backend Pydantic models in
// backend/app/schemas.py. Keep this file in sync if the backend schema
// changes — currently it is the contract for /diagnose and /demo-cases.

export type Confidence = "alta" | "media" | "baja";

export type Urgency = "inmediata" | "alta" | "baja";

export type DiagnosisCandidate = {
  diagnosis: string;
  confidence: Confidence;
  supporting_criteria: string[];
  missing_criteria: string[];
  icvd_reference?: string | null;
};

export type StrokeAlert = {
  triggered: boolean;
  reason: string;
  urgency: Urgency;
  score_hints?: number | null;
  score_standing?: string | null;
};

export type DiagnosticResult = {
  differential: DiagnosisCandidate[];
  stroke_alert: StrokeAlert;
  clinical_reasoning: string;
  next_steps: string[];
  limitations: string;
  processing_time_ms?: number | null;
};

// Payload shape for POST /diagnose (mirrors PatientResponses in schemas.py).
// Keeping it loose (Record<string, unknown>) because the wizard accumulates
// it incrementally and validation happens server-side via Pydantic.
export type PatientResponsesPayload = Record<string, unknown>;

// Shape returned by GET /demo-cases.
export type DemoCase = {
  id: string;
  label: string;
  narrative: string;
  responses: PatientResponsesPayload;
  expected_top?: string;
  expected_top_options?: string[];
  expected_stroke_alert?: boolean;
  expected_urgency?: Urgency;
  note?: string;
};
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
test -f lib/types.ts
grep -q "export type DiagnosticResult" lib/types.ts
grep -q "export type DemoCase" lib/types.ts
grep -q "export type Confidence" lib/types.ts
npm run build  # exit 0
```

---

### Task B — Create `frontend/lib/api.ts`

**Goal:** typed fetch helpers so the pages don't repeat URL strings, headers, and error handling.

**Required content (write exactly this file):**

```typescript
// Typed wrappers around the backend HTTP API.
//
// All requests target localhost:8000 because the privacy invariant is that
// the entire stack runs on the clinician's machine. If at some point we add
// a public deploy, replace BASE_URL with process.env.NEXT_PUBLIC_API_URL —
// do NOT introduce a new dependency for this.

import type { DemoCase, DiagnosticResult, PatientResponsesPayload } from "./types";

const BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchHealthcheck(): Promise<{ offline: boolean }> {
  const res = await fetch(`${BASE_URL}/healthcheck`);
  if (!res.ok) throw new ApiError("Healthcheck failed", res.status);
  return res.json();
}

export async function fetchDemoCases(): Promise<DemoCase[]> {
  const res = await fetch(`${BASE_URL}/demo-cases`);
  if (!res.ok) throw new ApiError("Failed to load demo cases", res.status);
  return res.json();
}

export async function postDiagnose(
  payload: PatientResponsesPayload,
): Promise<DiagnosticResult> {
  const res = await fetch(`${BASE_URL}/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Diagnose failed: ${body || res.statusText}`, res.status);
  }
  return res.json();
}
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
test -f lib/api.ts
grep -q "export async function postDiagnose" lib/api.ts
grep -q "export async function fetchDemoCases" lib/api.ts
grep -q "export class ApiError" lib/api.ts
npm run build  # exit 0
```

---

### Task C — Refactor 3 files to use the shared types + helpers

**Goal:** remove duplicated types and inline fetch calls. Wire `onBack` from `/diagnose/page.tsx` to `QuestionWizard`. **Do NOT modify QuestionWizard itself** — it already accepts an optional `onBack` prop.

**Edit 1: `frontend/components/ResultPanel.tsx`**

Currently defines `DiagnosisCandidate`, `StrokeAlert`, and `DiagnosticResult` inline (lines 16-39 in the current file). Remove those local type definitions and import them from `@/lib/types` instead. The `Props` type and the rest of the component stay unchanged.

Specifically:
- Delete the inline type definitions for `DiagnosisCandidate`, `StrokeAlert`, `DiagnosticResult` (≈ 25 lines).
- Add this import near the top:
  ```typescript
  import type { DiagnosticResult } from "@/lib/types";
  ```
- The `Props` type stays as is (it references `DiagnosticResult` which is now imported).

**Edit 2: `frontend/app/demo/page.tsx`**

Currently defines its own local `DemoCase` type (lines 14-20), uses `unknown | null` for `result`, and contains `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with an `as any` cast (lines 64-65).

Replace those with:
- Import `DemoCase` and `DiagnosticResult` from `@/lib/types`.
- Type `result` as `DiagnosticResult | null` instead of `unknown | null`.
- Delete the local `DemoCase` type.
- Delete the eslint-disable comment AND the `as any` cast — just pass `result` directly to `<ResultPanel result={result} onRestart={reset} />` after the truthy check (TypeScript will narrow it).
- Replace the inline `fetch("http://localhost:8000/demo-cases")` block with `fetchDemoCases()`.
- Replace the inline `fetch("http://localhost:8000/diagnose", { method: "POST", ... })` block with `postDiagnose(c.responses)`.

After the edit, the file should:
- Import: `import { fetchDemoCases, postDiagnose } from "@/lib/api";` and `import type { DemoCase, DiagnosticResult } from "@/lib/types";`.
- No `as any`, no eslint-disable, no inline URLs.

**Edit 3: `frontend/app/diagnose/page.tsx`**

Currently uses `any | null` for `result`, has inline `fetch("http://localhost:8000/diagnose", ...)`, and does NOT pass `onBack` to QuestionWizard.

Make these specific changes:

1. Import the helpers + types:
   ```typescript
   import { postDiagnose } from "@/lib/api";
   import type { DiagnosticResult } from "@/lib/types";
   ```

2. Change `useState<any | null>(null)` to `useState<DiagnosticResult | null>(null)`.

3. Replace the body of `handleSubmit` so it calls `postDiagnose(payload)` instead of the inline `fetch`.

4. Add a `step` decrement handler and pass it as `onBack` to `<QuestionWizard>`:
   ```typescript
   const handleBack = () => setStep((s) => Math.max(0, s - 1));
   ```
   Then in the JSX:
   ```tsx
   <QuestionWizard
     step={step}
     responses={responses}
     onAnswer={handleAnswer}
     onComplete={handleSubmit}
     onBack={handleBack}
     loading={loading}
   />
   ```

5. The current `handleAnswer` does not bump `step`. Update it so it does — that's the user expectation now that the wizard advances internally **and** asks the parent to track it. Replace:
   ```typescript
   const handleAnswer = (field: string, value: any) => {
     setResponses((prev) => ({ ...prev, [field]: value }));
   };
   ```
   with:
   ```typescript
   const handleAnswer = (field: string, value: string | boolean) => {
     setResponses((prev) => ({ ...prev, [field]: value }));
     setStep((s) => s + 1);
   };
   ```
   Note the typed parameter `value: string | boolean` instead of `any`.

**Acceptance criteria for Task C:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. No inline duplicated types remain
! grep -q '^type DiagnosisCandidate' components/ResultPanel.tsx
! grep -q '^type StrokeAlert' components/ResultPanel.tsx
! grep -q '^type DiagnosticResult' components/ResultPanel.tsx
! grep -q '^type DemoCase' app/demo/page.tsx

# 2. The shared types are imported
grep -q '@/lib/types' components/ResultPanel.tsx
grep -q '@/lib/types' app/demo/page.tsx
grep -q '@/lib/types' app/diagnose/page.tsx

# 3. The API helper is used (no more inline fetch to /diagnose or /demo-cases)
grep -q '@/lib/api' app/demo/page.tsx
grep -q '@/lib/api' app/diagnose/page.tsx
! grep -q 'localhost:8000/diagnose' app/demo/page.tsx
! grep -q 'localhost:8000/diagnose' app/diagnose/page.tsx
! grep -q 'localhost:8000/demo-cases' app/demo/page.tsx

# 4. onBack is wired
grep -q 'onBack={handleBack}' app/diagnose/page.tsx
grep -q 'const handleBack' app/diagnose/page.tsx

# 5. No more `as any` in the refactored files
! grep -q 'as any' app/demo/page.tsx
! grep -q 'eslint-disable' app/demo/page.tsx

# 6. Build is green
npm run build
```

Commit message: `refactor(frontend): shared types and API helpers, wire wizard onBack`.

Mark `D3-T10` in `backlog.yaml` as `completed` (this is effectively the Day 3 closing refactor).

---

### Task D — Final push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected modified/new files only:
#   frontend/lib/types.ts                   (new)
#   frontend/lib/api.ts                     (new)
#   frontend/components/ResultPanel.tsx     (modified)
#   frontend/app/demo/page.tsx              (modified)
#   frontend/app/diagnose/page.tsx          (modified)
#   backlog.yaml                            (D3-T10 status)
#
# Anything under docs/, resources/, or matching cover.* or icon.svg = STOP.

git push origin main
```

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `frontend/components/QuestionWizard.tsx` | The component is finalized; only its usage in `/diagnose/page.tsx` changes. |
| Touch `frontend/components/OfflineBadge.tsx` | Stable. |
| Touch `frontend/lib/questions.ts` | Read-only. |
| Touch `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/app/icon.svg` | Out of scope. |
| Touch ANY `backend/app/*.py` file | Backend is frozen. |
| Touch files matching `cover.*` (any extension, any directory) | Owned by parallel agent. |
| Add new shadcn components, new dependencies | Stick to what is installed. |
| Refactor `QuestionWizard.tsx`'s internal `internalStep` state | The parallel-agent solution is correct; don't second-guess it. |

---

## 5. When to stop and ask the human

1. Any acceptance-criteria check returns a failure.
2. `npm run build` produces TypeScript errors you can't fix in 2 attempts.
3. `git status` shows files outside your assigned set as modified.
4. You're tempted to "improve" QuestionWizard, types, or helpers beyond the spec.

---

## 6. After Tasks A–D ship

1. One-paragraph summary.
2. `git log --oneline -5`.
3. Confirm `D3-T10` → completed.
4. Stop.

---

**End of handoff.**
