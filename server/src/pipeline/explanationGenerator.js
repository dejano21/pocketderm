import { invokeWithRetry } from '../clients/bedrockClient.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-20250514';

const DISCLAIMER =
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

/**
 * Builds the text prompt sent to Bedrock for explanation generation.
 * @param {{ category: string, confidence: number }} classification
 * @param {object} metrics
 * @returns {string}
 */
function buildPrompt(classification, metrics) {
  const surfaceAreaText = metrics.surfaceArea?.scaleAvailable
    ? `${metrics.surfaceArea.value} mm²`
    : 'not available (no scale reference)';

  return `You are a dermatological assessment assistant. Based on the following analysis results, write a plain-language explanation for the patient.

Classification: ${classification.category} (confidence: ${(classification.confidence * 100).toFixed(1)}%)

Metrics (ABCDE criteria):
- Asymmetry (symmetry score): ${metrics.symmetry} (1 = perfectly symmetric, 0 = highly asymmetric)
- Border regularity: ${metrics.borderRegularity} (1 = perfectly regular, 0 = highly irregular)
- Color uniformity: ${metrics.colorUniformity} (1 = perfectly uniform, 0 = highly varied)
- Diameter / Surface area: ${surfaceAreaText}

Requirements:
- Write exactly 120 to 200 words
- Reference the ABCDE criteria (Asymmetry, Border, Color, Diameter, Evolving) where relevant
- Highlight any metrics that indicate concerning values (scores below 0.5)
- Use plain language a patient can understand
- Do NOT include any disclaimer text

Respond with ONLY the explanation text, no JSON, no markdown formatting.`;
}

/**
 * Counts words in a string by splitting on whitespace.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Post-processes raw explanation text: validates word count and appends disclaimer.
 *
 * If the text is under 120 words, it is returned as-is with the disclaimer
 * (the caller should handle re-prompting if needed).
 * If the text exceeds 200 words, it is truncated to 200 words.
 *
 * @param {string} rawText - Raw explanation text from Bedrock
 * @returns {{ explanation: string, wordCount: number }}
 */
export function postProcessExplanation(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Explanation text is empty or not a string');
  }

  let cleaned = rawText.trim();

  // Remove the disclaimer if Bedrock included it despite instructions
  if (cleaned.endsWith(DISCLAIMER)) {
    cleaned = cleaned.slice(0, -DISCLAIMER.length).trim();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);

  // Truncate to 200 words if over
  if (words.length > 200) {
    cleaned = words.slice(0, 200).join(' ');
  }

  const wordCount = countWords(cleaned);

  // Append disclaimer
  const explanation = `${cleaned}\n\n${DISCLAIMER}`;

  return { explanation, wordCount };
}


/**
 * Generates a plain-language explanation of the mole analysis results
 * by sending classification and metrics to Bedrock.
 *
 * @param {{ category: string, confidence: number }} classification
 * @param {object} metrics - Feature extraction results
 * @param {object} [options] - Optional overrides
 * @param {object} [options.client] - Bedrock client instance
 * @returns {Promise<{ explanation: string }>}
 */
export async function generateExplanation(classification, metrics, options = {}) {
  const prompt = buildPrompt(classification, metrics);

  const messages = [
    {
      role: 'user',
      content: [{ text: prompt }],
    },
  ];

  const inferenceConfig = {
    maxTokens: 512,
    temperature: 0.3,
  };

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await invokeWithRetry(MODEL_ID, messages, inferenceConfig, {
      client: options.client,
    });

    const textContent = response?.output?.message?.content
      ?.find((block) => block.text)
      ?.text;

    if (!textContent) {
      throw new Error('Bedrock response contains no text content for explanation');
    }

    const { explanation, wordCount } = postProcessExplanation(textContent);

    // If word count is valid or we've exhausted retries, return what we have
    if ((wordCount >= 120 && wordCount <= 200) || attempt === MAX_RETRIES) {
      return { explanation };
    }

    // Otherwise retry with adjusted prompt (Bedrock may not hit exact word count)
  }

  // Should not reach here, but just in case
  throw new Error('Failed to generate explanation within word count bounds');
}
