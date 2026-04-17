/**
 * Shared error types for the AI Mole Analysis Pipeline.
 * Requirements: 6.3, 6.4, 11.1, 11.2, 11.3, 11.4
 */

/**
 * Thrown by individual pipeline steps when a step-level failure occurs.
 * @property {'classification'|'featureExtraction'|'explanation'|'riskScoring'} step
 * @property {boolean} retryable
 * @property {string} [requestId]
 */
class StepError extends Error {
  /**
   * @param {string} message
   * @param {{ step: 'classification'|'featureExtraction'|'explanation'|'riskScoring', retryable: boolean, requestId?: string }} options
   */
  constructor(message, { step, retryable, requestId } = {}) {
    super(message);
    this.name = 'StepError';
    this.step = step;
    this.retryable = retryable;
    if (requestId !== undefined) this.requestId = requestId;
  }
}

/**
 * Thrown by the pipeline orchestrator when any step fails.
 * @property {'classification'|'featureExtraction'|'explanation'|'riskScoring'} step
 */
class PipelineError extends Error {
  /**
   * @param {string} message
   * @param {{ step: 'classification'|'featureExtraction'|'explanation'|'riskScoring' }} options
   */
  constructor(message, { step } = {}) {
    super(message);
    this.name = 'PipelineError';
    this.step = step;
  }
}

/**
 * Thrown by the Bedrock client after all retry attempts are exhausted.
 * @property {string} requestId
 * @property {string} errorCode
 * @property {number} attempts
 */
class BedrockError extends Error {
  /**
   * @param {string} message
   * @param {{ requestId: string, errorCode: string, attempts: number }} options
   */
  constructor(message, { requestId, errorCode, attempts } = {}) {
    super(message);
    this.name = 'BedrockError';
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.attempts = attempts;
  }
}

export { StepError, PipelineError, BedrockError };
