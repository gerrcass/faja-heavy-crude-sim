# Faja 8°

A static interactive field guide to extra-heavy crude production in the Orinoco Belt. The page is one long editorial document with one Anatomy-style isometric cutaway and one illustrative systems model. It has no backend.

## Read first

- `GLOSSARY.md` — the project's domain terms. Use them in code, tests, copy and issue titles.
- `docs/adr/` — four decisions that constrain the work: product form, model honesty, static stack, visual language.
- `docs/research/orinoco-brief.md` — the factual spine, ranges, sources and claims to avoid. Every public number comes from here or is labelled illustrative.
- The spec: `gh issue view 1`. The tickets: `gh issue view 2` through `6`.

## Commands

```sh
npm ci
npm run dev       # local page
npm run check     # typecheck + unit tests + production build
npm run qa        # headless browser checks on dist/
npm run capture   # desktop/mobile/light/dark screenshots
npm run icons     # regenerate favicon PNGs and the OG image
```

## Where things live

```text
index.html          semantic content and section anchors
src/styles/         tokens, layout, components
src/figure/         scene geometry, station metadata, interaction
src/model/          pure field model + presets
src/iso/            vendored Anatomy kit (MIT; see NOTICE.md)
src/ui/             simulator, theme, reveal, navigation
public/             favicon, icons, OG image
tests/              model contract tests
tools/anatomy/      capture.mjs, drive.mjs, lines.mjs for visual QA
```

## The figure

Build the object with the Anatomy kit, not with hand-placed boxes: `slabOf`, `cylinder`, `lathe`, `tubePieces`, `solidSvg`. Read the kit's `references/craft.md`, `references/kit.md` and `references/verify.md` in the installed skill (`~/.config/opencode/skills/anatomy`) before designing. Keep words out of the drawing; the plate card and station buttons carry meaning. The active station gets the amber `lit` tone; everything else stays in the paper/ink hierarchy.

## Copy and numbers

- Source every quoted fact; link it in the sources section.
- Generated numbers are **illustrative** and must say so next to the control desk.
- Prefer ranges over point estimates when the source is a range.
- Keep the tone concrete and declarative. No hype, no policy commentary, no "revolutionary".
- Follow the "claims to avoid" list in the brief.

## Seams

- `simulate()` is the model seam. Test its public input/output behaviour with known literals; do not test private helpers or snapshot internal shapes.
- The station buttons are the figure's accessible seam. The SVG is presentational.
- `npm run qa` is the page seam: real built page, real browser, console errors and horizontal scroll are failures.

## Delivery

Work on a feature branch. Commit early and at the end of every ticket; an uncommitted worktree is not a deliverable. A delegated session owns its branch until it reports, and the parent reviews after that report rather than editing alongside it. The PR body uses the `/pr` template and closes the spec and every ticket. Squash-merge to `main`, delete the branch, verify the Pages deployment, and leave no open issues or PRs. The README must carry the live link and a screenshot captured from the built page. Read the latest note in `docs/retro/` before starting a new run.

## Agent skills

### Issue tracker

GitHub Issues in `gerrcass/faja-heavy-crude-sim`; specs and tickets are issues, with native sub-issue and blocked-by links. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Done means

`npm run check` passes, `npm run qa` passes, the screenshots have been read, the live Pages URL loads, the README shows the screenshot and link, and the issue/PR queue is empty.
