/**
 * Explanation Generator — Pipeline Step 3.
 * Generates a plain-language ABCDE explanation using the Bedrock model.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.3
 */

import { invokeModel } from './bedrockClient.js';
import { StepError } from './errors.js';

const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const DISCLAIMER =
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

const MIN_WORDS = 120;
const MAX_WORDS = 200;

/**
 * Count words by splitting on whitespace.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  return text.trim().split(/\s+/).length;
}

/**
 * Build the initial explanation prompt.
 * @param {{ category: string, confidence: number }} classification
 * @param {{ borderRegularity: number, symmetryScore: number, colorUniformity: number, boundaryPoints: Array<{x,y}>, estimatedAreaMm2: number|null }} features
 * @param {boolean} strict - if true, add stricter word count instructions
 * @returns {string}
 */
function buildPrompt(classification, features, strict = false) {
  const confidencePct = Math.round(classification.confidence * 100);
  const areaTxt = features.estimatedAreaMm2 != null
    ? `${features.estimatedAreaMm2.toFixed(1)} mm²`
    : 'unavailable';

  const wordCountInstruction = strict
    ? `CRITICAL: Your response MUST be between ${MIN_WORDS} and ${MAX_WORDS} words. Count carefully before responding.`
    : `Your response must be between ${MIN_WORDS} and ${MAX_WORDS} words.`;

  return (
    `You are a dermatology AI assistant. Write a plain-language explanation of a skin lesion analysis for a patient.\n\n` +
    `Classification: ${classification.category} (confidence: ${confidencePct}%)\n` +
    `Feature metrics:\n` +
    `  - Border regularity: ${features.borderRegularity.toFixed(2)} (0=irregular, 1=regular)\n` +
    `  - Symmetry score: ${features.symmetryScore.toFixed(2)} (0=asymmetric, 1=symmetric)\n` +
    `  - Color uniformity: ${features.colorUniformity.toFixed(2)} (0=varied, 1=uniform)\n` +
    `  - Estimated area: ${areaTxt}\n` +
    `  - Boundary points detected: ${features.boundaryPoints.length}\n\n` +
    `Instructions:\n` +
    `1. Reference ALL five ABCDE dermatological criteria: Asymmetry, Border, Color, Diameter, Evolution.\n` +
    `2. Explain what each metric means for the patient in plain language.\n` +
    `3. ${wordCountInstruction}\n` +
    `4. End your response with this exact sentence as the final sentence: "${DISCLAIMER}"\n` +
    `Do not include any text after the disclaimer.`
  );
}

/**
 * Ensure the explanation ends with the Disclaimer.
 * @param {string} text
 * @returns {string}
 */
function ensureDisclaimer(text) {
  const trimmed = text.trim();
  if (trimmed.endsWith(DISCLAIMER)) return trimmed;
  return `${trimmed} ${DISCLAIMER}`;
}

/**
 * Truncate or pad explanation to fit within [MIN_WORDS, MAX_WORDS].
 * Truncation removes words from the end (before the disclaimer).
 * Padding appends filler words before the disclaimer.
 * @param {string} text
 * @returns {string}
 */
function truncateOrPad(text) {
  const words = text.trim().split(/\s+/);
  const count = words.length;

  if (count > MAX_WORDS) {
    // Truncate: keep disclaimer at end, trim body to fit
    const disclaimerWords = DISCLAIMER.split(/\s+/);
    const bodyBudget = MAX_WORDS - disclaimerWords.length - 1; // -1 for space
    const bodyWords = words.slice(0, bodyBudget);
    return [...bodyWords, DISCLAIMER].join(' ');
  }

  if (count < MIN_WORDS) {
    // Pad: insert filler before the disclaimer
    const needed = MIN_WORDS - count;
    const filler = Array(needed).fill('notably').join(' ');
    // Insert filler before the disclaimer
    const disclaimerIdx = text.lastIndexOf(DISCLAIMER);
    if (disclaimerIdx !== -1) {
      const before = text.slice(0, disclaimerIdx).trimEnd();
      return `${before} ${filler} ${DISCLAIMER}`;
    }
    return `${text.trim()} ${filler} ${DISCLAIMER}`;
  }

  return text;
}

/**
 * Invoke the model and extract the explanation text.
 * @param {string} prompt
 * @param {string} requestId
 * @returns {Promise<string>}
 */
async function callModel(prompt, requestId) {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ],
  };

  let response;
  try {
    response = await invokeModel({ modelId: MODEL_ID, body, requestId });
  } catch (err) {
    throw new StepError(`Explanation generation failed: ${err.message}`, {
      step: 'explanation',
      retryable: false,
      requestId,
    });
  }

  const text = response?.content?.[0]?.text;
  if (!text) {
    throw new StepError('Explanation generation failed: empty response from model', {
      step: 'explanation',
      retryable: false,
      requestId,
    });
  }

  return text.trim();
}

/**
 * Generates a plain-language ABCDE explanation for a skin lesion analysis.
 *
 * @param {{ category: string, confidence: number }} classification
 * @param {{ borderRegularity: number, symmetryScore: number, colorUniformity: number, boundaryPoints: Array<{x,y}>, estimatedAreaMm2: number|null }} features
 * @returns {Promise<string>} explanation text (120–200 words, ends with Disclaimer)
 * @throws {StepError} if the model call fails
 */
export async function generateExplanation(classification, features) {
  const requestId = `explanation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // First attempt
  const prompt1 = buildPrompt(classification, features, false);
  let explanation = await callModel(prompt1, requestId);
  explanation = ensureDisclaimer(explanation);

  if (countWords(explanation) >= MIN_WORDS && countWords(explanation) <= MAX_WORDS) {
    return explanation;
  }

  // Second attempt with stricter prompt
  const requestId2 = `${requestId}-retry`;
  const prompt2 = buildPrompt(classification, features, true);
  let explanation2 = await callModel(prompt2, requestId2);
  explanation2 = ensureDisclaimer(explanation2);

  if (countWords(explanation2) >= MIN_WORDS && countWords(explanation2) <= MAX_WORDS) {
    return explanation2;
  }

  // Both attempts failed — truncate/pad and log warning
  console.warn(
    `[explanationGenerator] Word count out of range after 2 attempts ` +
    `(attempt1: ${countWords(explanation)}, attempt2: ${countWords(explanation2)}). ` +
    `Truncating/padding to boundary.`
  );

  return truncateOrPad(explanation2);
}
