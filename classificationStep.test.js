/**
 * Unit tests for classificationStep.js
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyLesion } from './classificationStep.js';
import { StepError } from './errors.js';

vi.mock('./bedrockClient.js', () => ({
  invokeModel: vi.fn(),
}));

import { invokeModel } from './bedrockClient.js';

/** Helper to build a mock Bedrock response with the given text */
function mockResponse(text) {
  return { content: [{ text }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('classifyLesion — valid categories', () => {
  const validCases = [
    { category: 'common nevus', confidence: 0.92 },
    { category: 'atypical nevus', confidence: 0.75 },
    { category: 'seborrheic keratosis', confidence: 0.60 },
    { category: 'melanoma-suspicious', confidence: 0.85 },
    { category: 'other', confidence: 0.50 },
  ];

  for (const { category, confidence } of validCases) {
    it(`returns { category: "${category}", confidence: ${confidence} }`, async () => {
      invokeModel.mockResolvedValueOnce(
        mockResponse(JSON.stringify({ category, confidence }))
      );

      const result = await classifyLesion('base64data', 'image/jpeg');

      expect(result).toEqual({ category, confidence });
    });
  }

  it('accepts confidence of exactly 0.0', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'other', confidence: 0.0 }))
    );
    const result = await classifyLesion('base64data', 'image/png');
    expect(result.confidence).toBe(0.0);
  });

  it('accepts confidence of exactly 1.0', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'common nevus', confidence: 1.0 }))
    );
    const result = await classifyLesion('base64data', 'image/jpeg');
    expect(result.confidence).toBe(1.0);
  });
});

describe('classifyLesion — invalid category', () => {
  it('throws StepError when category is not in the allowed set', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'basal cell carcinoma', confidence: 0.80 }))
    );

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('sets step to "classification" and retryable to false on invalid category', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'unknown', confidence: 0.5 }))
    );

    let err;
    try {
      await classifyLesion('base64data', 'image/jpeg');
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(StepError);
    expect(err.step).toBe('classification');
    expect(err.retryable).toBe(false);
  });
});

describe('classifyLesion — invalid confidence', () => {
  it('throws StepError when confidence is above 1.0', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'common nevus', confidence: 1.1 }))
    );

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when confidence is below 0.0', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'common nevus', confidence: -0.1 }))
    );

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when confidence is a string', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'common nevus', confidence: '0.85' }))
    );

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('sets step to "classification" and retryable to false on invalid confidence', async () => {
    invokeModel.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ category: 'other', confidence: 2.5 }))
    );

    let err;
    try {
      await classifyLesion('base64data', 'image/jpeg');
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(StepError);
    expect(err.step).toBe('classification');
    expect(err.retryable).toBe(false);
  });
});

describe('classifyLesion — malformed model responses', () => {
  it('throws StepError when model returns non-JSON text', async () => {
    invokeModel.mockResolvedValueOnce(mockResponse('Sorry, I cannot analyze this image.'));

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when model response has no content', async () => {
    invokeModel.mockResolvedValueOnce({ content: [] });

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when invokeModel itself throws', async () => {
    invokeModel.mockRejectedValueOnce(new Error('Bedrock unavailable'));

    await expect(classifyLesion('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });
});
