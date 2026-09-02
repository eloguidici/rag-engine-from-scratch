import {
  evaluateCitationQuality,
  refusalCorrect,
} from './generation-quality-metrics';

describe('generation quality metrics', () => {
  it('detects valid and unsupported citations', () => {
    expect(evaluateCitationQuality('Supported by [S1] and [S3].', 2)).toEqual({
      citedSources: 2,
      validCitations: 1,
      citationPrecision: 0.5,
      citationCoverage: 0.5,
      unsupportedCitationCount: 1,
    });
  });

  it('treats explicit insufficient-context answers as correct refusals', () => {
    expect(
      refusalCorrect('The supplied context does not contain enough evidence.', true),
    ).toBe(true);
    expect(refusalCorrect('The answer is 42 [S1].', false)).toBe(true);
  });
});
