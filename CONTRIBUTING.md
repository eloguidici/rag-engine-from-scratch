# Contributing

This repository favors small, explicit and reviewable changes. The goal is to preserve clarity around the RAG pipeline and its architectural boundaries.

## Development workflow

1. Create a focused branch from `main`.
2. Inspect the relevant architecture and decision docs before changing boundaries.
3. Implement the smallest coherent change.
4. Add or update tests at the appropriate level.
5. Run the local quality gate:

```bash
npm run lint
npm test -- --runInBand
npm run build
```

6. Update documentation when behavior, architecture or production trade-offs change.
7. Review the complete diff for unrelated changes, security issues and accidental complexity.
8. Open a pull request with the problem, solution, trade-offs and validation evidence.

## Architecture expectations

- API code handles transport concerns, not business logic.
- Application code orchestrates use cases and depends on ports.
- Domain contracts stay independent of infrastructure SDKs.
- Infrastructure implements persistence, provider and extraction details.
- CQRS is used where it improves clarity, not as ceremony.
- New abstractions must solve a concrete problem.

## Testing expectations

Prefer deterministic tests. Use real PostgreSQL/pgvector integration tests when SQL or persistence semantics change. External providers should remain behind ports so unit tests do not depend on network access.

## AI-assisted engineering

Repository-specific review skills live under `ai/skills/`. They capture repeatable checks for architecture, RAG quality, testing, security and merge readiness. They are process guidance, not a substitute for human review or CI.

See `AI-ENGINEERING.md` for the complete workflow and definition of done.

## Commit and PR quality

Keep commits understandable and scoped. A pull request should explain why the change exists, what boundary it affects, how it was validated and any known trade-offs. Avoid broad refactors that are unrelated to the stated purpose.