# Skill: Security Review

Use this skill when a change touches uploads, external-provider calls, configuration, persistence, retrieved content or public API behavior.

## Review goals

- Keep secrets outside the repository and logs.
- Validate all external input at the transport boundary.
- Treat uploaded files and retrieved documents as untrusted.
- Keep prompt-injection defenses explicit at the generation boundary.
- Bound payload, context and resource sizes.
- Translate provider/infrastructure errors without leaking sensitive internals.
- Avoid logging document bodies, credentials, tokens or provider payloads by default.
- Use least privilege for runtime processes and infrastructure where practical.

## Questions to ask

1. What untrusted input enters through this change?
2. Is validation structural, semantic or both?
3. Could a malicious document influence system instructions?
4. Can a large payload cause memory, CPU or token-cost exhaustion?
5. Are secrets or connection strings exposed in code, docs or logs?
6. Could error messages reveal internals?
7. Does persistence require tenant or authorization controls in a real deployment?
8. Does the runtime need the privileges it currently has?
9. Are temporary files or uploaded bytes cleaned up safely?
10. Does the change introduce a dependency with unnecessary attack surface?

## Repository-specific boundaries

- PDF uploads are validated by size, MIME/type expectations and file signature where applicable.
- Unknown DTO fields are rejected.
- Retrieved content is data, never trusted instructions.
- Generation context is bounded.
- External-provider failures are translated before crossing application boundaries.
- Authentication, authorization and tenant isolation are documented production concerns and must not be implied as implemented when they are not.

## Reject or revise when

- secrets are hard-coded;
- logs contain raw sensitive input unnecessarily;
- uploaded content bypasses validation;
- retrieved text can override system behavior;
- resource usage is unbounded;
- production security claims exceed what the repository actually implements.

## Expected output

List trust boundaries, abuse cases considered, controls present, residual risks and any production-only control that remains out of scope.