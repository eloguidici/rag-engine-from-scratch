# AI Engineering Skills

This directory contains repository-specific engineering skills used to make AI-assisted development repeatable, reviewable and independent from any particular assistant or editor.

The skills are intentionally short, operational checklists rather than generic prompts. They encode how this repository should be reasoned about.

## Available skills

- `architecture-review.md` — review boundaries, dependency direction, SOLID and abstraction cost.
- `rag-quality-review.md` — review ingestion, retrieval, ranking, grounding, citations and evaluation.
- `testing-review.md` — select the correct test level and protect deterministic behavior.
- `security-review.md` — review trust boundaries, uploads, prompt injection, secrets and resource limits.
- `pr-definition-of-done.md` — final merge-readiness review across scope, architecture, quality, security and documentation.

## How they are used

A change can use one or more skills depending on the affected boundary. For example, a pgvector persistence change would typically use architecture review, testing review and the final definition of done. A reranking change would normally use RAG quality review, testing review and the final definition of done.

See `../AI-ENGINEERING.md` for the overall workflow and human-review principles.