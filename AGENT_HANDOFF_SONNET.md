# Agent handoff — Sonnet 4.6 (Day 3, parallel track A)

**Target agent:** Claude Sonnet 4.6 (or any code-fluent agent with file-system + shell + git tools).
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16.

This document is the contract. If anything below conflicts with what you "feel" should be done, **the contract wins**. When in doubt, stop and ask the human — do not improvise.

You are running in **parallel** with another agent (Opus 4.6 thinking, in `AGENT_HANDOFF_OPUS46.md`). That agent is writing `QuestionWizard.tsx`. Your work and theirs are file-disjoint: do not touch any file they own.

---

## 0. Read these files first, in this order

1. `CLAUDE.md`
2. `backlog.yaml` (especially the `runtime_decisions` block — those are constraints).
3. `README.md` (for landing-page context).
4. This file.

Do **not** read anything under `docs/` or `resources/` — gitignored on purpose.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All clinical UX text in Spanish. |
| R2 | All code, comments, commits in English. |
| R3 | 100% local. No external API calls. |
| R4 | No `dict[str, Any]` in route signatures. |
| R5 | Confidence values are exactly `alta`, `media`, `baja`. |
| R6 | Never commit anything under `docs/` or `resources/`. |
| R7 | Never modify `data/demo_cases.json`. |
| R8 | Push directly to `main` with Conventional Commits. |
| R9 | Never touch any `backend/app/*.py` file. Backend is frozen for you. |
| R10 | Never touch `frontend/components/QuestionWizard.tsx` — that file is owned by the Opus 4.6 thinking agent on the parallel track. |
| R11 | Never touch `frontend/lib/questions.ts` — read-only for you. |
| R12 | Never warm up `gemma4:26b-a4b-it-q4_K_M`. |

---

## 2. What is already done

- Backend complete and tested. `/diagnose` returns structured JSON; `/demo-cases` returns the 5 cases array.
- Frontend bootstrapped (Next.js 16.2.6 + React 19.2.4 + shadcn/ui).
- Landing page (`app/page.tsx`), OfflineBadge (`components/OfflineBadge.tsx`), diagnose-page shell (`app/diagnose/page.tsx`), QuestionWizard + ResultPanel **stubs**.
- Canonical questions list at `frontend/lib/questions.ts` (10 questions, Spanish labels, values aligned with backend enums).

Do **not** redo any of this.

---

## 3. Your assignment

Two tasks, in order: D3-T04 (ResultPanel real) then D3-T05 (/demo page).

| Task | Backlog ID | Estimated time | File(s) |
|---|---|---|---|
| A | D3-T04 ResultPanel real | 60 min | `frontend/components/ResultPanel.tsx` (replace stub) |
| B | D3-T05 `/demo` page | 30 min | `frontend/app/demo/page.tsx` (new) |
| C | Final commit + push | 5 min | git |

---

### Task A — D3-T04: real `ResultPanel.tsx`

**Goal:** replace the stub at `frontend/components/ResultPanel.tsx` with a real, polished result view. This is the "wow" moment of the demo video — when the stroke alert is triggered, the red alert must be **visually dominant**.

**Component contract (TypeScript types):**

```typescript
type DiagnosisCandidate = {
  diagnosis: string;
  confidence: "alta" | "media" | "baja";
  supporting_criteria: string[];
  missing_criteria: string[];
  icvd_reference?: string | null;
};

type StrokeAlert = {
  triggered: boolean;
  reason: string;
  urgency: "inmediata" | "alta" | "baja";
  score_hints?: number | null;
  score_standing?: string | null;
};

type DiagnosticResult = {
  differential: DiagnosisCandidate[];
  stroke_alert: StrokeAlert;
  clinical_reasoning: string;
  next_steps: string[];
  limitations: string;
  processing_time_ms?: number | null;
};

type Props = {
  result: DiagnosticResult;
  onRestart: () => void;
};
```

Export the component as a named export `ResultPanel` (matches what `app/diagnose/page.tsx` already imports).

**Required rendered structure, top to bottom:**

1. **Stroke alert** (only when `result.stroke_alert.triggered === true`).
   - Use shadcn `<Alert>` with a custom red theme.
   - Tailwind: `border-red-500 bg-red-50 dark:bg-red-950 border-2`.
   - Title: `🚨 ALERTA — Sospecha de causa central` (the only emoji allowed; it carries clinical meaning).
   - Body lines in Spanish:
     - `Urgencia: {urgency.toUpperCase()}`
     - `{result.stroke_alert.reason}`
     - If `score_hints !== null`: `Score HINTS-adaptado: {score_hints}`
   - Wrap in a `framer-motion` `<motion.div>` with `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}`.

2. **Differential diagnoses card** (always).
   - shadcn `<Card>` with `<Brain>` icon from `lucide-react`.
   - Title in Spanish: `Diagnóstico diferencial`.
   - Render up to 3 candidates from `result.differential.slice(0, 3)`.
   - Each candidate is a bordered block with:
     - Heading: `{i+1}. {candidate.diagnosis}` and a confidence `<Badge>`.
     - Badge color by confidence:
       - `alta` → `bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 border-green-300`
       - `media` → `bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-300`
       - `baja` → `bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-300`
     - Below: if `supporting_criteria.length > 0`, render a green section with the heading `✓ Criterios cumplidos:` and a list. Tailwind `text-green-700 dark:text-green-400`. (The check mark is a Unicode glyph, not an emoji; keep it.)
     - If `missing_criteria.length > 0`, render an amber section `✗ Criterios faltantes:` with `text-amber-700 dark:text-amber-400`.
     - If `icvd_reference`: a small italic line at the bottom, `text-xs text-muted-foreground italic`.
   - Wrap each candidate in `<motion.div>` with staggered entrance: `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}`.

3. **Clinical reasoning card** (always).
   - shadcn `<Card>` with a subtle blue tint: `border-blue-200 bg-blue-50/30 dark:bg-blue-950/30`.
   - Title in Spanish: `Razonamiento clínico`. Icon `<Brain>` from `lucide-react`.
   - A small `<Badge variant="outline">` aligned right with the text `Gemma 4 · Local`.
   - Body: `<p>` with the full `result.clinical_reasoning`. Use `whitespace-pre-line` so newlines from the model render.

4. **Next steps card** (always).
   - shadcn `<Card>` with `<ListChecks>` icon (lucide-react).
   - Title in Spanish: `Próximos pasos`.
   - Render `result.next_steps` as an ordered list. Each step is wrapped in a `<motion.li>` with staggered entrance (`delay: i * 0.1`).
   - Step bullet: a circular number badge `<span>` with `flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-medium`.

5. **Limitations card** (always).
   - shadcn `<Card>` with `bg-slate-100/50 dark:bg-slate-900/50`.
   - `<Info>` icon (lucide-react), title `Limitaciones`.
   - Body: `<p className="text-sm text-muted-foreground">{result.limitations}</p>`.

6. **Disclaimer** (always).
   - shadcn `<Alert>` (default variant).
   - `<Info>` icon, body text in Spanish:
     `VertigoDx es una herramienta de apoyo al diagnóstico, no un dispositivo médico aprobado. El diagnóstico definitivo y las decisiones terapéuticas son siempre responsabilidad del médico tratante.`
   - The word `apoyo al diagnóstico` should be wrapped in `<strong>`.

7. **Footer row** (always).
   - Flex row, space-between.
   - Left: if `result.processing_time_ms != null`, render small muted text `Procesado en {(result.processing_time_ms / 1000).toFixed(1)}s · 100% local · sin internet`.
   - Right: shadcn `<Button variant="outline" onClick={onRestart}>` with `<RotateCcw>` icon (lucide-react) and label `Nueva evaluación`.

**Wrapping layout:**

```tsx
<main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
  <div className="container mx-auto px-4 max-w-3xl space-y-6">
    {/* stroke alert (conditional) */}
    {/* differential card */}
    {/* clinical reasoning card */}
    {/* next steps card */}
    {/* limitations card */}
    {/* disclaimer */}
    {/* footer row */}
  </div>
</main>
```

**Allowed imports:**

```typescript
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Info,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

Do not import anything else. Do not introduce new shadcn components or new dependencies.

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. The file is no longer a stub
test -f components/ResultPanel.tsx
grep -q "function ResultPanel\|const ResultPanel" components/ResultPanel.tsx
! grep -q "TODO: result panel" components/ResultPanel.tsx

# 2. Required pieces are present
grep -q "Diagnóstico diferencial" components/ResultPanel.tsx
grep -q "Razonamiento clínico" components/ResultPanel.tsx
grep -q "Próximos pasos" components/ResultPanel.tsx
grep -q "Limitaciones" components/ResultPanel.tsx
grep -q "apoyo al diagnóstico" components/ResultPanel.tsx
grep -q "Nueva evaluación" components/ResultPanel.tsx

# 3. Stroke alert rendered conditionally
grep -q "stroke_alert.triggered" components/ResultPanel.tsx

# 4. Confidence badge color classes referenced
grep -q "bg-green-100" components/ResultPanel.tsx
grep -q "bg-yellow-100" components/ResultPanel.tsx

# 5. Build is green
npm run build
```

Commit message: `feat(frontend): real ResultPanel with stroke alert, differential, reasoning, next steps`.

Mark `D3-T04` in `backlog.yaml` as `completed`.

---

### Task B — D3-T05: `/demo` page

**Goal:** create `frontend/app/demo/page.tsx`. Lists the 5 demo cases from `GET /demo-cases`, each with an `Ejecutar` button that POSTs the case to `/diagnose` and renders the result via your new `ResultPanel`.

**Required file contents:**

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { OfflineBadge } from "@/components/OfflineBadge";
import { ResultPanel } from "@/components/ResultPanel";

type DemoCase = {
  id: string;
  label: string;
  narrative: string;
  responses: Record<string, unknown>;
  expected_stroke_alert?: boolean;
};

export default function DemoPage() {
  const [cases, setCases] = useState<DemoCase[]>([]);
  const [result, setResult] = useState<unknown | null>(null);
  const [selectedCase, setSelectedCase] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/demo-cases")
      .then((r) => r.json())
      .then((data: DemoCase[]) => setCases(data))
      .catch((err) => {
        console.error("Failed to load demo cases:", err);
      });
  }, []);

  async function runCase(c: DemoCase) {
    setLoading(true);
    setSelectedCase(c);
    try {
      const res = await fetch("http://localhost:8000/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.responses),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Error al procesar el caso. Verifica que el backend esté corriendo.");
      setSelectedCase(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSelectedCase(null);
  }

  if (result && selectedCase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typed = result as any;
    return (
      <>
        <OfflineBadge />
        <div className="bg-slate-100 dark:bg-slate-900 py-3 px-4 text-center text-sm">
          Caso demo: <strong>{selectedCase.label}</strong> · {selectedCase.narrative}
        </div>
        <ResultPanel result={typed} onRestart={reset} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <OfflineBadge />
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Casos demo</h1>
          <p className="text-muted-foreground">
            5 casos clínicos guionizados que muestran las capacidades de VertigoDx
            en BPPV, Ménière, migraña vestibular, sospecha de stroke y comorbilidad.
          </p>
        </div>

        {loading && (
          <Card className="p-8 text-center">
            <p className="font-medium">Procesando con Gemma 4...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aplicando criterios ICVD · Calculando triaje · Generando razonamiento
            </p>
          </Card>
        )}

        {!loading &&
          cases.map((c) => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{c.label}</h3>
                    {c.expected_stroke_alert && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Alerta de causa central
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.narrative}</p>
                </div>
                <Button onClick={() => runCase(c)} disabled={loading}>
                  Ejecutar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}

        <div className="text-center pt-4">
          <Link href="/diagnose">
            <Button variant="outline">O ingresa un caso nuevo manualmente</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
```

**Acceptance criteria:**

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. File exists in the right place
test -f app/demo/page.tsx

# 2. Imports ResultPanel and OfflineBadge
grep -q 'from "@/components/ResultPanel"' app/demo/page.tsx
grep -q 'from "@/components/OfflineBadge"' app/demo/page.tsx

# 3. Fetches /demo-cases and POSTs /diagnose
grep -q 'localhost:8000/demo-cases' app/demo/page.tsx
grep -q 'localhost:8000/diagnose' app/demo/page.tsx

# 4. Build is green
npm run build
```

Commit message: `feat(frontend): /demo page with one-click execution against the 5 demo cases`.

Mark `D3-T05` in `backlog.yaml` as `completed`.

---

### Task C — Final commit + push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

git status
# Expected modified/new files only:
#   frontend/components/ResultPanel.tsx
#   frontend/app/demo/page.tsx
#   backlog.yaml

# DO NOT add or commit frontend/components/QuestionWizard.tsx
# even if it shows as modified — that belongs to the parallel agent.
# If it shows in git status as modified, STOP and report.

git push origin main
```

If you committed per-task, just push. If you batched, use the commit message
in Task B section as the final commit.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `frontend/components/QuestionWizard.tsx` | Owned by parallel agent. |
| Touch `frontend/lib/questions.ts` | Read-only. |
| Touch ANY `backend/app/*.py` file | Backend is frozen for you. |
| Add new shadcn components, new dependencies | Stick to what is already installed. |
| Use any emoji other than `🚨` (in the stroke alert title) | The stroke alert glyph is intentional. |
| Edit `backend/app/prompts.py` | Reserved for senior. |
| Commit anything in `docs/` or `resources/` | Gitignored on purpose. |
| Edit `AGENT_HANDOFF*.md` files | They are owned by the senior agent. |
| Run `ollama pull` on any new model | Three models are fixed. |

---

## 5. When to stop and ask the human

1. Any acceptance-criteria check returns a failure.
2. `npm run build` produces errors you can't fix in 2 attempts.
3. `git status` shows `QuestionWizard.tsx` as modified (means a race with the parallel agent).
4. `git status` shows files under `docs/` or `resources/`.
5. A `backend/app/*.py` file shows as modified.
6. You're tempted to introduce a new component, dependency, or animation library.

When stopping, report: which task, which command failed, exact stderr, what you were about to try.

---

## 6. After Tasks A–C ship: hand back

1. One-paragraph summary of what changed.
2. List the commits you pushed (`git log --oneline -5`).
3. Confirm in `backlog.yaml`: `D3-T04` → completed, `D3-T05` → completed.
4. Stop.

---

## 7. Reference: how to verify any time

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"
npm run build              # exit 0
```

For full end-to-end verification (optional — only if you want to see your
ResultPanel render against real data):

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/backend"
.venv/bin/uvicorn app.main:app --port 8000 &
until curl -fsS http://127.0.0.1:8000/healthcheck >/dev/null 2>&1; do sleep 5; done
cd ../frontend && npm run dev
# In another terminal: open http://localhost:3000/demo and click case_01.
# Kill both when done.
```

---

**End of handoff.** Read it once more before starting.
