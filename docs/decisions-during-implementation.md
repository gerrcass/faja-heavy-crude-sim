# Decisions during implementation

Working notes for the parent reviewer. The tickets and spec are still the contract; these are the non-obvious calls made while building them.

## Delivery shape

- **One implementation session, not five sub-agent worktrees.** The task was delegated as a single implementation session on `feat/faja-field-guide`. The ticket graph was therefore implemented serially, in the order shell → figure → narrative → model → integration. The integration branch contains all five tickets and one draft PR closes the spec and the tickets.
- **No merge and no deploy from this session.** The parent session owns review, squash-merge, branch deletion and the Pages verification. The deploy workflow is checked in and Pages is already enabled with `build_type=workflow`.

## Stack and paths

- Vite 7, TypeScript 5.9, Vitest 3. No UI framework.
- `base` is `/faja-heavy-crude-sim/` for the project page. QA and capture start a local `vite preview` at that base; they do not depend on `file://`.
- Fonts are self-hosted from `@fontsource/fraunces`, `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`; only Latin subsets are imported.
- The Anatomy kit is vendored in `src/iso/` (`iso-kit.ts`, `iso-kit.mjs`, `lathe.mjs`, `tube.mjs`, `iso.css`). The verification scripts are vendored in `tools/anatomy/`. `NOTICE.md` records the MIT source.
- `tools/anatomy/inline-kit.mjs` was repointed from the skill's `../kit` to the project's `../../src/iso` so the vendored copy is self-contained.

## The figure

- The final scene is a **quarry-bench cutaway**: the lower reservoir block is whole, the upper strata are cut back to a long face, and the pay bench carries two horizontal wells. An earlier full-block-with-notch version read as a building on the page; the bench version was kept because it reads as geology at 1× and at 390 px.
- The scene targets 80–150 `iso-solid` parts and currently lands at about 145. Ladders, railings, grate slots and the flow traces are deliberately **tube or line geometry**, not solids, so the small-scale detail does not push the part count over the brief and so every rail has a real end cap.
- The active station is the only amber element. The default state is deliberately **neutral**; no station is selected on load, so the first view shows the whole machine at full contrast. Selecting a station then dims the other five and lights the chosen one.
- `lines.mjs` reports **0 floating line ends** on the built figure. The only free line ends are the three printed-text rules on the base label plate, which are explicitly `data-free` by design.
- The flow traces are illustrative overlays along the steam and oil routes. They are not measured flow; the caption says so. They animate only while the figure is in view and stop under `prefers-reduced-motion`.

## Model

- The model is `src/model/field.ts`. It clamps inputs to the published ranges, is deterministic, and keeps every output finite.
- Cold mode forces steam to zero. The pump capacity limits the oil rate; water make is reported separately so the steam and diluent levers stay legible. This is stated in the assumptions.
- The blend viscosity curve uses a log mixing rule. The **350 cSt** line is a teaching reference, not a custody specification; the UI says this beside the chart and in the assumptions.
- The 45% USGS thermal recovery assumption is named as an assessment assumption, not a field average.
- Model tests use known literals from the brief and cover: cold vs CSS carbon, steam → rate/SOR, quality → SOR, diluent → viscosity/API, pump cap, off-spec blend, punitive SOR, a grid of bounds, input clamping, determinism, preset ordering and the viscosity curve.

## Content

- The 1936 date is sourced to Oil & Gas Journal's *All about Orinoco* and the USGS/SPE sources cover the ranges. No current production figure is quoted.
- The history strip is deliberately non-political: 1936, 1990s associations, 2007 majority control, 2010s decline, 2020s capacity — dates and structural facts only.
- The "works offline after the first visit" user story is **not implemented as a service worker**. It was not in the ticket acceptance criteria, and the static page is cacheable by normal browser caching. This is the one spec user story left as a follow-up rather than claimed.

## QA and screenshots

- `npm run qa` builds, starts `vite preview`, drives headless Chromium at 1440 and 390, and runs `tools/anatomy/lines.mjs` against the built page while the server is up. It checks title, six station buttons, SVG label, simulator changes, constraint banner, presets, station selection, theme toggle, glossary, sources, chart and horizontal scroll.
- `npm run capture` builds and writes `assets/faja-field-guide.png` (README) plus desktop/mobile light/dark and desk/figure stills under `shots/` (git-ignored). Captures hide the skip link, neutralize the sticky masthead and force reveal sections visible so a still is not caught mid-transition.
- The QA browser is the locally installed Chromium via CDP (the Anatomy scripts' own approach), not Puppeteer. This keeps the dependency tree small and the QA path close to the figure kit's verification tools.

## Known follow-ups for the parent

- Review the figure at 4× around the compressor/upgrader junctions if the visual bar requires another pass; the current line check is zero but it is not an Anatomy geometry audit (`A.recorder`/`A.settle`/`A.audit`).
- Merge, delete the branch, verify the Pages URL, and close #1–#6. This session did not run the deployment.
- If the project wants a true offline field manual, add a small service worker with a precache manifest; it was intentionally left out of this pass.
