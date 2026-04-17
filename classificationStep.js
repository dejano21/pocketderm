/**
 * Classification Step — Pipeline Step 1.
 * Sends the image to the Bedrock vision model and returns a lesion category and confidence score.
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

import { invokeModel } from './bedrockClient.js';
import { StepError } from './errors.js';

const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

const VALID_CATEGORIES = new Set([
  'common nevus',
  'atypical nevus',
  'seborrheic keratosis',
  'melanoma-suspicious',
  'other',
]);

const CLASSIFICATION_PROMPT =
  'You are a dermatology AI assistant. Analyze the skin lesion image and classify it.\n' +
  'Respond with ONLY a JSON object in this exact format, no other text:\n' +
  '{"category": "<category>", "confidence": <number>}\n' +
  'The category must be exactly one of: "common nevus", "atypical nevus", "seborrheic keratosis", "melanoma-suspicious", "other".\n' +
  'The confidence must be a number between 0.0 and 1.0 representing your certainty.';

/**
 * Classifies a skin lesion image using the Bedrock vision model.
 *
 * @param {string} imageBase64 - base64-encoded image data
 * @param {string} mediaType   - 'image/jpeg' | 'image/png'
 * @returns {Promise<{ category: string, confidence: number }>}
 * @throws {StepError} if the model response fails validation
 */
export async function classifyLesion(imageBase64, mediaType) {
  const requestId = `classification-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 256,
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
            text: CLASSIFICATION_PROMPT,
          },
        ],
      },
    ],
  };

  let response;
  try {
    response = await invokeModel({ modelId: MODEL_ID, body, requestId });
  } catch (err) {
    throw new StepError(`Classification failed: ${err.message}`, {
      step: 'classification',
      retryable: false,
      requestId,
    });
  }

  // Parse the text content from the Bedrock response
  const text = response?.content?.[0]?.text;
  if (!text) {
    throw new StepError('Classification failed: empty response from model', {
      step: 'classification',
      retryable: false,
      requestId,
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new StepError('Classification failed: model did not return valid JSON', {
      step: 'classification',
      retryable: false,
      requestId,
    });
  }

  const { category, confidence } = parsed;

  if (!VALID_CATEGORIES.has(category)) {
    throw new StepError(
      `Classification failed: invalid category "${category}"`,
      { step: 'classification', retryable: false, requestId }
    );
  }

  if (typeof confidence !== 'number' || confidence < 0.0 || confidence > 1.0) {
    throw new StepError(
      `Classification failed: confidence ${confidence} is out of range [0.0, 1.0]`,
      { step: 'classification', retryable: false, requestId }
    );
  }

  return { category, confidence };
}
