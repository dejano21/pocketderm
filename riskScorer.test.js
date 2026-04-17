import { describe, it, expect } from 'vitest';
import { scoreRisk } from './riskScorer.js';

// Requirements: 6.1, 6.2, 6.3

describe('scoreRisk', () => {
  // score = round(rawScore * 100)
  // rawScore = conf*0.4 + (1-border)*0.2 + (1-sym)*0.2 + (1-color)*0.2

  it('returns level "low" and score 39 (below low threshold of 40)', () => {
    // rawScore = 0 + (1-0.05)*0.2 + (1-0)*0.2 + (1-1)*0.2 = 0.19 + 0.2 = 0.39
    const result = scoreRisk(0, { borderRegularity: 0.05, symmetryScore: 0, colorUniformity: 1 });
    expect(result.score).toBe(39);
    expect(result.level).toBe('low');
  });

  it('returns level "moderate" and score 40 (at low threshold)', () => {
    // rawScore = 0 + (1-0)*0.2 + (1-0)*0.2 + (1-1)*0.2 = 0.2 + 0.2 = 0.40
    const result = scoreRisk(0, { borderRegularity: 0, symmetryScore: 0, colorUniformity: 1 });
    expect(result.score).toBe(40);
    expect(result.level).toBe('moderate');
  });

  it('returns level "moderate" and score 69 (below moderate threshold of 70)', () => {
    // rawScore = 0.5*0.4 + (1-0.05)*0.2 + (1-0)*0.2 + (1-0.5)*0.2 = 0.2 + 0.19 + 0.2 + 0.1 = 0.69
    const result = scoreRisk(0.5, { borderRegularity: 0.05, symmetryScore: 0, colorUniformity: 0.5 });
    expect(result.score).toBe(69);
    expect(result.level).toBe('moderate');
  });

  it('returns level "high" and score 70 (at moderate threshold)', () => {
    // rawScore = 0.5*0.4 + (1-0)*0.2 + (1-0)*0.2 + (1-0.5)*0.2 = 0.2 + 0.2 + 0.2 + 0.1 = 0.70
    const result = scoreRisk(0.5, { borderRegularity: 0, symmetryScore: 0, colorUniformity: 0.5 });
    expect(result.score).toBe(70);
    expect(result.level).toBe('high');
  });

  it('returns level "high" and score 100 (maximum inputs)', () => {
    // rawScore = 1*0.4 + (1-0)*0.2 + (1-0)*0.2 + (1-0)*0.2 = 1.0
    const result = scoreRisk(1, { borderRegularity: 0, symmetryScore: 0, colorUniformity: 0 });
    expect(result.score).toBe(100);
    expect(result.level).toBe('high');
  });

  it('returns score 0 for minimum risk inputs', () => {
    // rawScore = 0*0.4 + (1-1)*0.2 + (1-1)*0.2 + (1-1)*0.2 = 0
    const result = scoreRisk(0, { borderRegularity: 1, symmetryScore: 1, colorUniformity: 1 });
    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
  });

  it('level is consistent with score and config thresholds', () => {
    const cases = [
      { confidence: 0, features: { borderRegularity: 1, symmetryScore: 1, colorUniformity: 1 } },
      { confidence: 0.5, features: { borderRegularity: 0.5, symmetryScore: 0.5, colorUniformity: 0.5 } },
      { confidence: 1, features: { borderRegularity: 0, symmetryScore: 0, colorUniformity: 0 } },
    ];

    for (const { confidence, features } of cases) {
      const { level, score } = scoreRisk(confidence, features);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      if (score < 40) expect(level).toBe('low');
      else if (score < 70) expect(level).toBe('moderate');
      else expect(level).toBe('high');
    }
  });

  it('score is always in [0, 100]', () => {
    const extremes = [
      { confidence: 0, features: { borderRegularity: 0, symmetryScore: 0, colorUniformity: 0 } },
      { confidence: 1, features: { borderRegularity: 1, symmetryScore: 1, colorUniformity: 1 } },
      { confidence: 0.5, features: { borderRegularity: 0.5, symmetryScore: 0.5, colorUniformity: 0.5 } },
    ];

    for (const { confidence, features } of extremes) {
      const { score } = scoreRisk(confidence, features);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
