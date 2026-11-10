# AGENTS.md

## Purpose

This repository is both a real product codebase and a source of material for technical writing.

When helping in this project, prioritize two outcomes:

1. Make correct, concrete engineering changes when asked.
2. Extract high-value, evidence-based material for blog posts, architecture writeups, and engineering notes.

## Source Of Truth

Always prefer the real implementation in this repository over generic advice.

Before answering questions, drafting articles, or proposing architectural summaries, inspect the relevant project files first.

Prioritize these sources:

- `README.md`
- `ARCHITECTURE.md`
- `TECH_STACK.md`
- `DEPLOYMENT_GUIDE.md`
- `docs/`
- `backend/app/`
- `backend/tests/`
- `frontend/src/`
- `scripts/`

If the repository already contains an implementation, summarize that implementation instead of inventing a different one.
If a recommendation is generic and not yet implemented here, state that explicitly.

## Writing And Blog Content

This project is a primary reference for writing technical blog content.

When the user asks for:

- blog posts
- article outlines
- topic selection
- architecture explanations
- engineering practice summaries
- SEO-friendly technical content

use this repository as the default example base.

Favor topics that are both implemented here and worth discussing publicly, such as:

- FastAPI and Next.js mixed architecture
- SSR and CSR data flow
- OpenAPI-driven frontend SDK generation
- MDX rendering pipeline
- GitOps-based content synchronization
- admin system design
- media management and thumbnail generation
- backend module boundaries
- async testing strategy
- deployment, observability, and error handling

## Writing Style

When producing blog-ready content:

- Prefer engineering articles over tutorial-classroom tone.
- Lead with conclusions, then implementation details, then tradeoffs.
- Explain why a design exists, what problem it solves, and what it costs.
- Use real module names, real directories, and real workflows from this repository whenever possible.
- Avoid exaggerated claims like "best", "perfect", or "ultimate" unless clearly justified.
- Avoid long metaphor-heavy introductions.
- Prefer practical, publishable prose.

When possible, structure articles as:

1. Conclusion
2. Problem
3. Real implementation in this repo
4. Tradeoffs and boundaries
5. Practical checklist

## Engineering Expectations

When editing code:

- Preserve the current architecture style unless the user asks for a refactor.
- Prefer existing patterns in `backend/app/*` and `frontend/src/*` over introducing new conventions.
- Keep backend and frontend contracts aligned.
- If API shapes change, check whether generated OpenAPI artifacts or frontend SDK usage should also change.
- Prefer small, reviewable changes.

When explaining architecture:

- Reference concrete files and flows.
- Distinguish clearly between current implementation and suggested improvements.
- Do not describe imagined systems as if they already exist.

## Testing And Verification

When making code changes, verify with the most relevant local checks when feasible.

Backend priorities:

- `uv run pytest`
- targeted tests under `backend/tests/`

Frontend priorities:

- `pnpm test`
- `pnpm type-check`
- `pnpm lint`

If you do not run verification, say so clearly.
If verification is partial, state what was and was not checked.

## Safety And Confidentiality

Never expose secrets from:

- `.env`
- `.env.local`
- `.env.test`
- `.env.prod.local`
- `.env.production.template`

Do not print real tokens, passwords, connection strings, webhook secrets, or private keys.
When discussing configuration publicly, redact sensitive values.

## Content Boundaries

Do not bulk-copy repository documents into responses.
Prefer concise summaries, rewritten explanations, and selective examples.

If the user wants publishable content, optimize for:

- clarity
- technical credibility
- grounded examples from this repo
- realistic tradeoffs

## Preferred Default Behavior

If the user is vague, default to this workflow:

1. Inspect the relevant implementation.
2. Summarize what actually exists.
3. Identify what is technically interesting or worth publishing.
4. Produce a concrete result: edit, outline, article draft, review, or recommendation.
