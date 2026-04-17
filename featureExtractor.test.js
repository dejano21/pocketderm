/**
 * Unit tests for featureExtractor.js
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFeatures,
  runClassicalCV,
  computeBorderRegularity,
  computeSymmetryScore,
  normalizeBoundaryPoints,
  detectScaleAndComputeArea,
  toGrayscale,
  segmentLesion,
  extractContour,
  convexHull,
  perimeter,
} from './featureExtractor.js';
import { StepError } from './errors.js';

// ─── Mock bedrockClient ───────────────────────────────────────────────────────

vi.mock('./bedrockClient.js', () => ({
  invokeModel: vi.fn(),
}));

import { invokeModel } from './bedrockClient.js';

// ─── Mock Canvas API (jsdom doesn't implement OffscreenCanvas / Image fully) ──

function makeImageDataStub(width, height, fillValue = 50) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillValue;     // R
    data[i + 1] = fillValue; // G
    data[i + 2] = fillValue; // B
    data[i + 3] = 255;       // A
  }
  return { data, width, height };
}

/**
 * Sets up global mocks for Image and OffscreenCanvas so that getImageData()
 * resolves with a synthetic ImageData of the given dimensions and fill value.
 */
function mockCanvasAPI(width = 10, height = 10, fillValue = 50) {
  const imageData = makeImageDataStub(width, height, fillValue);

  const mockCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue(imageData),
  };

  const MockOffscreenCanvas = vi.fn().mockImplementation(() => ({
    getContext: vi.fn().mockReturnValue(mockCtx),
  }));

  global.OffscreenCanvas = MockOffscreenCanvas;

  // Mock Image: trigger onload synchronously
  global.Image = class {
    constructor() {
      this.width = width;
      this.height = height;
    }
    set src(_) {
      // Trigger onload on next microtask
      Promise.resolve().then(() => this.onload && this.onload());
    }
  };

  return { imageData, mockCtx };
}

function mockBedrockColorUniformity(value) {
  invokeModel.mockResolvedValueOnce({
    content: [{ text: JSON.stringify({ colorUniformity: value }) }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── computeBorderRegularity ──────────────────────────────────────────────────

describe('computeBorderRegularity', () => {
  it('returns 1.0 for an empty contour', () => {
    expect(computeBorderRegularity([])).toBe(1.0);
  });

  it('returns 1.0 for a contour with fewer than 3 points', () => {
    expect(computeBorderRegularity([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(1.0);
  });

  it('returns a value in [0, 1] for a square contour', () => {
    const square = [
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 5 }, { x: 10, y: 10 },
      { x: 5, y: 10 }, { x: 0, y: 10 },
      { x: 0, y: 5 },
    ];
    const score = computeBorderRegularity(square);
    expect(score).toBeGreaterThanOrEqual(0.0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('returns a value in [0, 1] for a jagged contour', () => {
    // Zigzag contour — less regular than convex hull
    const jagged = [];
    for (let i = 0; i < 20; i++) {
      jagged.push({ x: i, y: i % 2 === 0 ? 0 : 5 });
    }
    const score = computeBorderRegularity(jagged);
    expect(score).toBeGreaterThanOrEqual(0.0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('never exceeds 1.0 (hull perimeter cannot exceed contour perimeter)', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({
      x: Math.cos(i) * 10 + 10,
      y: Math.sin(i) * 10 + 10,
    }));
    expect(computeBorderRegularity(pts)).toBeLessThanOrEqual(1.0);
  });
});

// ─── computeSymmetryScore ─────────────────────────────────────────────────────

describe('computeSymmetryScore', () => {
  it('returns 1.0 for a perfectly symmetric image', () => {
    // Uniform fill → perfectly symmetric
    const gray = Array.from({ length: 4 }, () => [100, 100, 100, 100]);
    expect(computeSymmetryScore(gray, 4, 4)).toBe(1.0);
  });

  it('returns a value in [0, 1] for an asymmetric image', () => {
    // Left half dark, right half bright
    const gray = Array.from({ length: 4 }, () => [0, 0, 255, 255]);
    const score = computeSymmetryScore(gray, 4, 4);
    expect(score).toBeGreaterThanOrEqual(0.0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('returns 1.0 for a 0×0 image', () => {
    expect(computeSymmetryScore([], 0, 0)).toBe(1.0);
  });

  it('score is lower for more asymmetric images', () => {
    const symmetric = Array.from({ length: 4 }, () => [128, 128, 128, 128]);
    const asymmetric = Array.from({ length: 4 }, () => [0, 0, 255, 255]);
    const s1 = computeSymmetryScore(symmetric, 4, 4);
    const s2 = computeSymmetryScore(asymmetric, 4, 4);
    expect(s1).toBeGreaterThan(s2);
  });
});

// ─── normalizeBoundaryPoints ──────────────────────────────────────────────────

describe('normalizeBoundaryPoints', () => {
  it('normalizes points to [0, 1]', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 5 }];
    const result = normalizeBoundaryPoints(pts, 10, 10);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 1, y: 1 });
    expect(result[2]).toEqual({ x: 0.5, y: 0.5 });
  });

  it('clamps values to [0, 1]', () => {
    const pts = [{ x: -5, y: 20 }];
    const result = normalizeBoundaryPoints(pts, 10, 10);
    expect(result[0].x).toBe(0.0);
    expect(result[0].y).toBe(1.0);
  });

  it('returns empty array for zero dimensions', () => {
    expect(normalizeBoundaryPoints([{ x: 5, y: 5 }], 0, 0)).toEqual([]);
  });

  it('all output x and y values are in [0, 1]', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 3, y: i * 2 }));
    const result = normalizeBoundaryPoints(pts, 50, 40);
    for (const { x, y } of result) {
      expect(x).toBeGreaterThanOrEqual(0.0);
      expect(x).toBeLessThanOrEqual(1.0);
      expect(y).toBeGreaterThanOrEqual(0.0);
      expect(y).toBeLessThanOrEqual(1.0);
    }
  });
});

// ─── detectScaleAndComputeArea ────────────────────────────────────────────────

describe('detectScaleAndComputeArea', () => {
  it('returns null when image is too small', () => {
    const gray = [[50, 50], [50, 50]];
    const mask = [[true, true], [true, true]];
    expect(detectScaleAndComputeArea(gray, mask, 2, 2)).toBeNull();
  });

  it('returns null when no ruler pattern is detected (uniform bottom edge)', () => {
    const w = 20, h = 20;
    const gray = Array.from({ length: h }, () => Array(w).fill(50));
    const mask = Array.from({ length: h }, () => Array(w).fill(true));
    expect(detectScaleAndComputeArea(gray, mask, w, h)).toBeNull();
  });

  it('returns a positive number when a ruler-like pattern is detected', () => {
    const w = 100, h = 100;
    const gray = Array.from({ length: h }, (_, y) => {
      if (y >= 90) {
        // Bottom 10%: alternating dark/light every pixel (ruler pattern)
        return Array.from({ length: w }, (_, x) => (x % 2 === 0 ? 0 : 255));
      }
      return Array(w).fill(50); // lesion area
    });
    const mask = Array.from({ length: h }, (_, y) => {
      if (y >= 90) return Array(w).fill(false);
      return Array(w).fill(true);
    });
    const result = detectScaleAndComputeArea(gray, mask, w, h);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });
});

// ─── runClassicalCV ───────────────────────────────────────────────────────────

describe('runClassicalCV', () => {
  it('returns all required fields with values in valid ranges', () => {
    const imageData = makeImageDataStub(10, 10, 50);
    const result = runClassicalCV(imageData, 10, 10);

    expect(result).toHaveProperty('borderRegularity');
    expect(result).toHaveProperty('symmetryScore');
    expect(result).toHaveProperty('boundaryPoints');
    expect(result).toHaveProperty('estimatedAreaMm2');

    expect(result.borderRegularity).toBeGreaterThanOrEqual(0.0);
    expect(result.borderRegularity).toBeLessThanOrEqual(1.0);
    expect(result.symmetryScore).toBeGreaterThanOrEqual(0.0);
    expect(result.symmetryScore).toBeLessThanOrEqual(1.0);
    expect(Array.isArray(result.boundaryPoints)).toBe(true);
  });

  it('returns estimatedAreaMm2 as null when no scale reference', () => {
    // Uniform image → no ruler pattern
    const imageData = makeImageDataStub(10, 10, 50);
    const result = runClassicalCV(imageData, 10, 10);
    expect(result.estimatedAreaMm2).toBeNull();
  });

  it('all boundaryPoints have x and y in [0, 1]', () => {
    const imageData = makeImageDataStub(20, 20, 50);
    const result = runClassicalCV(imageData, 20, 20);
    for (const { x, y } of result.boundaryPoints) {
      expect(x).toBeGreaterThanOrEqual(0.0);
      expect(x).toBeLessThanOrEqual(1.0);
      expect(y).toBeGreaterThanOrEqual(0.0);
      expect(y).toBeLessThanOrEqual(1.0);
    }
  });
});

// ─── extractFeatures (full integration with mocks) ───────────────────────────

describe('extractFeatures', () => {
  it('returns FeatureMetrics with all fields in valid ranges', async () => {
    mockCanvasAPI(10, 10, 50);
    mockBedrockColorUniformity(0.75);

    const result = await extractFeatures('base64data', 'image/jpeg');

    expect(result.borderRegularity).toBeGreaterThanOrEqual(0.0);
    expect(result.borderRegularity).toBeLessThanOrEqual(1.0);
    expect(result.symmetryScore).toBeGreaterThanOrEqual(0.0);
    expect(result.symmetryScore).toBeLessThanOrEqual(1.0);
    expect(result.colorUniformity).toBe(0.75);
    expect(Array.isArray(result.boundaryPoints)).toBe(true);
    // Uniform image → no scale reference
    expect(result.estimatedAreaMm2).toBeNull();
  });

  it('returns estimatedAreaMm2 as null when no scale reference detected', async () => {
    mockCanvasAPI(10, 10, 128); // uniform → no ruler
    mockBedrockColorUniformity(0.5);

    const result = await extractFeatures('base64data', 'image/png');
    expect(result.estimatedAreaMm2).toBeNull();
  });

  it('accepts colorUniformity boundary value 0.0', async () => {
    mockCanvasAPI(10, 10, 50);
    mockBedrockColorUniformity(0.0);

    const result = await extractFeatures('base64data', 'image/jpeg');
    expect(result.colorUniformity).toBe(0.0);
  });

  it('accepts colorUniformity boundary value 1.0', async () => {
    mockCanvasAPI(10, 10, 50);
    mockBedrockColorUniformity(1.0);

    const result = await extractFeatures('base64data', 'image/jpeg');
    expect(result.colorUniformity).toBe(1.0);
  });

  it('throws StepError when Bedrock returns invalid colorUniformity (out of range)', async () => {
    mockCanvasAPI(10, 10, 50);
    invokeModel.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ colorUniformity: 1.5 }) }],
    });

    await expect(extractFeatures('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError with step="featureExtraction" on invalid colorUniformity', async () => {
    mockCanvasAPI(10, 10, 50);
    invokeModel.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ colorUniformity: -0.1 }) }],
    });

    let err;
    try {
      await extractFeatures('base64data', 'image/jpeg');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(StepError);
    expect(err.step).toBe('featureExtraction');
  });

  it('throws StepError when Bedrock returns non-JSON text', async () => {
    mockCanvasAPI(10, 10, 50);
    invokeModel.mockResolvedValueOnce({
      content: [{ text: 'Sorry, I cannot analyze this.' }],
    });

    await expect(extractFeatures('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when Bedrock returns empty content', async () => {
    mockCanvasAPI(10, 10, 50);
    invokeModel.mockResolvedValueOnce({ content: [] });

    await expect(extractFeatures('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when invokeModel itself throws', async () => {
    mockCanvasAPI(10, 10, 50);
    invokeModel.mockRejectedValueOnce(new Error('Bedrock unavailable'));

    await expect(extractFeatures('base64data', 'image/jpeg')).rejects.toThrow(StepError);
  });

  it('throws StepError when image fails to load', async () => {
    // Mock Image that fires onerror
    global.Image = class {
      constructor() { this.width = 0; this.height = 0; }
      set src(_) {
        Promise.resolve().then(() => this.onerror && this.onerror(new Error('load failed')));
      }
    };
    global.OffscreenCanvas = vi.fn();

    await expect(extractFeatures('bad_base64', 'image/jpeg')).rejects.toThrow(StepError);
  });
});
