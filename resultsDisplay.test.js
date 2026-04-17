/**
 * Unit tests for resultsDisplay.js
 * Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock explanationGenerator so DISCLAIMER is available without Bedrock ────
vi.mock('./explanationGenerator.js', () => ({
  DISCLAIMER:
    'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.',
  generateExplanation: vi.fn(),
}));

import { renderResults, showLoading, hideLoading, showError } from './resultsDisplay.js';

// ─── Minimal mock PipelineResult ─────────────────────────────────────────────
const DISCLAIMER_TEXT =
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

function makePipelineResult(overrides = {}) {
  return {
    classificationResult: { category: 'common nevus', confidence: 0.87 },
    featureMetrics: {
      borderRegularity: 0.91,
      symmetryScore: 0.88,
      colorUniformity: 0.93,
      boundaryPoints: [
        { x: 0.5, y: 0.3 },
        { x: 0.7, y: 0.5 },
        { x: 0.5, y: 0.7 },
        { x: 0.3, y: 0.5 },
      ],
      estimatedAreaMm2: 4.2,
    },
    explanationText: `This lesion shows benign characteristics. Asymmetry is minimal. Border is regular. Color is uniform. Diameter is within normal range. Evolution appears stable. ${DISCLAIMER_TEXT}`,
    riskResult: { level: 'low', score: 22 },
    disclaimer: DISCLAIMER_TEXT,
    s3Key: 'user-1/test.jpg',
    ...overrides,
  };
}

// ─── DOM setup ────────────────────────────────────────────────────────────────
beforeEach(() => {
  document.body.innerHTML = `
    <div id="results-panel" class="results-panel hidden"></div>
  `;
  // Stub resetScan on window (referenced in rendered HTML)
  window.resetScan = vi.fn();
});

// ─── renderResults ────────────────────────────────────────────────────────────
describe('renderResults', () => {
  it('renders the Classification section with category and confidence', () => {
    renderResults(makePipelineResult());
    const category = document.getElementById('rd-category');
    const confidence = document.getElementById('rd-confidence');
    expect(category).not.toBeNull();
    expect(category.textContent).toBe('common nevus');
    expect(confidence).not.toBeNull();
    expect(confidence.textContent).toBe('87%');
  });

  it('renders the Metrics section with all five metrics', () => {
    renderResults(makePipelineResult());
    expect(document.getElementById('rd-border-regularity')).not.toBeNull();
    expect(document.getElementById('rd-symmetry')).not.toBeNull();
    expect(document.getElementById('rd-color-uniformity')).not.toBeNull();
    expect(document.getElementById('rd-area')).not.toBeNull();
    expect(document.getElementById('rd-boundary-canvas')).not.toBeNull();
  });

  it('shows "Unavailable" for area when estimatedAreaMm2 is null', () => {
    const result = makePipelineResult({
      featureMetrics: {
        borderRegularity: 0.8,
        symmetryScore: 0.75,
        colorUniformity: 0.9,
        boundaryPoints: [],
        estimatedAreaMm2: null,
      },
    });
    renderResults(result);
    expect(document.getElementById('rd-area').textContent).toBe('Unavailable');
  });

  it('renders the Medical Explanation section with explanation text', () => {
    renderResults(makePipelineResult());
    const explanation = document.getElementById('rd-explanation');
    expect(explanation).not.toBeNull();
    expect(explanation.textContent).toContain('benign characteristics');
  });

  it('renders the Overall Risk section with risk level and numeric score', () => {
    renderResults(makePipelineResult());
    const riskLevel = document.getElementById('rd-risk-level');
    const riskScore = document.getElementById('rd-risk-score');
    expect(riskLevel).not.toBeNull();
    expect(riskLevel.textContent).toContain('LOW');
    expect(riskScore).not.toBeNull();
    expect(riskScore.textContent).toBe('22');
  });

  it('renders all four section cards', () => {
    renderResults(makePipelineResult());
    expect(document.getElementById('rd-classification-card')).not.toBeNull();
    expect(document.getElementById('rd-metrics-card')).not.toBeNull();
    expect(document.getElementById('rd-explanation-card')).not.toBeNull();
    expect(document.getElementById('rd-risk-card')).not.toBeNull();
  });

  it('renders the Disclaimer as a persistently visible element', () => {
    renderResults(makePipelineResult());
    const disclaimer = document.getElementById('rd-disclaimer');
    expect(disclaimer).not.toBeNull();
    expect(disclaimer.textContent).toContain(DISCLAIMER_TEXT);
    // Should not be hidden
    expect(disclaimer.classList.contains('hidden')).toBe(false);
  });

  it('Disclaimer text is exactly the required text', () => {
    renderResults(makePipelineResult());
    const disclaimerText = document.getElementById('rd-disclaimer-text');
    expect(disclaimerText.textContent).toBe(DISCLAIMER_TEXT);
  });

  it('Disclaimer is visible for high-risk results too', () => {
    const result = makePipelineResult({
      riskResult: { level: 'high', score: 82 },
    });
    renderResults(result);
    const disclaimer = document.getElementById('rd-disclaimer');
    expect(disclaimer).not.toBeNull();
    expect(disclaimer.textContent).toContain(DISCLAIMER_TEXT);
  });

  it('uses pipelineResult.disclaimer when provided', () => {
    const customDisclaimer = DISCLAIMER_TEXT;
    renderResults(makePipelineResult({ disclaimer: customDisclaimer }));
    expect(document.getElementById('rd-disclaimer-text').textContent).toBe(customDisclaimer);
  });

  it('renders boundary canvas element in metrics section', () => {
    renderResults(makePipelineResult());
    const canvas = document.getElementById('rd-boundary-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas.tagName.toLowerCase()).toBe('canvas');
  });
});

// ─── showLoading / hideLoading ────────────────────────────────────────────────
describe('showLoading', () => {
  it('hides the results panel', () => {
    document.getElementById('results-panel').classList.remove('hidden');
    showLoading();
    expect(document.getElementById('results-panel').classList.contains('hidden')).toBe(true);
  });

  it('clears partial results from the panel', () => {
    const panel = document.getElementById('results-panel');
    panel.innerHTML = '<div>partial result</div>';
    showLoading();
    expect(panel.innerHTML).toBe('');
  });

  it('shows a loading indicator element', () => {
    showLoading();
    const loading = document.getElementById('rd-loading');
    expect(loading).not.toBeNull();
    expect(loading.classList.contains('hidden')).toBe(false);
  });
});

describe('hideLoading', () => {
  it('hides the loading indicator', () => {
    showLoading();
    hideLoading();
    const loading = document.getElementById('rd-loading');
    expect(loading).not.toBeNull();
    expect(loading.classList.contains('hidden')).toBe(true);
  });

  it('makes the results panel visible again', () => {
    showLoading();
    hideLoading();
    const panel = document.getElementById('results-panel');
    expect(panel.classList.contains('hidden')).toBe(false);
  });
});

// ─── showError ────────────────────────────────────────────────────────────────
describe('showError', () => {
  it('renders the error message in the results panel', () => {
    showError('Analysis failed during classification. Please try again.');
    const errorMsg = document.getElementById('rd-error-message');
    expect(errorMsg).not.toBeNull();
    expect(errorMsg.textContent).toBe('Analysis failed during classification. Please try again.');
  });

  it('shows the error card element', () => {
    showError('Something went wrong.');
    const errorCard = document.getElementById('rd-error');
    expect(errorCard).not.toBeNull();
  });

  it('makes the results panel visible', () => {
    document.getElementById('results-panel').classList.add('hidden');
    showError('Error occurred.');
    const panel = document.getElementById('results-panel');
    expect(panel.classList.contains('hidden')).toBe(false);
  });

  it('hides the loading indicator when showing error', () => {
    showLoading();
    showError('Pipeline error.');
    const loading = document.getElementById('rd-loading');
    if (loading) {
      expect(loading.classList.contains('hidden')).toBe(true);
    }
  });
});
