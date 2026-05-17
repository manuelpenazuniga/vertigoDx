# Agent handoff — Opus 4.6 thinking (round 4)

**Target agent:** Claude Opus 4.6 with extended thinking enabled.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-17, round 4.
**Previous rounds shipped:** `9d1e408` (QuestionWizard with internalStep), `6240af0` (cover image), `c38416f` (SSE backend endpoint). All landed with high marks.

This is the **WOW round**. Your work today is what the judges see in the 3-minute video. Use extended thinking on animation timing and state transitions — the difference between "demo works" and "judges remember it" is precisely in those details.

You are running in **parallel** with Sonnet 4.6 (`AGENT_HANDOFF_SONNET.md`). Sonnet adds two backend fields and renders them in ResultPanel footer. Your work touches `ResultPanel` too — you both need to coordinate. **Sonnet only adds to the footer; you work everywhere else.** Read Sonnet's handoff section 3 if you want to verify scope boundaries.

---

## 0. Read these files first, in this order

1. `CLAUDE.md`
2. `backlog.yaml` (especially `runtime_decisions`)
3. `backend/app/main.py` — the streaming endpoint is at line 178+. Read the event payload shape carefully.
4. `frontend/lib/api.ts` — you will add a new `streamDiagnose` helper here.
5. `frontend/app/diagnose/page.tsx` and `frontend/app/demo/page.tsx` — the two callers you migrate.
6. `frontend/components/QuestionWizard.tsx` — its loading state goes away when you take over with the pipeline view.
7. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All UX strings in Spanish. |
| R2 | All code, comments, commits in English. |
| R3 | Never modify any `backend/app/*.py` file. The SSE endpoint already works. |
| R4 | Never touch `frontend/components/ResultPanel.tsx` except to consume the new field `pipeline_events` (you'll add it to props if needed). The footer additions belong to Sonnet. |
| R5 | The `postDiagnose` helper in `lib/api.ts` stays where it is — do NOT delete it. Add `streamDiagnose` alongside. |
| R6 | Push directly to `main` with Conventional Commits. |
| R7 | Never commit under `docs/` or `resources/`. |
| R8 | No new dependencies. The SSE consumer uses the native `fetch + ReadableStream` API. |
| R9 | Sonnet 4.6 owns `model_used`, `timestamp`, and `corpus_version` fields in `DiagnosticResult` + their rendering in `ResultPanel` footer. Do NOT touch those. |

---

## 2. What is already done

- Backend: `POST /diagnose/stream` emits SSE events in order: `rules`, `triage`, `rag`, optional `model_loading`, `reasoning`, `complete`. The endpoint is fully tested (curl examples in commit `c38416f`).
- Backend: `POST /diagnose` (the sync sibling) still exists and stays as a fallback path.
- Frontend: `lib/api.ts` has `postDiagnose` and `fetchDemoCases`. `ResultPanel` renders fine. Two pages consume it: `/diagnose` (wizard flow) and `/demo` (one-click cases).

You are NOT redoing any of this.

---

## 3. Your assignment

| Task | Estimated time | File(s) |
|---|---|---|
| A | Add `streamDiagnose` helper to `lib/api.ts` | 30 min |
| B | Create `PipelineProgress.tsx` component | 60 min |
| C | Wire `streamDiagnose` + `PipelineProgress` into `/demo/page.tsx` | 30 min |
| D | Wire `streamDiagnose` + `PipelineProgress` into `/diagnose/page.tsx` (replace QuestionWizard loading state) | 30 min |
| E | Final commit + push | 5 min |

---

### Task A — `streamDiagnose` helper in `lib/api.ts`

**Goal:** add a typed wrapper that consumes the SSE stream and reports each stage via a callback. Returns the final `DiagnosticResult` once the `reasoning` event arrives.

**Add to `frontend/lib/api.ts`** (do not touch existing `postDiagnose`):

```typescript
import type { DemoCase, DiagnosticResult, PatientResponsesPayload } from "./types";

// existing code stays...

/** Stage names emitted by the backend in order. */
export type PipelineStage =
  | "rules"
  | "triage"
  | "rag"
  | "model_loading"
  | "reasoning"
  | "complete";

export type StageEvent = {
  stage: PipelineStage;
  payload: Record<string, unknown>;
};

/** Stream the /diagnose/stream SSE endpoint, calling onStage for every event.
 *  Resolves with the final DiagnosticResult once the "reasoning" stage arrives.
 *  Throws ApiError if the stream ends without delivering a reasoning event.
 */
export async function streamDiagnose(
  payload: PatientResponsesPayload,
  onStage: (event: StageEvent) => void,
): Promise<DiagnosticResult> {
  const res = await fetch(`${BASE_URL}/diagnose/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Stream failed: ${body || res.statusText}`, res.status);
  }
  if (!res.body) throw new ApiError("Stream has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DiagnosticResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line ("\n\n").
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      if (!frame.startsWith("data: ")) continue;
      const json = frame.slice(6);
      let parsed: StageEvent;
      try {
        parsed = JSON.parse(json) as StageEvent;
      } catch {
        continue; // skip malformed frames defensively
      }
      onStage(parsed);
      if (parsed.stage === "reasoning") {
        result = parsed.payload as unknown as DiagnosticResult;
      }
    }
  }

  if (!result) throw new ApiError("Stream ended without reasoning event");
  return result;
}
```

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
grep -q "export async function streamDiagnose" lib/api.ts
grep -q "ReadableStream\|getReader" lib/api.ts || grep -q "res.body.getReader" lib/api.ts
npm run build
```

---

### Task B — `PipelineProgress.tsx` component

**Goal:** a self-contained component that displays the live pipeline as the SSE stream advances. Each stage has 3 visual states: `pending` (gray), `active` (spinner + animated), `done` (green check).

**File:** `frontend/components/PipelineProgress.tsx` (new).

**Required props:**

```typescript
type Props = {
  /** Stages seen so far, in arrival order. Pass the names emitted by the backend. */
  stagesSeen: string[];
  /** True if the request is still in flight. */
  loading: boolean;
};
```

**Required visual structure (use the EXACT labels in Spanish):**

```
┌────────────────────────────────────────────────┐
│  [✓]  Reglas ICVD aplicadas                    │  ← done state
│  [✓]  Triaje de causa central calculado        │
│  [✓]  3 criterios ICVD recuperados             │
│  [⏳] Gemma 4 razonando...                    │  ← active state (current)
│         └ Modelo: gemma4:e4b · Local            │  ← muted subline
│  [ ]  Diagnóstico listo                        │  ← pending state
└────────────────────────────────────────────────┘
```

**Stage → label mapping (use this Map):**

```typescript
const STAGE_LABELS: Record<string, string> = {
  rules: "Reglas ICVD aplicadas",
  triage: "Triaje de causa central calculado",
  rag: "Criterios ICVD recuperados",
  model_loading: "Cargando modelo pesado (alta criticidad)",
  reasoning: "Gemma 4 razonando",
  complete: "Diagnóstico listo",
};

const STAGE_ORDER = ["rules", "triage", "rag", "reasoning", "complete"] as const;
```

The `model_loading` stage is **inserted between rag and reasoning** only when it appears — it signals a stroke case where the autoscaler is loading the 17 GB model. When it shows, change the `reasoning` label to "Gemma 4 (26B) razonando — caso de alta criticidad".

**Behavior:**

- A stage with name in `stagesSeen` and **the next stage also in `stagesSeen`** → render `done` (green ✓).
- The last stage in `stagesSeen` while `loading=true` → render `active` (spinner + animation).
- Stages after the active one → render `pending` (faded gray, no spinner).
- When `loading=false` and `complete` is in `stagesSeen` → all rows done.

**Animation requirements:**

- Use `framer-motion`. New stages enter with `initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}`.
- The active stage's icon pulses subtly: `animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}`.
- When a stage flips from active to done, the check appears with `initial={{ scale: 0.6 }} animate={{ scale: 1 }}`.

**Allowed imports:**

```typescript
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
```

No other imports. No shadcn primitives needed.

### Use extended thinking on

1. **What if `rag` arrives before `triage`?** The backend orders them, but a slow network could reorder frames. Be defensive: use `STAGE_ORDER` to map position in the canonical order, not arrival order. A stage is "done" if any later stage has been seen.
2. **What if the user navigates away mid-stream?** The component just unmounts; no cleanup needed. But the parent's stream subscription needs to be cancelable — note this in your final summary so the senior agent can decide later whether to add AbortController.
3. **What if `model_loading` event never comes (non-stroke case)?** The pipeline only shows the 5 standard stages. No empty row, no placeholder.
4. **Loading state and unmount race**: the `loading` prop comes from the parent. When the parent unmounts the component to render `ResultPanel`, the active row will never get its final check — that's fine, the result is already visible. Don't add cleanup logic.

### Acceptance

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
test -f components/PipelineProgress.tsx
grep -q "export function PipelineProgress" components/PipelineProgress.tsx
grep -q "Reglas ICVD aplicadas" components/PipelineProgress.tsx
grep -q "Triaje de causa central calculado" components/PipelineProgress.tsx
grep -q "Gemma 4 razonando" components/PipelineProgress.tsx
grep -q "Cargando modelo pesado" components/PipelineProgress.tsx
grep -q "AnimatePresence" components/PipelineProgress.tsx
npm run build
```

---

### Task C — Wire into `/demo/page.tsx`

Replace the existing call:

```typescript
// OLD:
const data = await postDiagnose(c.responses);

// NEW:
const stagesSeen: string[] = [];
setStagesSeen([]);
const data = await streamDiagnose(c.responses, (event) => {
  stagesSeen.push(event.stage);
  setStagesSeen([...stagesSeen]);
});
```

Add state:

```typescript
const [stagesSeen, setStagesSeen] = useState<string[]>([]);
```

Replace the loading `<Card>` block with:

```tsx
{loading && (
  <Card className="p-8">
    <PipelineProgress stagesSeen={stagesSeen} loading={loading} />
  </Card>
)}
```

When `loading` flips to false (in the `finally` block), **leave `stagesSeen` as is** — the user won't see it again because the result panel takes over.

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
grep -q "streamDiagnose" app/demo/page.tsx
grep -q "PipelineProgress" app/demo/page.tsx
! grep -q "await postDiagnose" app/demo/page.tsx
npm run build
```

---

### Task D — Wire into `/diagnose/page.tsx` (wizard flow)

Same pattern. Migrate `handleSubmit`:

```typescript
const [stagesSeen, setStagesSeen] = useState<string[]>([]);

const handleSubmit = async (payload: Record<string, unknown>) => {
  setLoading(true);
  setStagesSeen([]);
  try {
    const stages: string[] = [];
    const data = await streamDiagnose(payload, (event) => {
      stages.push(event.stage);
      setStagesSeen([...stages]);
    });
    setResult(data);
  } catch (error) {
    alert("Hubo un error al procesar el diagnóstico.");
  } finally {
    setLoading(false);
  }
};
```

**Critical**: when `loading=true`, the parent should render `<PipelineProgress />` INSTEAD of the `QuestionWizard`'s internal spinner. The cleanest way:

- If `loading && !result`, render `<Card><PipelineProgress stagesSeen={stagesSeen} loading={loading} /></Card>` in place of the wizard card.
- The QuestionWizard's `loading={loading}` prop can stay false from the parent's perspective during this state (its internal loading view never fires).

```tsx
{!result && loading && (
  <Card className="p-8 min-h-[400px]">
    <PipelineProgress stagesSeen={stagesSeen} loading={loading} />
  </Card>
)}

{!result && !loading && (
  <Card className="p-6 min-h-[400px]">
    <QuestionWizard ... loading={false} />
  </Card>
)}
```

This change is **additive** — doesn't break the wizard, just shows the pipeline view during the network round-trip.

**Acceptance:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
grep -q "streamDiagnose" app/diagnose/page.tsx
grep -q "PipelineProgress" app/diagnose/page.tsx
! grep -q "await postDiagnose" app/diagnose/page.tsx
npm run build
```

---

### Task E — Final commit + push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected files modified/new ONLY:
#   frontend/lib/api.ts                              (modified)
#   frontend/components/PipelineProgress.tsx         (new)
#   frontend/app/demo/page.tsx                       (modified)
#   frontend/app/diagnose/page.tsx                   (modified)
#
# If ResultPanel.tsx is modified, STOP — that means a race with Sonnet.
# If any backend/ file is modified, STOP.

git push origin main
```

Commit message: `feat(frontend): live pipeline progress via SSE — judge sees the 3-layer arch in real time`.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `backend/app/main.py` or any backend file | SSE endpoint is final. |
| Touch `ResultPanel.tsx` | Sonnet owns the footer changes there. |
| Remove `postDiagnose` from `lib/api.ts` | Keep it as a fallback / for tests. |
| Add `AbortController` to the stream | Out of scope; document as TODO in summary. |
| Add new npm dependencies | Use native fetch + framer-motion. |
| Edit `AGENT_HANDOFF*.md` | Senior owns them. |
| Commit `cover.*`, `icon.svg`, or anything in `public/` | Out of scope. |
| Mark D2-T06 as anything (it's already completed) | Stay out of backlog edits. |

---

## 5. When to stop and ask

1. Acceptance check fails.
2. `npm run build` fails with TS errors you can't fix in 2 attempts.
3. `git status` shows `ResultPanel.tsx` modified.
4. The SSE stream doesn't parse correctly when you test against case_01 BPPV — that means the backend frames are malformed somehow; report rather than try to fix.

---

## 6. After it ships

1. One-paragraph summary of what changed, including whether you tested manually against case_01 BPPV via the deployed app.
2. `git log --oneline -3`.
3. Note any TODOs (e.g., AbortController, error rendering in PipelineProgress).
4. Stop.

---

**End of handoff.** This is the WOW round. Make the pipeline visible.
