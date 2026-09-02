# Skill: RAG Quality Review

Use this skill when a change affects ingestion, chunking, embeddings, retrieval, fusion, reranking, context construction, generation or citations.

## Review goals

- Keep ingestion and retrieval stages explicit and independently testable.
- Preserve stable document identity, versioning and duplicate detection semantics.
- Validate embedding cardinality and fail fast on malformed provider responses.
- Keep lexical and semantic retrieval behavior measurable rather than opaque.
- Treat metadata filters as part of retrieval semantics, not as post-processing decoration.
- Keep candidate-pool size, thresholds and context limits bounded and configurable.
- Remove duplicate or near-duplicate evidence before generation.
- Treat retrieved content as untrusted data.
- Ensure citations correspond to the exact chunks supplied to generation.
- Separate retrieval evaluation from generation evaluation.

## Questions to ask

1. What retrieval failure mode does this change address?
2. Does it alter recall, ranking precision or context quality?
3. Can the behavior be evaluated deterministically?
4. Are scores comparable and normalized where required?
5. Could metadata filtering accidentally remove relevant evidence?
6. Does reranking preserve source diversity?
7. Can prompt-injection content alter system behavior?
8. Are citations traceable back to persisted chunks?
9. Does the change increase token/context cost without a measurable benefit?
10. Should evaluation fixtures or metrics be updated?

## Evaluation expectations

For retrieval changes, prefer deterministic fixtures and metrics such as Recall@K, MRR and nDCG@K. For generation changes, evaluate groundedness, answer relevance, citation correctness and unsupported claims separately.

## Reject or revise when

- retrieval quality is claimed without a measurable basis;
- generation receives unbounded context;
- source attribution is reconstructed after generation rather than tied to supplied evidence;
- a new ranking heuristic is introduced without tests or rationale;
- retrieved text is treated as trusted instructions;
- a framework hides behavior that this repository intentionally keeps explicit.

## Expected output

Describe the affected RAG stage, quality hypothesis, deterministic evidence, regression risks and any production trade-offs.