import { describe, it, expect } from 'vitest';
import { estimateRisk } from './riskEstimator.js';

const DEFAULT_CONFIG = {
  weights: {
    classificationConfidence: 0.4,
    borderRegularity: 0.2,
    symmetry: 0.2,
    colorUniformity: 0.2,
  },
  thresholds: { low: 30, moderate: 60 },
  categoryRiskBoost: {
    'Melanoma-suspicious': 25,
    'Atypical nevus': 10,
  },
};

describe('estimateRisk', () => {
  it('returns low risk for perfect scores with benign category', () => {
    const classification = { category: 'Common nevus', confidence: 1 };
    const metrics = { borderRegularity: 1, symmetry: 1, colorUniformity: 1 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  it('returns high risk for worst scores with no boost', () => {
    const classification = { category: 'Common nevus', confidence: 0 };
    const metrics = { borderRegularity: 0, symmetry: 0, colorUniformity: 0 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    // rawScore = 1*0.4*100 + 1*0.2*100 + 1*0.2*100 + 1*0.2*100 = 40+20+20+20 = 100
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('high');
  });

  it('adds categoryRiskBoost for Melanoma-suspicious', () => {
    const classification = { category: 'Melanoma-suspicious', confidence: 0.9 };
    const metrics = { borderRegularity: 0.8, symmetry: 0.8, colorUniformity: 0.8 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    // rawScore = 0.1*0.4*100 + 0.2*0.2*100 + 0.2*0.2*100 + 0.2*0.2*100 = 4+4+4+4 = 16
    // finalScore = clamp(16 + 25, 0, 100) = 41
    expect(result.riskScore).toBe(41);
    expect(result.riskLevel).toBe('moderate');
  });

  it('adds categoryRiskBoost for Atypical nevus', () => {
    const classification = { category: 'Atypical nevus', confidence: 0.9 };
    const metrics = { borderRegularity: 0.8, symmetry: 0.8, colorUniformity: 0.8 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    // rawScore = 16, boost = 10, finalScore = 26
    expect(result.riskScore).toBe(26);
    expect(result.riskLevel).toBe('low');
  });

  it('clamps score to 100 when boost pushes it over', () => {
    const classification = { category: 'Melanoma-suspicious', confidence: 0 };
    const metrics = { borderRegularity: 0, symmetry: 0, colorUniformity: 0 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    // rawScore = 100, boost = 25, clamped to 100
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('high');
  });

  it('returns 0 boost for categories not in categoryRiskBoost', () => {
    const classification = { category: 'Seborrheic keratosis', confidence: 0.9 };
    const metrics = { borderRegularity: 0.8, symmetry: 0.8, colorUniformity: 0.8 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    // rawScore = 16, boost = 0, finalScore = 16
    expect(result.riskScore).toBe(16);
    expect(result.riskLevel).toBe('low');
  });

  it('returns riskScore as an integer', () => {
    const classification = { category: 'Common nevus', confidence: 0.75 };
    const metrics = { borderRegularity: 0.6, symmetry: 0.7, colorUniformity: 0.65 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    expect(Number.isInteger(result.riskScore)).toBe(true);
  });

  it('correctly assigns moderate risk level at threshold boundary', () => {
    // We need riskScore to be exactly 30 (the low threshold)
    // rawScore = 30 → need (1-c)*40 + (1-b)*20 + (1-s)*20 + (1-cu)*20 = 30
    // e.g. confidence=0.5 → 20, border=0.5 → 10, symmetry=1 → 0, color=1 → 0 → total=30
    const classification = { category: 'Common nevus', confidence: 0.5 };
    const metrics = { borderRegularity: 0.5, symmetry: 1, colorUniformity: 1 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    expect(result.riskScore).toBe(30);
    expect(result.riskLevel).toBe('moderate');
  });

  it('correctly assigns high risk level at moderate threshold boundary', () => {
    // riskScore = 60 → need rawScore = 60
    // (1-c)*40 + (1-b)*20 + (1-s)*20 + (1-cu)*20 = 60
    // confidence=0 → 40, border=0 → 20, symmetry=1 → 0, color=1 → 0 → 60
    const classification = { category: 'Common nevus', confidence: 0 };
    const metrics = { borderRegularity: 0, symmetry: 1, colorUniformity: 1 };

    const result = estimateRisk(classification, metrics, DEFAULT_CONFIG);

    expect(result.riskScore).toBe(60);
    expect(result.riskLevel).toBe('high');
  });
});
