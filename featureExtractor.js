/**
 * Feature Extractor — Pipeline Step 2.
 * Phase 1: Classical CV via Canvas API (border regularity, symmetry, boundary points, area).
 * Phase 2: Bedrock call for color uniformity.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

import { invokeModel } from './bedrockClient.js';
import { StepError } from './errors.js';

const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

const COLOR_UNIFORMITY_PROMPT =
  'You are a dermatology AI assistant. Analyze the color uniformity of the skin lesion in the image.\n' +
  'A score of 1.0 means perfectly uniform color throughout the lesion.\n' +
  'A score of 0.0 means highly non-uniform color (multiple distinct colors or irregular pigmentation).\n' +
  'Respond with ONLY a JSON object in this exact format, no other text:\n' +
  '{"colorUniformity": <number between 0.0 and 1.0>}';

// ─── Canvas / image helpers ───────────────────────────────────────────────────

/**
 * Loads a base64 image onto a canvas and returns the ImageData.
 * Works in browser (Image + Canvas) and in test environments via mocks.
 *
 * @param {string} imageBase64
 * @param {string} mediaType
 * @returns {Promise<{ imageData: ImageData, width: number, height: number }>}
 */
async function getImageData(imageBase64, mediaType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({ imageData, width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:${mediaType};base64,${imageBase64}`;
  });
}

// ─── Classical CV algorithms ──────────────────────────────────────────────────

/**
 * Converts RGBA pixel data to a grayscale 2D array.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @returns {number[][]} grayscale[y][x] in [0, 255]
 */
function toGrayscale(data, width, height) {
  const gray = [];
  for (let y = 0; y < height; y++) {
    gray[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      gray[y][x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return gray;
}

/**
 * Simple threshold-based segmentation: pixels darker than threshold are "lesion".
 * Returns a binary mask (true = lesion pixel).
 * @param {number[][]} gray
 * @param {number} width
 * @param {number} height
 * @param {number} [threshold=128]
 * @returns {boolean[][]}
 */
function segmentLesion(gray, width, height, threshold = 128) {
  const mask = [];
  for (let y = 0; y < height; y++) {
    mask[y] = [];
    for (let x = 0; x < width; x++) {
      mask[y][x] = gray[y][x] < threshold;
    }
  }
  return mask;
}

/**
 * Extracts contour pixels (lesion pixels adjacent to a non-lesion pixel).
 * @param {boolean[][]} mask
 * @param {number} width
 * @param {number} height
 * @returns {Array<{x: number, y: number}>}
 */
function extractContour(mask, width, height) {
  const contour = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) continue;
      // Check 4-connected neighbors
      const isEdge =
        (x === 0 || !mask[y][x - 1]) ||
        (x === width - 1 || !mask[y][x + 1]) ||
        (y === 0 || !mask[y - 1][x]) ||
        (y === height - 1 || !mask[y + 1][x]);
      if (isEdge) contour.push({ x, y });
    }
  }
  return contour;
}

/**
 * Computes the convex hull of a set of points using Graham scan.
 * @param {Array<{x: number, y: number}>} points
 * @returns {Array<{x: number, y: number}>}
 */
function convexHull(points) {
  if (points.length < 3) return points.slice();

  // Find the bottom-most (then left-most) point
  let pivot = points[0];
  for (const p of points) {
    if (p.y > pivot.y || (p.y === pivot.y && p.x < pivot.x)) pivot = p;
  }

  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

  const sorted = points
    .filter(p => p !== pivot)
    .sort((a, b) => {
      const c = cross(pivot, a, b);
      if (c !== 0) return -c;
      return dist2(pivot, a) - dist2(pivot, b);
    });

  const hull = [pivot];
  for (const p of sorted) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  return hull;
}

/**
 * Computes the perimeter of a polygon (sum of Euclidean distances between consecutive points).
 * @param {Array<{x: number, y: number}>} points
 * @returns {number}
 */
function perimeter(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  return total;
}

/**
 * Computes border regularity as convexHullPerimeter / contourPerimeter.
 * A perfectly convex lesion scores 1.0; irregular borders score lower.
 * Result is clamped to [0.0, 1.0].
 *
 * @param {Array<{x: number, y: number}>} contour
 * @returns {number} [0.0, 1.0]
 */
function computeBorderRegularity(contour) {
  if (contour.length < 3) return 1.0;

  const hull = convexHull(contour);
  const hullPerim = perimeter(hull);
  const contourPerim = perimeter(contour);

  if (contourPerim === 0) return 1.0;

  const ratio = hullPerim / contourPerim;
  return Math.min(1.0, Math.max(0.0, ratio));
}

/**
 * Computes symmetry score by folding the grayscale image horizontally and vertically,
 * comparing pixel differences. Score = 1 - normalizedDifference, clamped to [0, 1].
 *
 * @param {number[][]} gray
 * @param {number} width
 * @param {number} height
 * @returns {number} [0.0, 1.0]
 */
function computeSymmetryScore(gray, width, height) {
  if (width === 0 || height === 0) return 1.0;

  // Horizontal fold (left vs right)
  let hDiff = 0;
  let hCount = 0;
  const halfW = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < halfW; x++) {
      hDiff += Math.abs(gray[y][x] - gray[y][width - 1 - x]);
      hCount++;
    }
  }

  // Vertical fold (top vs bottom)
  let vDiff = 0;
  let vCount = 0;
  const halfH = Math.floor(height / 2);
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < width; x++) {
      vDiff += Math.abs(gray[y][x] - gray[height - 1 - y][x]);
      vCount++;
    }
  }

  const totalDiff = hDiff + vDiff;
  const totalCount = hCount + vCount;

  if (totalCount === 0) return 1.0;

  // Normalize: max possible diff per pixel is 255
  const normalizedDiff = totalDiff / (totalCount * 255);
  return Math.min(1.0, Math.max(0.0, 1.0 - normalizedDiff));
}

/**
 * Normalizes contour points to [0, 1] by dividing by image dimensions.
 *
 * @param {Array<{x: number, y: number}>} contour
 * @param {number} width
 * @param {number} height
 * @returns {Array<{x: number, y: number}>}
 */
function normalizeBoundaryPoints(contour, width, height) {
  if (width === 0 || height === 0) return [];
  return contour.map(({ x, y }) => ({
    x: Math.min(1.0, Math.max(0.0, x / width)),
    y: Math.min(1.0, Math.max(0.0, y / height)),
  }));
}

/**
 * Detects a scale reference (ruler/scale bar) in the image.
 * Looks for a repeating high-contrast pattern along the image edges.
 * Returns null if no scale reference is detected.
 *
 * This is a heuristic: scan the bottom edge for alternating dark/light bands
 * (typical of a ruler scale bar). If found, estimate mm² from lesion pixel area.
 *
 * @param {number[][]} gray
 * @param {boolean[][]} mask
 * @param {number} width
 * @param {number} height
 * @returns {number | null}
 */
function detectScaleAndComputeArea(gray, mask, width, height) {
  if (width < 10 || height < 10) return null;

  // Scan the bottom 10% of the image for alternating dark/light pattern (ruler)
  const scanRows = Math.max(1, Math.floor(height * 0.1));
  const startRow = height - scanRows;

  let transitions = 0;
  let prevDark = gray[startRow][0] < 128;
  for (let x = 1; x < width; x++) {
    const isDark = gray[startRow][x] < 128;
    if (isDark !== prevDark) transitions++;
    prevDark = isDark;
  }

  // A ruler typically has many regular transitions (at least 10 per 100px)
  const transitionRate = transitions / width;
  if (transitionRate < 0.1) return null;

  // Estimate scale: assume each ruler division is ~1mm and spans ~(width/transitions/2) pixels
  const pixelsPerMm = transitions / 2;
  if (pixelsPerMm <= 0) return null;

  // Count lesion pixels
  let lesionPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) lesionPixels++;
    }
  }

  const areaMm2 = lesionPixels / (pixelsPerMm * pixelsPerMm);
  return areaMm2 > 0 ? areaMm2 : null;
}

// ─── Phase 1: Classical CV ────────────────────────────────────────────────────

/**
 * Runs the classical CV phase on the decoded image data.
 *
 * @param {ImageData} imageData
 * @param {number} width
 * @param {number} height
 * @returns {{ borderRegularity: number, symmetryScore: number, boundaryPoints: Array<{x:number,y:number}>, estimatedAreaMm2: number|null }}
 */
function runClassicalCV(imageData, width, height) {
  const gray = toGrayscale(imageData.data, width, height);
  const mask = segmentLesion(gray, width, height);
  const contour = extractContour(mask, width, height);

  const borderRegularity = computeBorderRegularity(contour);
  const symmetryScore = computeSymmetryScore(gray, width, height);
  const boundaryPoints = normalizeBoundaryPoints(contour, width, height);
  const estimatedAreaMm2 = detectScaleAndComputeArea(gray, mask, width, height);

  return { borderRegularity, symmetryScore, boundaryPoints, estimatedAreaMm2 };
}

// ─── Phase 2: Bedrock color uniformity ───────────────────────────────────────

/**
 * Calls Bedrock to obtain a color uniformity score.
 *
 * @param {string} imageBase64
 * @param {string} mediaType
 * @returns {Promise<number>} colorUniformity in [0.0, 1.0]
 * @throws {StepError}
 */
async function getColorUniformity(imageBase64, mediaType) {
  const requestId = `featureExtraction-color-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 128,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: COLOR_UNIFORMITY_PROMPT,
          },
        ],
      },
    ],
  };

  let response;
  try {
    response = await invokeModel({ modelId: MODEL_ID, body, requestId });
  } catch (err) {
    throw new StepError(`Feature extraction (color uniformity) failed: ${err.message}`, {
      step: 'featureExtraction',
      retryable: false,
      requestId,
    });
  }

  const text = response?.content?.[0]?.text;
  if (!text) {
    throw new StepError('Feature extraction failed: empty color uniformity response', {
      step: 'featureExtraction',
      retryable: false,
      requestId,
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new StepError('Feature extraction failed: color uniformity response is not valid JSON', {
      step: 'featureExtraction',
      retryable: false,
      requestId,
    });
  }

  const { colorUniformity } = parsed;

  if (typeof colorUniformity !== 'number' || colorUniformity < 0.0 || colorUniformity > 1.0) {
    throw new StepError(
      `Feature extraction failed: colorUniformity ${colorUniformity} is out of range [0.0, 1.0]`,
      { step: 'featureExtraction', retryable: false, requestId }
    );
  }

  return colorUniformity;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extracts feature metrics from a skin lesion image.
 *
 * Phase 1 (classical CV): border regularity, symmetry score, boundary points, estimated area.
 * Phase 2 (Bedrock): color uniformity.
 *
 * @param {string} imageBase64 - base64-encoded image data
 * @param {string} mediaType   - 'image/jpeg' | 'image/png'
 * @returns {Promise<{
 *   borderRegularity: number,
 *   symmetryScore: number,
 *   colorUniformity: number,
 *   boundaryPoints: Array<{x: number, y: number}>,
 *   estimatedAreaMm2: number | null
 * }>}
 * @throws {StepError}
 */
export async function extractFeatures(imageBase64, mediaType) {
  // Phase 1: Classical CV
  let cvResults;
  try {
    const { imageData, width, height } = await getImageData(imageBase64, mediaType);
    cvResults = runClassicalCV(imageData, width, height);
  } catch (err) {
    if (err instanceof StepError) throw err;
    throw new StepError(`Feature extraction (CV phase) failed: ${err.message}`, {
      step: 'featureExtraction',
      retryable: false,
    });
  }

  // Phase 2: Bedrock color uniformity
  const colorUniformity = await getColorUniformity(imageBase64, mediaType);

  return {
    borderRegularity: cvResults.borderRegularity,
    symmetryScore: cvResults.symmetryScore,
    colorUniformity,
    boundaryPoints: cvResults.boundaryPoints,
    estimatedAreaMm2: cvResults.estimatedAreaMm2,
  };
}

// Export internal helpers for unit testing
export {
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
};
