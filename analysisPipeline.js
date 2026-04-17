/**
 * Analysis Pipeline — orchestrates all four pipeline steps in sequence.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { uploadImage } from './s3Store.js';
import { classifyLesion } from './classificationStep.js';
import { extractFeatures } from './featureExtractor.js';
import { generateExplanation } from './explanationGenerator.js';
import { scoreRisk } from './riskScorer.js';
import { logFailure } from './requestLogger.js';
import { StepError, PipelineError } from './errors.js';
import { DISCLAIMER } from './explanationGenerator.js';

/**
 * Converts a File to a base64 string using arrayBuffer.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Runs the full analysis pipeline on a validated image file.
 *
 * Steps:
 *   1. Upload to S3
 *   2. Convert file to base64
 *   3. classifyLesion
 *   4. extractFeatures
 *   5. generateExplanation
 *   6. scoreRisk
 *
 * @param {File} validatedFile - a file that has already passed imageValidator
 * @param {string} userId - the authenticated user's unique identifier
 * @returns {Promise<{
 *   classificationResult: { category: string, confidence: number },
 *   featureMetrics: object,
 *   explanationText: string,
 *   riskResult: { level: string, score: number },
 *   disclaimer: string,
 *   s3Key: string
 * }>}
 * @throws {PipelineError} with a `step` field indicating which step failed
 */
export async function runPipeline(validatedFile, userId) {
  // Step 1: Upload to S3
  let s3Key;
  try {
    s3Key = await uploadImage(validatedFile, userId);
  } catch (err) {
    logFailure({
      requestId: `s3-upload-${Date.now()}`,
      errorCode: err.message,
      modelId: 's3',
    });
    throw new PipelineError(`Pipeline failed during S3 upload: ${err.message}`, {
      step: 'classification',
    });
  }

  // Step 2: Convert file to base64
  const imageBase64 = await fileToBase64(validatedFile);
  const mediaType = validatedFile.type;

  // Step 3: Classify lesion
  let classificationResult;
  try {
    classificationResult = await classifyLesion(imageBase64, mediaType);
  } catch (err) {
    const step = err instanceof StepError ? err.step : 'classification';
    logFailure({
      requestId: err.requestId || `classification-${Date.now()}`,
      errorCode: err.message,
      modelId: 'classificationStep',
    });
    throw new PipelineError(`Pipeline failed during classification: ${err.message}`, { step });
  }

  // Step 4: Extract features
  let featureMetrics;
  try {
    featureMetrics = await extractFeatures(imageBase64, mediaType);
  } catch (err) {
    const step = err instanceof StepError ? err.step : 'featureExtraction';
    logFailure({
      requestId: err.requestId || `featureExtraction-${Date.now()}`,
      errorCode: err.message,
      modelId: 'featureExtractor',
    });
    throw new PipelineError(`Pipeline failed during feature extraction: ${err.message}`, { step });
  }

  // Step 5: Generate explanation
  let explanationText;
  try {
    explanationText = await generateExplanation(classificationResult, featureMetrics);
  } catch (err) {
    const step = err instanceof StepError ? err.step : 'explanation';
    logFailure({
      requestId: err.requestId || `explanation-${Date.now()}`,
      errorCode: err.message,
      modelId: 'explanationGenerator',
    });
    throw new PipelineError(`Pipeline failed during explanation generation: ${err.message}`, { step });
  }

  // Step 6: Score risk
  let riskResult;
  try {
    riskResult = scoreRisk(classificationResult.confidence, featureMetrics);
  } catch (err) {
    const step = err instanceof StepError ? err.step : 'riskScoring';
    logFailure({
      requestId: `riskScoring-${Date.now()}`,
      errorCode: err.message,
      modelId: 'riskScorer',
    });
    throw new PipelineError(`Pipeline failed during risk scoring: ${err.message}`, { step });
  }

  return {
    classificationResult,
    featureMetrics,
    explanationText,
    riskResult,
    disclaimer: DISCLAIMER,
    s3Key,
  };
}
