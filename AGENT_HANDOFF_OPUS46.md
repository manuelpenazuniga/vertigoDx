# Agent handoff — Opus 4.6 thinking (Day 3, parallel track B)

**Target agent:** Claude Opus 4.6 with extended thinking enabled.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16.

This document is the contract. You have the headroom to make judgment calls — but the contract still wins where it specifies behavior. Use extended thinking on the design questions (animation state machine, edge cases), not on questions the contract already answers.

You are running in **parallel** with another agent (Sonnet 4.6, in `AGENT_HANDOFF_SONNET.md`). That agent is writing `ResultPanel.tsx` and `app/demo/page.tsx`. Your work and theirs are file-disjoint: do not touch any file they own.

---

## 0. Read these files first

1. `CLAUDE.md` — invariants, code style, workflow.
2. `backlog.yaml` — especially the `runtime_decisions` block.
3. `frontend/lib/questions.ts` — the canonical 10-question list you will render.
4. `frontend/app/diagnose/page.tsx` — the page that already imports your component. You must match its prop contract exactly.
5. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | All UX text in Spanish. |
| R2 | All code, comments, commits in English. |
| R3 | Never touch any `backend/app/*.py` file. |
| R4 | Never touch `frontend/components/ResultPanel.tsx` or `frontend/app/demo/page.tsx` — owned by Sonnet 4.6 on the parallel track. |
| R5 | Never modify `frontend/lib/questions.ts`. Read-only for you. |
| R6 | Never modify `frontend/app/diagnose/page.tsx`. The contract for your component is fixed there. |
| R7 | Push directly to `main` with Conventional Commits. |
| R8 | Never commit anything under `docs/` or `resources/`. |
| R9 | Never run `ollama pull`. |
| R10 | Use only existing shadcn primitives (`button`, `radio-group`, `label`). Do not add new components or new dependencies. |

---

## 2. What is already done

- Backend complete; `/diagnose` returns structured JSON.
- Landing page, `OfflineBadge`, `app/diagnose/page.tsx` shell — all working.
- `frontend/lib/questions.ts` defines the canonical 10 questions (read it; it tells you everything about field names, types, options, and Spanish labels).
- The current `frontend/components/QuestionWizard.tsx` is a placeholder stub. You replace it.

---

## 3. Your assignment — D3-T03: real `QuestionWizard.tsx`

**Goal:** replace the stub with a polished, animated, accessibility-aware wizard that walks through the 10 questions and yields a complete payload to the parent on the last step.

This is the component that holds the user's attention for the entire demo. Animation discipline matters: transitions must feel **fast and confident**, not flashy.

### Prop contract (must match exactly — already used by `app/diagnose/page.tsx`)

```typescript
type QuestionWizardProps = {
  step: number;
  responses: Record<string, string | boolean>;
  onAnswer: (field: string, value: string | boolean) => void;
  onComplete: (responses: Record<string, unknown>) => void;
  loading: boolean;
};
```

The parent page passes `step` and `responses` and listens for two events:
- `onAnswer(field, value)` — call this when the user picks an answer **and confirms it by clicking Siguiente**. The parent will update `responses` and bump `step`.
- `onComplete(finalResponses)` — call this on the last step in lieu of `onAnswer`. Pass the merged final responses (including the current step's value).

The parent does NOT auto-advance on selection. Your wizard owns the **current-value local state** until the user clicks Siguiente.

### Required behavior

1. **Pick the question for the current step:** `const question = QUESTIONS[step]` from `@/lib/questions`.

2. **Local state** for the currently-selected value of the current step:
   ```typescript
   const [currentValue, setCurrentValue] = useState<string | boolean | undefined>(
     responses[question?.field] as string | boolean | undefined
   );
   ```
   Reset to the prior value if the user navigates back and returns.

3. **Loading state** — when `loading === true`, render a centered spinner and the Spanish text `Analizando con Gemma 4...` with a sub-label `Aplicando criterios ICVD · Calculando triaje · Generando razonamiento`. Hide the question UI entirely. Use the `Loader2` icon from `lucide-react` with `animate-spin`.

4. **No current question** (`step >= QUESTIONS.length`) — render `null` defensively.

5. **Question header**:
   - Small muted line: `Pregunta {step + 1} de {QUESTIONS.length}`.
   - `<h2 className="text-2xl font-semibold">{question.title}</h2>`.
   - If `question.description`, render it as `text-sm text-muted-foreground mt-2`.

6. **Question body — `type: "single"`**: use shadcn `<RadioGroup>` with `<RadioGroupItem>`. Each option is a bordered, padded, hoverable row:
   - `flex items-center space-x-3 rounded-lg border p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors`.
   - Clicking the row sets `currentValue` (not only the radio dot).
   - The selected row's appearance comes from the `RadioGroupItem` checked state — no extra styling needed.

7. **Question body — `type: "boolean"`**: render two large buttons in a `grid grid-cols-2 gap-3`. Each button is `h-20 text-base`. The variant is `default` when the current value matches that button's polarity, `outline` otherwise. Labels: `No` (false) on the left, `Sí` (true) on the right.

8. **Footer row**:
   - **Atrás** button on the left (`<Button variant="ghost">` with `<ChevronLeft>` icon). Disabled when `step === 0`. Calls a `onBack` prop... wait, the contract doesn't have `onBack`. **Read it again carefully.**

   **Decision needed here:** the prop contract above does NOT include `onBack`. The parent (`app/diagnose/page.tsx`) currently uses an arrow function that calls `setStep(...)` itself. Look at the parent file. It calls `onAnswer` then expects the parent to advance. The current parent does not actually let users go back — the back button needs `onBack` to exist.

   **Resolution:** add an optional `onBack` to the props you accept:
   ```typescript
   type QuestionWizardProps = {
     step: number;
     responses: Record<string, string | boolean>;
     onAnswer: (field: string, value: string | boolean) => void;
     onComplete: (responses: Record<string, unknown>) => void;
     loading: boolean;
     onBack?: () => void;   // optional — back button is hidden if not provided
   };
   ```
   In your component, render the Atrás button only when `typeof onBack === "function"`. This stays backward-compatible with the parent file we won't touch. (The senior agent will add `onBack` to the parent in a follow-up if desired.)

   - **Siguiente / Diagnosticar** button on the right (`<Button>` default variant). Disabled when `currentValue === undefined`. Label is `Diagnosticar` on the last step (`step === QUESTIONS.length - 1`), `Siguiente` otherwise. Include `<ChevronRight>` icon on non-last steps.

9. **Click handler on Siguiente / Diagnosticar**:
   ```typescript
   function handleNext() {
     if (currentValue === undefined) return;
     const merged = { ...responses, [question.field]: currentValue };
     if (step === QUESTIONS.length - 1) {
       onComplete(merged);
     } else {
       onAnswer(question.field, currentValue);
     }
     setCurrentValue(undefined);  // clear local pick so the next step starts fresh
   }
   ```

10. **Transitions** — wrap the question body in `framer-motion`:
    ```tsx
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        ...
      </motion.div>
    </AnimatePresence>
    ```
    The `key={step}` is critical — it tells AnimatePresence to remount on step change.

### Allowed imports

```typescript
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QUESTIONS } from "@/lib/questions";
```

No other imports. Do not introduce new shadcn components, new motion utilities, or new state libraries.

### Edge cases to think through (use extended thinking)

- **Step 0 with no `onBack`**: the Atrás button is hidden entirely (`{onBack && ...}` pattern), not just disabled.
- **Boolean step where the user picks `false`**: `currentValue === false` is falsy. Your "disabled when undefined" check must distinguish `undefined` from `false`. Use `currentValue === undefined`, not `!currentValue`.
- **AnimatePresence + key changes**: if you forget `key={step}`, the exit animation never fires. Verify by reading your own code.
- **Default value when navigating back**: when the user goes Atrás then comes forward, the prior answer should pre-select. The initializer pattern above (`responses[question.field]`) handles this, but only on **mount**. If `step` changes while the component is mounted, you need a `useEffect` that resets `currentValue` from `responses[question.field]` whenever `step` changes. **Add this `useEffect`.**
- **Loading screen takes the whole card**: do not render the header + body underneath when `loading` is true.

### Acceptance criteria

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx/frontend"

# 1. Stub is gone
! grep -q "TODO: question wizard" components/QuestionWizard.tsx

# 2. Named export matches the existing import in app/diagnose/page.tsx
grep -qE 'export (function|const) QuestionWizard' components/QuestionWizard.tsx

# 3. Imports are exactly the allowed set (no surprises)
grep -q 'from "framer-motion"' components/QuestionWizard.tsx
grep -q 'from "@/components/ui/radio-group"' components/QuestionWizard.tsx
grep -q 'from "@/lib/questions"' components/QuestionWizard.tsx
! grep -qE 'from "(react-hook-form|zustand|jotai|swr|@tanstack)"' components/QuestionWizard.tsx

# 4. AnimatePresence with key={step}
grep -q "AnimatePresence" components/QuestionWizard.tsx
grep -q "key={step}" components/QuestionWizard.tsx

# 5. Loading state text in Spanish
grep -q "Analizando con Gemma 4" components/QuestionWizard.tsx

# 6. Both step labels in Spanish
grep -q "Siguiente" components/QuestionWizard.tsx
grep -q "Diagnosticar" components/QuestionWizard.tsx
grep -q "Atrás" components/QuestionWizard.tsx

# 7. The boolean undefined-vs-false discrimination
grep -q "currentValue === undefined" components/QuestionWizard.tsx

# 8. Build is green
npm run build
```

Commit message: `feat(frontend): real QuestionWizard with framer-motion transitions and 10 questions`.

Mark `D3-T03` in `backlog.yaml` as `completed`.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch `frontend/components/ResultPanel.tsx` | Owned by parallel agent. |
| Touch `frontend/app/demo/page.tsx` | Owned by parallel agent. |
| Touch `frontend/lib/questions.ts` | Read-only. |
| Touch `frontend/app/diagnose/page.tsx` | The contract is fixed there; the senior agent will adjust the parent if needed. |
| Touch ANY `backend/app/*.py` file | Backend is frozen for you. |
| Introduce a state library (Zustand, Jotai, Redux), a form library (react-hook-form), or a new animation library | The wizard needs only `useState` + framer-motion. |
| Add `react-hot-toast`, `sonner`, or any toast/alert library | Error display is the parent's responsibility, not yours. |
| Optimize beyond the spec (memoization, lazy loading, suspense boundaries) | Premature. |
| Edit `AGENT_HANDOFF*.md` files | Senior owns them. |
| Commit under `docs/` or `resources/` | Gitignored. |

---

## 5. Final commit + push

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"
git status
# Expected modified files only:
#   frontend/components/QuestionWizard.tsx
#   backlog.yaml
#
# If ResultPanel.tsx or app/demo/page.tsx shows as modified, STOP — that
# means a race with the parallel agent. Report immediately.

git push origin main
```

---

## 6. When to stop and ask

1. `npm run build` fails with TypeScript errors you can't fix in 2 attempts.
2. `git status` shows files you don't own as modified.
3. You realize the spec contradicts itself or the parent file.
4. You're tempted to introduce a new library or refactor anything outside QuestionWizard.

---

## 7. After it ships

1. One-paragraph summary.
2. `git log --oneline -3`.
3. Confirm `D3-T03` in `backlog.yaml` → completed.
4. Stop.

---

**End of handoff.** Use extended thinking on edge cases and the `useEffect` reset. Use direct execution for the boilerplate.
