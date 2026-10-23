# Domain docs

This is a single-context repo.

## Before exploring, read

- `GLOSSARY.md` at the repo root for the project's domain vocabulary.
- `docs/adr/` for decisions that constrain the work, especially the visual language, model honesty and static-site decisions.
- `docs/research/orinoco-brief.md` for the factual spine and the claims to avoid.

If a file is missing, proceed silently; do not create replacement docs speculatively.

## Rules

- Use the glossary's terms in issue titles, code names, test names and user-facing copy.
- If a new domain term is needed, add it to `GLOSSARY.md` in the same change.
- If a change contradicts an ADR, say so explicitly in the PR and propose a superseding ADR rather than silently overriding it.
