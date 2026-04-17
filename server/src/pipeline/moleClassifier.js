import { invokeWithRetry } from '../clients/bedrockClient.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-20250514';

const VALID_CATEGORIES = new Set([
  'Common nevus',
  'Atypical nevus',
  'Seborrheic keratosis',
  'Melanoma-suspicious',
  'Other',
]);

const CLASSIFICATION_PROMPT = `You are a dermatological image analysis assistant. Analyze the provided skin lesion image and classify it.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "category": "<one of: Common nevus, Atypical nevus, Seborrheic keratosis, Melanoma-suspicious, Other>",
  "confidence": <number between 0 and 1>
}

The category MUST be exactly one of these values:
- "Common nevus"
- "Atypical nevus"
- "Seborrheic keratosis"
- "Melanoma-suspicious"
- "Other"

The confidence MUST be a number between 0 and 1 inclusive, representing how confident you are in the classification.`;

/**
 * Parses and validates a classification response from Bedrock.
 *
 * @param {object} response - Raw Bedrock Converse API response
 * @returns {{ category: string, confidence: number }}
 * @throws {Error} If the response cannot be parsed or contains invalid values
 */
export function parseClassificationResponse(response) {
  const textContent = response?.output?.message?.content
    ?.find((block) => block.text)
    ?.text;

  if (!textContent) {
    throw new Error('Bedrock response contains no text content');
  }

  // Extract JSON from the response text (handle potential markdown code blocks)
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Bedrock response does not contain valid JSON');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse classification JSON: ${jsonMatch[0]}`);
  }

  const { category, confidence } = parsed;

  if (!VALID_CATEGORIES.has(category)) {
    throw new Error(
      `Invalid category "${category}". Must be one of: ${[...VALID_CATEGORIES].join(', ')}`
    );
  }

  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(
      `Invalid confidence "${confidence}". Must be a number between 0 and 1 inclusive.`
    );
  }

  return { category, confidence };
}


/**
 * Classifies a skin lesion image using Amazon Bedrock.
 *
 * @param {Buffer} imageBuffer - Validated image bytes
 * @param {object} [options] - Optional overrides
 * @param {object} [options.client] - Bedrock client instance for invokeWithRetry
 * @returns {Promise<{ category: string, confidence: number }>}
 * @throws {Error} If the Bedrock call fails or the response is invalid
 */
export async function classify(imageBuffer, options = {}) {
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
          text: CLASSIFICATION_PROMPT,
        },
      ],
    },
  ];

  const inferenceConfig = {
    maxTokens: 256,
    temperature: 0,
  };

  const response = await invokeWithRetry(MODEL_ID, messages, inferenceConfig, {
    client: options.client,
  });

  return parseClassificationResponse(response);
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
  // Default to jpeg
  return 'jpeg';
}
