export interface CitationQualitySummary {
  citedSources: number;
  validCitations: number;
  citationPrecision: number;
  citationCoverage: number;
  unsupportedCitationCount: number;
}

/** Evaluates whether [S1], [S2] style answer citations point to supplied context blocks. */
export function evaluateCitationQuality(
  answer: string,
  availableSourceCount: number,
): CitationQualitySummary {
  const cited = [...answer.matchAll(/\[S(\d+)\]/gi)].map((match) => Number(match[1]));
  const unique = [...new Set(cited)];
  const valid = unique.filter((source) => source >= 1 && source <= availableSourceCount);
  const unsupportedCitationCount = unique.length - valid.length;

  return {
    citedSources: unique.length,
    validCitations: valid.length,
    citationPrecision: unique.length === 0 ? 1 : valid.length / unique.length,
    citationCoverage:
      availableSourceCount === 0 ? 1 : valid.length / availableSourceCount,
    unsupportedCitationCount,
  };
}

/** Deterministic proxy for measuring expected insufficient-context refusals. */
export function refusalCorrect(
  answer: string,
  expectedInsufficientContext: boolean,
): boolean {
  const normalized = answer.toLowerCase();
  const refused = [
    'insufficient evidence',
    'insufficient context',
    'not enough evidence',
    'context does not contain',
    'cannot answer from the supplied context',
  ].some((phrase) => normalized.includes(phrase));

  return expectedInsufficientContext ? refused : !refused;
}
