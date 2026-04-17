import { invokeWithRetry } from '../clients/bedrockClient.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-20250514';

const FEATURE_EXTRACTION_PROMPT = `You are a dermatological image analysis assistant. Analyze the provided skin lesion image and extract quantitative ABCDE metrics.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "surfaceArea": {
    "value": <number in mm² or null if no scale reference is visible>,
    "unit": "mm2",
    "scaleAvailable": <true if a physical scale reference is visible, false otherwise>
  },
  "borderRegularity": <number between 0 and 1, where 1 = perfectly regular>,
  "symmetry": <number between 0 and 1, where 1 = perfectly symmetric>,
  "colorUniformity": <number between 0 and 1, where 1 = perfectly uniform color>,
  "boundaryPoints": [
    { "x": <number between 0 and 1>, "y": <number between 0 and 1> }
  ]
}

Rules:
- surfaceArea.value MUST be a number (mm²) if a physical scale reference is visible, or null if not.
- surfaceArea.scaleAvailable MUST be true if a scale reference is visible, false otherwise.
- borderRegularity, symmetry, and colorUniformity MUST each be a number between 0 and 1 inclusive.
- boundaryPoints MUST be an array of at least 3 points with x and y each between 0 and 1 inclusive, representing the normalized lesion boundary coordinates.`;

/**
 * Parses and validates a feature extraction response from Bedrock.
 *
 * @param {object} response - Raw Bedrock Converse API response
 * @returns {{ surfaceArea: { value: number|null, unit: string, scaleAvailable: boolean }, borderRegularity: number, symmetry: number, colorUniformity: number, boundaryPoints: Array<{x: number, y: number}> }}
 * @throws {Error} If the response cannot be parsed or contains invalid values
 */
export function parseFeatureResponse(response) {
  const textContent = response?.output?.message?.content
    ?.find((block) => block.text)
    ?.text;

  if (!textContent) {
    throw new Error('Bedrock response contains no text content');
  }

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Bedrock response does not contain valid JSON');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse feature extraction JSON: ${jsonMatch[0]}`);
  }

  return validateFeatureResult(parsed);
}


/**
 * Validates a parsed feature result object.
 *
 * @param {object} parsed - Parsed JSON object
 * @returns {{ surfaceArea: { value: number|null, unit: string, scaleAvailable: boolean }, borderRegularity: number, symmetry: number, colorUniformity: number, boundaryPoints: Array<{x: number, y: number}> }}
 * @throws {Error} If any field is invalid
 */
function validateFeatureResult(parsed) {
  // Validate surfaceArea
  if (!parsed.surfaceArea || typeof parsed.surfaceArea !== 'object') {
    throw new Error('Missing or invalid surfaceArea object');
  }

  const { surfaceArea } = parsed;

  if (surfaceArea.value !== null && (typeof surfaceArea.value !== 'number' || !Number.isFinite(surfaceArea.value) || surfaceArea.value < 0)) {
    throw new Error(`Invalid surfaceArea.value "${surfaceArea.value}". Must be a non-negative number or null.`);
  }

  if (surfaceArea.unit !== 'mm2') {
    throw new Error(`Invalid surfaceArea.unit "${surfaceArea.unit}". Must be "mm2".`);
  }

  if (typeof surfaceArea.scaleAvailable !== 'boolean') {
    throw new Error(`Invalid surfaceArea.scaleAvailable "${surfaceArea.scaleAvailable}". Must be a boolean.`);
  }

  // Validate score fields [0, 1]
  validateScore(parsed, 'borderRegularity');
  validateScore(parsed, 'symmetry');
  validateScore(parsed, 'colorUniformity');

  // Validate boundaryPoints
  if (!Array.isArray(parsed.boundaryPoints)) {
    throw new Error('boundaryPoints must be an array');
  }

  if (parsed.boundaryPoints.length === 0) {
    throw new Error('boundaryPoints must contain at least one point');
  }

  const validatedPoints = parsed.boundaryPoints.map((point, i) => {
    if (typeof point !== 'object' || point === null) {
      throw new Error(`boundaryPoints[${i}] must be an object`);
    }
    if (typeof point.x !== 'number' || !Number.isFinite(point.x) || point.x < 0 || point.x > 1) {
      throw new Error(`boundaryPoints[${i}].x must be a number between 0 and 1. Got "${point.x}".`);
    }
    if (typeof point.y !== 'number' || !Number.isFinite(point.y) || point.y < 0 || point.y > 1) {
      throw new Error(`boundaryPoints[${i}].y must be a number between 0 and 1. Got "${point.y}".`);
    }
    return { x: point.x, y: point.y };
  });

  return {
    surfaceArea: {
      value: surfaceArea.value,
      unit: 'mm2',
      scaleAvailable: surfaceArea.scaleAvailable,
    },
    borderRegularity: parsed.borderRegularity,
    symmetry: parsed.symmetry,
    colorUniformity: parsed.colorUniformity,
    boundaryPoints: validatedPoints,
  };
}

/**
 * Validates that a score field is a number in [0, 1].
 */
function validateScore(obj, field) {
  const value = obj[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `Invalid ${field} "${value}". Must be a number between 0 and 1 inclusive.`
    );
  }
}

/**
 * Extracts quantitative ABCDE features from a skin lesion image using Amazon Bedrock.
 *
 * @param {Buffer} imageBuffer - Validated image bytes
 * @param {object} [options] - Optional overrides
 * @param {object} [options.client] - Bedrock client instance for invokeWithRetry
 * @returns {Promise<{ surfaceArea: { value: number|null, unit: string, scaleAvailable: boolean }, borderRegularity: number, symmetry: number, colorUniformity: number, boundaryPoints: Array<{x: number, y: number}> }>}
 * @throws {Error} If the Bedrock call fails or the response is invalid
 */
export async function extractFeatures(imageBuffer, options = {}) {
  const format = detectImageFormat(imageBuffer);

  const messages = [
    {
      role: 'user',
      content: [
        {
          image: {
            format,
            source: { bytes: imageBuffer },
          },
        },
        {
          text: FEATURE_EXTRACTION_PROMPT,
        },
      ],
    },
  ];

  const inferenceConfig = {
    maxTokens: 1024,
    temperature: 0,
  };

  const response = await invokeWithRetry(MODEL_ID, messages, inferenceConfig, {
    client: options.client,
  });

  return parseFeatureResponse(response);
}

/**
 * Detects image format from magic bytes.
 * @param {Buffer} buffer
 * @returns {"jpeg" | "png"}
 */
function detectImageFormat(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  return 'jpeg';
}
