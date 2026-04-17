import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadRiskConfig } from './riskConfigLoader.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const EXPECTED_DEFAULTS = {
  weights: {
    classificationConfidence: 0.4,
    borderRegularity: 0.2,
    symmetry: 0.2,
    colorUniformity: 0.2,
  },
  thresholds: { low: 30, moderate: 60 },
  categoryRiskBoost: {},
};

describe('loadRiskConfig', () => {
  const tmpDir = join(tmpdir(), 'risk-config-test-' + Date.now());
  const validPath = join(tmpDir, 'valid.json');
  const invalidJsonPath = join(tmpDir, 'invalid.json');
  const missingFieldsPath = join(tmpDir, 'missing-fields.json');
  const missingPath = join(tmpDir, 'nonexistent.json');

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  it('loads a valid config file', () => {
    const config = {
      weights: {
        classificationConfidence: 0.5,
        borderRegularity: 0.15,
        symmetry: 0.15,
        colorUniformity: 0.2,
      },
      thresholds: { low: 25, moderate: 55 },
      categoryRiskBoost: { 'Melanoma-suspicious': 30 },
    };
    writeFileSync(validPath, JSON.stringify(config));

    const result = loadRiskConfig(validPath);

    expect(result.weights).toEqual(config.weights);
    expect(result.thresholds).toEqual(config.thresholds);
    expect(result.categoryRiskBoost).toEqual(config.categoryRiskBoost);
  });

  it('returns defaults when file is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = loadRiskConfig(missingPath);

    expect(result).toEqual(EXPECTED_DEFAULTS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    warnSpy.mockRestore();
  });

  it('returns defaults when file contains invalid JSON', () => {
    writeFileSync(invalidJsonPath, 'not valid json {{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = loadRiskConfig(invalidJsonPath);

    expect(result).toEqual(EXPECTED_DEFAULTS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
    warnSpy.mockRestore();
  });

  it('returns defaults when required fields are missing', () => {
    writeFileSync(missingFieldsPath, JSON.stringify({ weights: {} }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = loadRiskConfig(missingFieldsPath);

    expect(result).toEqual(EXPECTED_DEFAULTS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing required fields'));
    warnSpy.mockRestore();
  });

  it('defaults categoryRiskBoost to empty object when not provided', () => {
    const config = {
      weights: {
        classificationConfidence: 0.4,
        borderRegularity: 0.2,
        symmetry: 0.2,
        colorUniformity: 0.2,
      },
      thresholds: { low: 30, moderate: 60 },
    };
    writeFileSync(validPath, JSON.stringify(config));

    const result = loadRiskConfig(validPath);

    expect(result.categoryRiskBoost).toEqual({});
  });
});
