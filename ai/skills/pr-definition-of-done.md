# Skill: Pull Request Definition of Done

Use this skill before a change is considered merge-ready.

## Scope

- The PR has one coherent purpose.
- Unrelated refactors and formatting churn are removed.
- New dependencies and abstractions are justified.
- Public claims match implemented behavior.

## Architecture

- Dependency direction remains intact.
- Domain/application code does not depend on transport or infrastructure details.
- Responsibilities are narrow and testable.
- Existing ports and strategies are reused where appropriate.

## Quality

- New behavior has appropriate deterministic coverage.
- Infrastructure behavior has integration coverage where required.
- Failure and boundary paths were considered.
- Lint, tests and build pass.

## RAG-specific checks

- Retrieval or ranking changes have measurable reasoning.
- Context remains bounded.
- Citations trace to supplied evidence.
- Retrieved content remains untrusted.
- Evaluation documentation/fixtures are updated when quality semantics change.

## Security

- No secrets, private notes or local artifacts are committed.
- Input validation remains strict.
- Logs do not expose sensitive payloads unnecessarily.
- Runtime privilege and external-service boundaries were reviewed.

## Documentation

- README reflects user-visible changes when relevant.
- Architecture/decision docs reflect material design changes.
- Production-readiness docs distinguish implemented controls from future controls.

## Final review

Before merge, read the complete diff rather than only individual commits. Confirm that every changed line serves the stated purpose and that the repository remains easier, not harder, to explain in a technical review.