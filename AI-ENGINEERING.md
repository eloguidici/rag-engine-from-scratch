# AI-Assisted Engineering Workflow

This repository uses AI-assisted engineering as a structured development practice rather than as an unchecked code-generation step.

The repository-specific skills under `ai/skills/` define repeatable review procedures for architecture, RAG quality, testing, security and pull-request completion. They are intentionally tool-agnostic so the engineering process is portable across assistants and development environments.

## Principles

1. **Human ownership** — architectural decisions, scope, trade-offs and final acceptance remain human responsibilities.
2. **Repository context first** — suggestions must respect the existing architecture, contracts, tests and documented decisions before proposing changes.
3. **Small, reviewable changes** — prefer narrow commits with explicit intent over broad automated rewrites.
4. **Evidence over confidence** — claims about behavior should be supported by code, tests, logs, metrics or documentation.
5. **No hidden architecture** — new abstractions, dependencies or infrastructure must solve a concrete problem and be documented when they materially affect the design.
6. **Quality gates are mandatory** — assisted changes are not complete until lint, tests and build pass.
7. **Security boundaries remain explicit** — retrieved content, uploaded files, external-provider output and configuration are treated as untrusted inputs where appropriate.
8. **Documentation changes with behavior** — architecture, decisions and production-readiness docs are updated when the corresponding behavior changes.

## Workflow

A normal change follows this sequence:

1. Understand the requested outcome and affected boundaries.
2. Inspect the relevant code, tests and architecture decisions.
3. Select the repository skill(s) that apply.
4. Propose the smallest coherent implementation.
5. Implement with existing patterns unless a documented reason justifies a new one.
6. Add or update tests at the appropriate level.
7. Run lint, tests and build.
8. Review the diff for security, architecture and accidental scope expansion.
9. Update documentation when behavior or trade-offs changed.
10. Merge only after the definition of done is satisfied.

## Definition of done

A change is considered complete when all applicable items are true:

- behavior matches the requested outcome;
- responsibilities remain clear and dependency direction is preserved;
- new behavior is covered by deterministic tests where practical;
- integration behavior is tested when infrastructure boundaries change;
- lint, tests and build pass;
- no secrets, local files or internal working notes are committed;
- security implications were reviewed;
- public documentation reflects material architectural or operational changes;
- the final diff contains no unrelated refactors;
- generated suggestions have been reviewed and accepted as engineering decisions rather than copied blindly.

## Skill catalog

- `ai/skills/architecture-review.md` — dependency direction, boundaries, SOLID and unnecessary abstraction.
- `ai/skills/rag-quality-review.md` — ingestion, retrieval, ranking, grounding, citations and evaluation.
- `ai/skills/testing-review.md` — deterministic unit/integration coverage and failure-path review.
- `ai/skills/security-review.md` — uploads, prompt injection, secrets, validation and external-provider boundaries.
- `ai/skills/pr-definition-of-done.md` — final diff and merge-readiness checklist.

The skills are process assets: they capture how this codebase should be reasoned about and reviewed, independent of any particular AI product.