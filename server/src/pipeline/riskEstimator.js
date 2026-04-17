/**
 * Clamps a value to the range [min, max].
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Estimates the overall risk for a skin lesion based on classification
 * confidence and extracted feature metrics, using configurable weights.
 *
 * Pure function — no Bedrock call.
 *
 * @param {{ category: string, confidence: number }} classification
 * @param {{ borderRegularity: number, symmetry: number, colorUniformity: number }} metrics
 * @param {{ weights: object, thresholds: object, categoryRiskBoost: object }} config
 * @returns {{ riskLevel: "low" | "moderate" | "high", riskScore: number }}
 */
export function estimateRisk(classification, metrics, config) {
  const { weights, thresholds, categoryRiskBoost } = config;

  const rawScore =
    (1 - classification.confidence) * weights.classificationConfidence * 100 +
    (1 - metrics.borderRegularity) * weights.borderRegularity * 100 +
    (1 - metrics.symmetry) * weights.symmetry * 100 +
    (1 - metrics.colorUniformity) * weights.colorUniformity * 100;

  const boost = categoryRiskBoost[classification.category] ?? 0;
  const riskScore = Math.round(clamp(rawScore + boost, 0, 100));

  let riskLevel;
  if (riskScore < thresholds.low) {
    riskLevel = 'low';
  } else if (riskScore < thresholds.moderate) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'high';
  }

  return { riskLevel, riskScore };
}
