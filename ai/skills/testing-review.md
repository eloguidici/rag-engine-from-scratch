# Skill: Testing Review

Use this skill when behavior changes, a bug is fixed, an infrastructure adapter changes or a new failure mode is introduced.

## Review goals

- Test observable behavior rather than implementation trivia.
- Keep unit tests deterministic and independent from network services.
- Use integration tests where persistence or infrastructure semantics matter.
- Cover success, boundary and failure paths.
- Prefer fixtures small enough to understand at a glance.
- Avoid mocks that merely reproduce the implementation.
- Make regressions reproducible with a focused test before or alongside the fix.

## Questions to ask

1. What behavior could regress?
2. Is a unit test sufficient, or is a real infrastructure boundary required?
3. Are error paths and invalid inputs covered?
4. Could ordering, duplicate handling or filtering create edge cases?
5. Are tests deterministic across machines and runs?
6. Is external-provider behavior isolated behind a port?
7. Does the test assert a contract that callers actually depend on?
8. If persistence changed, is restart/durability behavior verified?

## Test levels

- **Unit:** domain logic, chunking, scoring, ranking, validation and deterministic metrics.
- **Application:** command/query orchestration with controlled ports.
- **Integration:** PostgreSQL/pgvector behavior, SQL semantics and durable revision state.
- **End-to-end smoke:** representative API flow such as ingest -> query -> citations -> delete.

## Reject or revise when

- a behavior change has no regression coverage without a clear reason;
- a test depends on live external APIs;
- assertions are so broad they would pass for incorrect behavior;
- snapshots replace meaningful domain assertions;
- mocks encode the same algorithm as the production implementation;
- flaky timing is used instead of deterministic synchronization.

## Expected output

State which behavior is protected, the chosen test level, important edge cases and any gap intentionally left for another test layer.