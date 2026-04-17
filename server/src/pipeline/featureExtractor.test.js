import { describe, it, expect } from 'vitest';
import { parseFeatureResponse } from './featureExtractor.js';

/**
 * Helper to wrap a JSON string in a Bedrock Converse API response shape.
 */
function makeResponse(text) {
  return {
    output: { message: { content: [{ text }] } },
  };
}

const VALID_FEATURE_JSON = {
  surfaceArea: { value: 12.5, unit: 'mm2', scaleAvailable: true },
  borderRegularity: 0.8,
  symmetry: 0.65,
  colorUniformity: 0.9,
  boundaryPoints: [
    { x: 0.1, y: 0.2 },
    { x: 0.5, y: 0.8 },
    { x: 0.9, y: 0.3 },
  ],
};

describe('parseFeatureResponse', () => {
  it('parses a valid feature response', () => {
    const response = makeResponse(JSON.stringify(VALID_FEATURE_JSON));
    const result = parseFeatureResponse(response);
    expect(result).toEqual(VALID_FEATURE_JSON);
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const response = makeResponse(`\`\`\`json\n${JSON.stringify(VALID_FEATURE_JSON)}\n\`\`\``);
    const result = parseFeatureResponse(response);
    expect(result).toEqual(VALID_FEATURE_JSON);
  });

  it('accepts surfaceArea with null value and scaleAvailable false', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      surfaceArea: { value: null, unit: 'mm2', scaleAvailable: false },
    };
    const result = parseFeatureResponse(makeResponse(JSON.stringify(json)));
    expect(result.surfaceArea.value).toBeNull();
    expect(result.surfaceArea.scaleAvailable).toBe(false);
  });

  it('accepts scores at boundaries (0 and 1)', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      borderRegularity: 0,
      symmetry: 1,
      colorUniformity: 0,
    };
    const result = parseFeatureResponse(makeResponse(JSON.stringify(json)));
    expect(result.borderRegularity).toBe(0);
    expect(result.symmetry).toBe(1);
    expect(result.colorUniformity).toBe(0);
  });

  it('accepts boundary points at extremes (0 and 1)', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      boundaryPoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    };
    const result = parseFeatureResponse(makeResponse(JSON.stringify(json)));
    expect(result.boundaryPoints).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  });

  // --- Error cases ---

  it('throws on missing text content', () => {
    expect(() => parseFeatureResponse({ output: { message: { content: [] } } }))
      .toThrow('no text content');
  });

  it('throws on null response', () => {
    expect(() => parseFeatureResponse(null)).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseFeatureResponse(makeResponse('not json')))
      .toThrow('does not contain valid JSON');
  });

  it('throws on missing surfaceArea', () => {
    const json = { ...VALID_FEATURE_JSON };
    delete json.surfaceArea;
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Missing or invalid surfaceArea');
  });

  it('throws on negative surfaceArea value', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      surfaceArea: { value: -5, unit: 'mm2', scaleAvailable: true },
    };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid surfaceArea.value');
  });

  it('throws on wrong surfaceArea unit', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      surfaceArea: { value: 10, unit: 'cm2', scaleAvailable: true },
    };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid surfaceArea.unit');
  });

  it('throws on non-boolean scaleAvailable', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      surfaceArea: { value: 10, unit: 'mm2', scaleAvailable: 'yes' },
    };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid surfaceArea.scaleAvailable');
  });

  it('throws on borderRegularity out of range', () => {
    const json = { ...VALID_FEATURE_JSON, borderRegularity: 1.5 };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid borderRegularity');
  });

  it('throws on symmetry out of range', () => {
    const json = { ...VALID_FEATURE_JSON, symmetry: -0.1 };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid symmetry');
  });

  it('throws on colorUniformity as string', () => {
    const json = { ...VALID_FEATURE_JSON, colorUniformity: 'high' };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('Invalid colorUniformity');
  });

  it('throws on empty boundaryPoints array', () => {
    const json = { ...VALID_FEATURE_JSON, boundaryPoints: [] };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('at least one point');
  });

  it('throws on boundaryPoints not an array', () => {
    const json = { ...VALID_FEATURE_JSON, boundaryPoints: 'not-array' };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('must be an array');
  });

  it('throws on boundary point x out of range', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      boundaryPoints: [{ x: 1.5, y: 0.5 }],
    };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('boundaryPoints[0].x');
  });

  it('throws on boundary point y out of range', () => {
    const json = {
      ...VALID_FEATURE_JSON,
      boundaryPoints: [{ x: 0.5, y: -0.1 }],
    };
    expect(() => parseFeatureResponse(makeResponse(JSON.stringify(json))))
      .toThrow('boundaryPoints[0].y');
  });
});
