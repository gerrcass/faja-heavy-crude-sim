# Coding standards

Judgement calls for review. Mechanical rules belong in the linter, the type checker and the tests, not here.

## TypeScript

- `strict` is on. Avoid `any`; if an external shape truly requires it, isolate it at the boundary and narrow immediately.
- Model code is pure: no DOM, no globals, no time. UI code owns events and rendering.
- Prefer named types for domain values (`FieldInput`, `FieldOutput`, `StationId`) over loose strings and object bags.
- Keep the model's constants next to the model, with a comment or a test that ties each range to the research brief.

## DOM and CSS

- Semantic HTML first: `button`, `label`, `section`, `figure`, `figcaption`, `table`. A click handler on a `div` is a bug.
- Use the design tokens in `src/styles/tokens.css`; no raw hex values in component CSS.
- Both themes are first-class. Test a new component in light and dark before calling it done.
- Animation must have a `prefers-reduced-motion` path. Never rely on animation to convey state.
- The page must not scroll horizontally at 390 px.

## The figure

- Geometry comes from the Anatomy kit. Do not invent a parallel isometric renderer.
- Depth order is physical, not tuned by eye. If a pipe passes through a fitting, gap it at the fitting.
- Every line ends on a stroke, a dot or an outline, or is explicitly marked `data-free` with a reason.
- The active station is the only amber `lit` element in the drawing.

## Copy

- One idea per paragraph. Concrete nouns and verbs. No "unlock", "delve", "revolutionary", "game-changing".
- A number without a source or an "illustrative" label is a defect.
- Define a term on first use; link to the glossary after that.

## Review

The reviewer checks the two axes separately: **Standards** (this file, the ADRs, the glossary) and **Spec** (the issue body). Do not merge the axes into one score. Report the worst finding in each axis separately.
