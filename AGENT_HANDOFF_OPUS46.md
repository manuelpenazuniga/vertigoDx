# Agent handoff — Opus 4.6 thinking (Day 4 prep, round 2)

**Target agent:** Claude Opus 4.6 with extended thinking enabled.
**Author:** Claude Opus 4.7 (senior reviewer).
**Date:** 2026-05-16 (round 2 of your assignments).
**Previous round shipped:** commit `9d1e408` — real `QuestionWizard.tsx`. Reviewed and merged. The `internalStep` defensive design was a great call.

This document is the contract. Use extended thinking for the layout and typography decisions; use direct execution for boilerplate.

You are running in **parallel** with another agent (Sonnet 4.6, in `AGENT_HANDOFF_SONNET.md`). That agent is refactoring frontend types and helpers. Your work and theirs are file-disjoint.

---

## 0. Read these files first

1. `CLAUDE.md`
2. `backlog.yaml` — task D4-T08 (cover image) is your target. Also read `runtime_decisions` block.
3. `README.md` — the cover image should feel consistent with the README's branding and badges.
4. `frontend/app/icon.svg` — the existing "Vx" favicon. Your cover image should be visually consistent with it (same color palette, same wordmark style).
5. This file.

Do **not** read anything under `docs/` or `resources/`.

---

## 1. Hard rules

| # | Rule |
|---|---|
| R1 | The cover image must be 1280×720 pixels exactly. Kaggle's submission requires this. |
| R2 | All visible text on the cover is in English (it's the marketing surface for an English-speaking judge panel). The product itself uses Spanish UI; the cover is the global pitch. |
| R3 | Push directly to `main` with Conventional Commits. |
| R4 | Never commit anything under `docs/` or `resources/` — gitignored. |
| R5 | Do not introduce new fonts. Use only `system-ui` or fonts available in Apple Silicon macOS (which is where the PNG will be rendered): `ui-sans-serif`, `-apple-system`, `SF Pro Display`, `Helvetica`. |
| R6 | Do not introduce dependencies — `librsvg` is already available via brew. |
| R7 | Do not touch ANY frontend or backend source file. Your output is only in `public/` and (optionally) one Markdown note. |
| R8 | Other parallel agent owns `frontend/lib/types.ts`, `frontend/lib/api.ts`, `frontend/components/ResultPanel.tsx`, `frontend/app/demo/page.tsx`, `frontend/app/diagnose/page.tsx` — do not touch any of those. |

---

## 2. What is already done

- Backend complete, frontend complete (landing, /diagnose, /demo, ResultPanel, QuestionWizard all working).
- Frontend already has an SVG favicon at `frontend/app/icon.svg`: a 64×64 square with `Vx` in white on a `#1e3a8a` (dark blue) rounded background. Your cover should use the same palette.

You are not modifying any of this. You are producing **one new asset** in `frontend/public/cover.svg` (and a PNG export — see Task B).

---

## 3. Your assignment — D4-T08: cover image (SVG + PNG export)

The cover image is required for Kaggle submission. It is what the judges see in the writeup gallery before clicking through to anything else.

### Goal

Produce a 1280×720 cover image with this content, laid out and styled to look like a top-tier OSS project's hero card:

- **Wordmark:** `VertigoDx` — centered, large, bold, white.
- **Subtitle:** `Privacy-First Vestibular Diagnosis AI for Underserved Latin American Clinics` — centered below the wordmark, smaller, white with slight opacity (≈ 0.85).
- **Three chips/badges** below the subtitle, side-by-side, each with a colored background and label:
  - Chip 1: `Gemma 4` (blue/teal accent, e.g. `#3b82f6` background, white text)
  - Chip 2: `Ollama` (dark gray accent, e.g. `#0a0a0a` or `#262626` background, white text)
  - Chip 3: `100% Offline` (green accent, e.g. `#10b981` background, white text)
- **Footer attribution:** `Built for the Gemma 4 Good Hackathon · May 2026` — bottom-center, small, white at ≈ 0.6 opacity.

### Visual style

- Background: a diagonal gradient from `#1e3a8a` (top-left, deep blue, matching the favicon) to `#312e81` (bottom-right, indigo). This matches the README acknowledgments section colors.
- Typography stack (only): `ui-sans-serif, -apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif`. The cover is rendered to PNG on the dev machine; these are guaranteed to resolve.
- Wordmark `font-weight: 800` (extra-bold). Subtitle `font-weight: 500`. Chips `font-weight: 600`.
- Chip pill geometry: ≈ 200px wide × 56px tall, `rx="28"` (fully rounded), 24px horizontal gap between chips.
- Negative space at top/bottom/sides should feel generous (not crammed). The hackathon judges scroll past hundreds of covers — yours should feel calm and confident, not loud.

### Use extended thinking on

- Exact y-coordinates for wordmark, subtitle, chip row, and footer — they must visually balance the 1280×720 canvas. A common pitfall is a centered text block that sits too low because the visual center is above the geometric center. Plan it on paper before coding.
- Font sizes that won't get cut off or look pixelated at 1280×720. Wordmark probably ≈ 96-120px; subtitle ≈ 28-32px; chip text ≈ 20-22px; footer ≈ 16-18px. Verify after rendering.
- Whether to include a subtle 🧠 brain emoji or a small SVG icon next to the wordmark. **Recommendation: no emoji** — the favicon doesn't have one, and emoji rendering across platforms is unreliable. Stay pure typography.

### Task A — Write the SVG file

Create `frontend/public/cover.svg` with the design above. The SVG must:

- Use the SVG namespace and `viewBox="0 0 1280 720"`.
- Be a single, self-contained file (no external references, no embedded raster images).
- Render correctly when opened in a browser AND when converted by `rsvg-convert`.

### Task B — Render to PNG

After the SVG is in place, render the PNG with `librsvg`:

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# Install if missing — should already be there on the dev Mac
which rsvg-convert || brew install librsvg

# Render 1280x720 PNG
rsvg-convert -w 1280 -h 720 frontend/public/cover.svg -o frontend/public/cover.png

# Verify exact dimensions
file frontend/public/cover.png
# Expected output ends with: PNG image data, 1280 x 720, ...
```

If `rsvg-convert` is unavailable and `brew install librsvg` fails for any reason, **stop and report**. Do not try alternative tooling.

### Task C — Visual sanity check

Open the PNG in Preview or any image viewer (you can't see it as an agent, but the human will):

- All text is readable.
- Chips look like pills, not stretched rectangles.
- Gradient is smooth, not banded.
- No text is cut off at the edges.

Print the dimensions and file size in your final summary so the human knows what to expect.

### Acceptance criteria

```bash
cd "/Volumes/MacMiniExt/dev/OpenSource Projects/vertigoDx/vertigoDx"

# 1. SVG exists at the expected path
test -f frontend/public/cover.svg

# 2. SVG is at least 1 KB and at most 50 KB (a 100 KB cover SVG indicates accidentally embedded raster data)
test "$(wc -c < frontend/public/cover.svg)" -gt 1000
test "$(wc -c < frontend/public/cover.svg)" -lt 50000

# 3. SVG references the correct viewBox and dimensions
grep -q 'viewBox="0 0 1280 720"' frontend/public/cover.svg

# 4. SVG uses the expected palette (substring match)
grep -q "#1e3a8a" frontend/public/cover.svg

# 5. SVG contains the three chip labels and the wordmark
grep -q ">VertigoDx<" frontend/public/cover.svg
grep -q ">Gemma 4<" frontend/public/cover.svg
grep -q ">Ollama<" frontend/public/cover.svg
grep -q ">100% Offline<" frontend/public/cover.svg

# 6. PNG was rendered at the right size
test -f frontend/public/cover.png
file frontend/public/cover.png | grep -q "1280 x 720"
```

Commit message: `feat(brand): cover image SVG + PNG export (1280x720) for Kaggle submission`.

Mark `D4-T08` in `backlog.yaml` as `completed`.

---

## 4. What you must NOT do

| Forbidden | Why |
|---|---|
| Touch ANY file under `frontend/components/`, `frontend/app/` (except adding `public/cover.*`), `frontend/lib/` | Other agent owns the refactor. |
| Touch ANY `backend/app/*.py` file | Backend is frozen. |
| Touch `frontend/app/icon.svg` | The favicon is final. |
| Modify `README.md` | The senior agent will embed the cover image when the video link is also ready. |
| Introduce new fonts via `@import` in the SVG | Brittle in `rsvg-convert`; stick to system fonts. |
| Embed PNG/JPG raster data in the SVG | Defeats the point of SVG and bloats the file. |
| Add Tailwind, react, or any code framework reference | This is a static asset, not a component. |
| Use emojis in the cover text | Cross-platform rendering is unreliable. |
| Mark D4-T08 as completed without producing both `cover.svg` AND `cover.png` | Both are required. |

---

## 5. When to stop and ask

1. Acceptance-criteria checks fail.
2. `rsvg-convert` isn't available and `brew install librsvg` fails.
3. The PNG dimensions are wrong even after re-rendering.
4. You're tempted to add an icon, emoji, or photographic element.

---

## 6. After it ships

1. One-paragraph summary including the final file sizes of `cover.svg` and `cover.png`.
2. `git log --oneline -3`.
3. Confirm `D4-T08` in `backlog.yaml` → completed.
4. Stop.

---

**End of handoff.** Plan the layout on paper first. Then write the SVG. Then render.
