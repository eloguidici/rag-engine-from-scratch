# Skill: Architecture Review

Use this skill when a change affects module boundaries, application flow, persistence, providers, shared abstractions or cross-cutting concerns.

## Review goals

- Preserve dependency direction: API -> application -> domain, with infrastructure implementing ports.
- Keep responsibilities narrow and explicit.
- Prefer existing contracts before introducing new abstractions.
- Apply CQRS only when command/query separation improves clarity.
- Keep SDK-specific types and exceptions out of the domain/application boundary.
- Avoid service classes that combine orchestration, persistence, transport and provider logic.
- Prefer composition over inheritance unless polymorphism is materially simpler.
- Keep configuration and infrastructure details outside use-case logic.
- Confirm new dependencies solve a concrete problem and do not duplicate existing capability.

## Questions to ask

1. What boundary is changing and why?
2. Can the change be implemented through an existing port or strategy?
3. Does any infrastructure concern leak inward?
4. Is a new abstraction justified by more than one concrete need?
5. Are failure modes represented explicitly?
6. Is the implementation testable without external infrastructure when appropriate?
7. Does the change create hidden coupling between ingestion, retrieval or generation?
8. Does the documentation need an architectural-decision update?

## Reject or revise when

- a controller contains business logic;
- domain/application code imports infrastructure SDK types;
- a pattern is added only to make the repository look more sophisticated;
- a generic abstraction obscures a small concrete behavior;
- the change requires unrelated rewrites to fit;
- a new dependency has no documented trade-off.

## Expected output

Summarize the affected boundary, the chosen design, alternatives rejected, test impact and any documentation that must change.