import { readFileSync } from 'node:fs';

const DEFAULT_WEIGHTS = {
  classificationConfidence: 0.4,
  borderRegularity: 0.2,
  symmetry: 0.2,
  colorUniformity: 0.2,
};

const DEFAULT_THRESHOLDS = {
  low: 30,
  moderate: 60,
};

const DEFAULT_CONFIG = {
  weights: { ...DEFAULT_WEIGHTS },
  thresholds: { ...DEFAULT_THRESHOLDS },
  categoryRiskBoost: {},
};

/**
 * Validates that a config object has all required fields with correct types.
 *
 * @param {object} config - Parsed config object
 * @returns {boolean}
 */
function isValidConfig(config) {
  if (!config || typeof config !== 'object') return false;

  const { weights, thresholds } = config;

  if (!weights || typeof weights !== 'object') return false;
  if (typeof weights.classificationConfidence !== 'number') return false;
  if (typeof weights.borderRegularity !== 'number') return false;
  if (typeof weights.symmetry !== 'number') return false;
  if (typeof weights.colorUniformity !== 'number') return false;

  if (!thresholds || typeof thresholds !== 'object') return false;
  if (typeof thresholds.low !== 'number') return false;
  if (typeof thresholds.moderate !== 'number') return false;

  return true;
}

/**
 * Loads and validates the risk configuration from a JSON file.
 * Falls back to hardcoded defaults if the file is missing, invalid JSON,
 * or missing required fields.
 *
 * @param {string} configPath - Path to risk-config.json
 * @returns {{ weights: object, thresholds: object, categoryRiskBoost: object }}
 */
export function loadRiskConfig(configPath) {
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!isValidConfig(parsed)) {
      console.warn(`[RiskConfig] Config at "${configPath}" is missing required fields. Using defaults.`);
      return { ...DEFAULT_CONFIG, categoryRiskBoost: {} };
    }

    return {
      weights: parsed.weights,
      thresholds: parsed.thresholds,
      categoryRiskBoost: parsed.categoryRiskBoost ?? {},
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[RiskConfig] Config file not found at "${configPath}". Using defaults.`);
    } else if (err instanceof SyntaxError) {
      console.warn(`[RiskConfig] Invalid JSON in "${configPath}". Using defaults.`);
    } else {
      console.warn(`[RiskConfig] Error reading "${configPath}": ${err.message}. Using defaults.`);
    }
    return { ...DEFAULT_CONFIG, categoryRiskBoost: {} };
  }
}
