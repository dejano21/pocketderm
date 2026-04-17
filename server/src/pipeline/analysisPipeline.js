import { v4 as uuidv4 } from 'uuid';
import { classify } from './moleClassifier.js';
import { extractFeatures } from './featureExtractor.js';
import { generateExplanation } from './explanationGenerator.js';
import { estimateRisk } from './riskEstimator.js';

const DISCLAIMER =
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

/**
 * Wraps a pipeline step in timing + error handling.
 * Logs requestId and elapsed time; never logs image data or PII.
 *
 * @param {string} stepName
 * @param {string} requestId
 * @param {() => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function runStep(stepName, requestId, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    console.log(`[Pipeline] requestId=${requestId} step=${stepName} elapsed=${elapsed}ms status=ok`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`[Pipeline] requestId=${requestId} step=${stepName} elapsed=${elapsed}ms status=error`);
    throw Object.assign(err, { _failedStep: stepName });
  }
}

/**
 * Orchestrates the four-step analysis pipeline.
 *
 * 1. Classifier + Feature Extractor run in parallel
 * 2. Explanation Generator + Risk Estimator run in parallel (after step 1 completes)
 * 3. Assembles and returns the complete AnalysisResult
 *
 * @param {Buffer} imageBuffer - Validated image bytes
 * @param {string} s3Key - S3 key where the image was stored
 * @param {{ bedrockClient: object, riskConfig: object }} dependencies
 * @returns {Promise<object>} AnalysisResult or PipelineError
 */
export async function runAnalysis(imageBuffer, s3Key, dependencies) {
  const { bedrockClient, riskConfig } = dependencies;
  const requestId = uuidv4();
  const clientOpts = { client: bedrockClient };

  try {
    // Phase 1: Classifier + Feature Extractor in parallel
    const [classification, features] = await Promise.all([
      runStep('classifier', requestId, () => classify(imageBuffer, clientOpts)),
      runStep('featureExtractor', requestId, () => extractFeatures(imageBuffer, clientOpts)),
    ]);

    // Phase 2: Explanation Generator + Risk Estimator in parallel
    const [explanation, risk] = await Promise.all([
      runStep('explanationGenerator', requestId, () =>
        generateExplanation(classification, features, clientOpts),
      ),
      runStep('riskEstimator', requestId, () =>
        Promise.resolve(estimateRisk(classification, features, riskConfig)),
      ),
    ]);

    return {
      requestId,
      timestamp: new Date().toISOString(),
      s3Key,
      classification,
      features,
      explanation,
      risk,
      disclaimer: DISCLAIMER,
    };
  } catch (err) {
    const failedStep = err._failedStep || 'classifier';
    return {
      error: 'PIPELINE_ERROR',
      message: err.message || 'An unexpected error occurred during analysis',
      failedStep,
    };
  }
}
