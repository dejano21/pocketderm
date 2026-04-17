import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('./risk-config.json');

const { weights, thresholds } = config;

/**
 * @param {number} confidence - classification confidence [0, 1]
 * @param {{ borderRegularity: number, symmetryScore: number, colorUniformity: number }} features
 * @returns {{ level: 'low'|'moderate'|'high', score: number }}
 */
export function scoreRisk(confidence, features) {
  const { borderRegularity, symmetryScore, colorUniformity } = features;

  const rawScore =
    confidence * weights.classificationConfidence +
    (1 - borderRegularity) * weights.borderRegularity +
    (1 - symmetryScore) * weights.symmetryScore +
    (1 - colorUniformity) * weights.colorUniformity;

  const score = Math.round(rawScore * 100);

  let level;
  if (score < thresholds.low) {
    level = 'low';
  } else if (score < thresholds.moderate) {
    level = 'moderate';
  } else {
    level = 'high';
  }

  return { level, score };
}
