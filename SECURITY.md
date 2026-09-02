# Security

## Security posture

This repository demonstrates a production-minded RAG backend, but it is not a complete multi-tenant production platform. Implemented controls and deliberate production gaps are documented separately so the project does not overstate its security posture.

## Implemented controls

- strict DTO validation with unknown-field rejection;
- upload size and type validation;
- PDF signature validation where applicable;
- bounded generation context;
- retrieved content treated as untrusted data;
- provider errors translated before crossing application boundaries;
- configuration validated before startup;
- request correlation without logging full document bodies by default;
- external-provider timeouts and retry limits;
- non-root application runtime in the container image.

## Secrets

Never commit API keys, credentials, private connection strings or local `.env` files. Use `.env.example` only for variable names and safe example values.

If a secret is committed accidentally, removing it from the latest commit is not sufficient. Revoke/rotate the credential immediately and then remove it from repository history as required.

## Prompt injection and retrieved content

Documents and retrieved chunks are untrusted input. Retrieved text must not be allowed to override system instructions or change application policy. Generation should be grounded only in the bounded evidence supplied by the application.

## File ingestion

Uploaded content should be treated as hostile input. Validation should cover size, expected type/signature and extraction failures. Resource limits should prevent a single upload from consuming unbounded memory, CPU or context budget.

## Production controls intentionally out of scope

A real multi-tenant deployment would additionally require controls such as authentication, authorization, tenant isolation, rate limiting, secret management, PII/compliance policies, security monitoring and deployment-specific network/database hardening.

See `docs/PRODUCTION-READINESS.md` for the broader production boundary.

## Reporting a vulnerability

Please avoid publishing exploit details in a public issue before the problem can be reviewed. Use a private repository security-reporting channel when available, or contact the repository owner directly through an appropriate private channel.