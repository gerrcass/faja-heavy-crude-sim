# Design grill — autonomous session

The user asked for a `/grill-with-docs` session and explicitly delegated the decisions: "I'm going to fully trust your judgment here, don't wait for me." Each question below was therefore answered with the recommended option, and the resulting decisions were written into `GLOSSARY.md` and `docs/adr/`.

## Round 1 — What is this thing?

**Q1. Primary outcome — reference or mental model?**
Should the site be a lookup reference (facts, maps, numbers) or a system you can reason about after reading it?
➡️ **A working mental model.** The test is whether a systems engineer can explain why the barrel is hard to move, what each subsystem does, and where the bottlenecks are.

**Q2. Scope — one stage or the whole chain?**
Should we go deep on steam EOR, or cover reservoir → lift → blend → upgrade end to end?
➡️ **The whole chain, one representative path.** Depth comes from the interactions between stages, not from a specialist treatment of one.

**Q3. Current events — how much Venezuela policy?**
Should the site explain sanctions, PDVSA governance and current production politics?
➡️ **No.** Treat the resource and the engineering as the subject; mention history and current output only as context. This keeps the artifact durable and avoids false authority on fast-moving politics.

**Q4. Form — article, deck, dashboard or interactive site?**
➡️ **An interactive field guide.** A long-form page with a Hero isometric cutaway and one control desk, not a slide deck or a BI dashboard.

**Q5. Language and units?**
➡️ **English, with bbl, cP, °API, tonnes and SI where useful.** Define every unit on first use.

## Round 2 — The experience

**Q6. One page or many?**
➡️ **One page with anchored sections.** The figure stays the shared map; the reader can scroll a single causal chain.

**Q7. How many Anatomy figures?**
➡️ **One Hero cutaway.** A second figure would compete for attention and double the geometry risk. Supporting ideas use native charts and diagrams, not more isometric scenes.

**Q8. Simulator fidelity?**
Should it be a real reservoir simulator, a calibrated field model, or an explanatory model?
➡️ **An explanatory model with published ranges.** It must be monotone, bounded and transparent, and must say it is illustrative. Trust comes from visible assumptions, not from a black box.

**Q9. Which interactions earn their place?**
➡️ **Station selection on the figure, a steam on/off flow, the control desk with presets, theme toggle, and reduced-motion support.** No 3D orbit, no scroll-jacking, no autoplaying video.

**Q10. Accessibility and mobile?**
➡️ **WCAG AA, keyboard-operable controls, visible focus, reduced motion, and a 390 px layout that still reads.** The figure must not become an unlabeled image; the station buttons carry the interaction.

## Round 3 — Engineering and delivery

**Q11. Stack?**
React/Next, a static-site generator, or Vite + TypeScript?
➡️ **Vite + TypeScript, static output.** One document, a handful of interactive regions, no routing. Vendor the Anatomy kit so the figure is reproducible.

**Q12. Content standard?**
➡️ **Every public fact is sourced or explicitly illustrative.** Use ranges, not false precision. Keep a "claims to avoid" list in the research brief.

**Q13. Deployment?**
➡️ **GitHub Pages via Actions, project path `/faja-heavy-crude-sim/`.** No custom domain, no server. The README links to the live page.

**Q14. Testing seams?**
➡️ **Three seams:** the pure `simulate()` contract, the built page's DOM/accessibility contract, and a visual/screenshot check. Unit tests cover the model; a build check and browser capture cover the page.

**Q15. Issue tracking and domain docs?**
➡️ **GitHub Issues for spec and tickets; `GLOSSARY.md` and `docs/adr/` in-repo.** Local markdown tickets would hide the task graph from the fresh implementation session.

**Q16. Delivery shape?**
➡️ **One integration branch, one PR closing the spec and all tickets, squash merge to `main`, delete the branch, leave no open issues or PRs.** The Pages deploy runs from `main` after merge.

## Resulting decisions

- [ADR-0001: A single interactive field guide](../adr/0001-a-single-interactive-field-guide.md)
- [ADR-0002: Model honesty over false precision](../adr/0002-model-honesty-over-false-precision.md)
- [ADR-0003: Static Vite site with the Anatomy kit](../adr/0003-static-vite-site-with-the-anatomy-kit.md)
- [ADR-0004: Technical editorial visual language](../adr/0004-technical-editorial-visual-language.md)

The dominant terms are recorded in [`GLOSSARY.md`](../../GLOSSARY.md). The factual spine is in [`docs/research/orinoco-brief.md`](../research/orinoco-brief.md).
