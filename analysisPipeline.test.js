/**
 * Unit tests for analysisPipeline.js
 * Requirements: 7.1, 7.2, 7.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepError, PipelineError } from './errors.js';
import { DISCLAIMER } from './explanationGenerator.js';

// Mock all dependencies before importing the module under test
vi.mock('./s3Store.js', () => ({
  uploadImage: vi.fn(),
}));

vi.mock('./classificationStep.js', () => ({
  classifyLesion: vi.fn(),
}));

vi.mock('./featureExtractor.js', () => ({
  extractFeatures: vi.fn(),
}));

vi.mock('./explanationGenerator.js', () => ({
  generateExplanation: vi.fn(),
  DISCLAIMER: 'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.',
}));

vi.mock('./riskScorer.js', () => ({
  scoreRisk: vi.fn(),
}));

vi.mock('./requestLogger.js', () => ({
  logFailure: vi.fn(),
  logSuccess: vi.fn(),
}));

import { runPipeline } from './analysisPipeline.js';
import { uploadImage } from './s3Store.js';
import { classifyLesion } from './classificationStep.js';
import { extractFeatures } from './featureExtractor.js';
import { generateExplanation } from './explanationGenerator.js';
import { scoreRisk } from './riskScorer.js';
import { logFailure } from './requestLogger.js';

// Helper: create a minimal mock File
function makeFile(name = 'test.jpg', type = 'image/jpeg', content = 'abc') {
  // Provide arrayBuffer so fileToBase64 works
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  return file;
}

const mockClassification = { category: 'common nevus', confidence: 0.85 };
const mockFeatures = {
  borderRegularity: 0.9,
  symmetryScore: 0.8,
  colorUniformity: 0.7,
  boundaryPoints: [{ x: 0.1, y: 0.2 }],
  estimatedAreaMm2: null,
};
const mockExplanation = 'This lesion shows good Asymmetry, Border, Color, Diameter, Evolution characteristics. ' +
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';
const mockRisk = { level: 'low', score: 25 };
const mockS3Key = 'user123/1234567890-test.jpg';

beforeEach(() => {
  vi.clearAllMocks();
  uploadImage.mockResolvedValue(mockS3Key);
  classifyLesion.mockResolvedValue(mockClassification);
  extractFeatures.mockResolvedValue(mockFeatures);
  generateExplanation.mockResolvedValue(mockExplanation);
  scoreRisk.mockReturnValue(mockRisk);
});

describe('runPipeline — success', () => {
  it('returns a complete PipelineResult with all required fields', async () => {
    const file = makeFile();
    const result = await runPipeline(file, 'user123');

    expect(result).toMatchObject({
      classificationResult: mockClassification,
      featureMetrics: mockFeatures,
      explanationText: mockExplanation,
      riskResult: mockRisk,
      disclaimer: DISCLAIMER,
      s3Key: mockS3Key,
    });
  });

  it('calls all steps in the correct order', async () => {
    const callOrder = [];
    uploadImage.mockImplementation(async () => { callOrder.push('s3'); return mockS3Key; });
    classifyLesion.mockImplementation(async () => { callOrder.push('classify'); return mockClassification; });
    extractFeatures.mockImplementation(async () => { callOrder.push('extract'); return mockFeatures; });
    generateExplanation.mockImplementation(async () => { callOrder.push('explain'); return mockExplanation; });
    scoreRisk.mockImplementation(() => { callOrder.push('score'); return mockRisk; });

    await runPipeline(makeFile(), 'user123');

    expect(callOrder).toEqual(['s3', 'classify', 'extract', 'explain', 'score']);
  });
});

describe('runPipeline — S3 failure', () => {
  it('throws PipelineError and does NOT call classifyLesion', async () => {
    uploadImage.mockRejectedValue(new Error('S3 connection refused'));

    await expect(runPipeline(makeFile(), 'user123')).rejects.toThrow(PipelineError);
    expect(classifyLesion).not.toHaveBeenCalled();
    expect(extractFeatures).not.toHaveBeenCalled();
    expect(generateExplanation).not.toHaveBeenCalled();
    expect(scoreRisk).not.toHaveBeenCalled();
  });

  it('sets PipelineError.step to "classification" for S3 failure', async () => {
    uploadImage.mockRejectedValue(new Error('S3 error'));

    let caught;
    try {
      await runPipeline(makeFile(), 'user123');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PipelineError);
    expect(caught.step).toBe('classification');
  });

  it('logs the failure via requestLogger', async () => {
    uploadImage.mockRejectedValue(new Error('S3 error'));

    await expect(runPipeline(makeFile(), 'user123')).rejects.toThrow(PipelineError);
    expect(logFailure).toHaveBeenCalledOnce();
  });
});

describe('runPipeline — classifyLesion failure', () => {
  it('throws PipelineError with step "classification"', async () => {
    classifyLesion.mockRejectedValue(
      new StepError('Classification failed', { step: 'classification', retryable: false })
    );

    let caught;
    try {
      await runPipeline(makeFile(), 'user123');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PipelineError);
    expect(caught.step).toBe('classification');
  });

  it('does NOT call extractFeatures after classification failure', async () => {
    classifyLesion.mockRejectedValue(
      new StepError('Classification failed', { step: 'classification', retryable: false })
    );

    await expect(runPipeline(makeFile(), 'user123')).rejects.toThrow(PipelineError);
    expect(extractFeatures).not.toHaveBeenCalled();
  });
});

describe('runPipeline — extractFeatures failure', () => {
  it('throws PipelineError with step "featureExtraction"', async () => {
    extractFeatures.mockRejectedValue(
      new StepError('Feature extraction failed', { step: 'featureExtraction', retryable: false })
    );

    let caught;
    try {
      await runPipeline(makeFile(), 'user123');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PipelineError);
    expect(caught.step).toBe('featureExtraction');
  });

  it('does NOT call generateExplanation after feature extraction failure', async () => {
    extractFeatures.mockRejectedValue(
      new StepError('Feature extraction failed', { step: 'featureExtraction', retryable: false })
    );

    await expect(runPipeline(makeFile(), 'user123')).rejects.toThrow(PipelineError);
    expect(generateExplanation).not.toHaveBeenCalled();
  });
});

describe('runPipeline — generateExplanation failure', () => {
  it('throws PipelineError with step "explanation"', async () => {
    generateExplanation.mockRejectedValue(
      new StepError('Explanation failed', { step: 'explanation', retryable: false })
    );

    let caught;
    try {
      await runPipeline(makeFile(), 'user123');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PipelineError);
    expect(caught.step).toBe('explanation');
  });

  it('does NOT call scoreRisk after explanation failure', async () => {
    generateExplanation.mockRejectedValue(
      new StepError('Explanation failed', { step: 'explanation', retryable: false })
    );

    await expect(runPipeline(makeFile(), 'user123')).rejects.toThrow(PipelineError);
    expect(scoreRisk).not.toHaveBeenCalled();
  });
});

describe('runPipeline — scoreRisk failure', () => {
  it('throws PipelineError with step "riskScoring"', async () => {
    scoreRisk.mockImplementation(() => {
      throw new StepError('Risk scoring failed', { step: 'riskScoring', retryable: false });
    });

    let caught;
    try {
      await runPipeline(makeFile(), 'user123');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PipelineError);
    expect(caught.step).toBe('riskScoring');
  });
});
