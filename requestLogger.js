/**
 * Request Logger — records Bedrock request metadata without logging image data or PII.
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

/**
 * Logs a successful Bedrock request.
 * @param {{ requestId: string, durationMs: number, modelId: string }} entry
 */
function logSuccess({ requestId, durationMs, modelId }) {
  console.log(JSON.stringify({
    level: 'INFO',
    event: 'bedrock_request_success',
    requestId,
    durationMs,
    modelId,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Logs a failed Bedrock request.
 * @param {{ requestId: string, errorCode: string, modelId: string }} entry
 */
function logFailure({ requestId, errorCode, modelId }) {
  console.error(JSON.stringify({
    level: 'ERROR',
    event: 'bedrock_request_failure',
    requestId,
    errorCode,
    modelId,
    timestamp: new Date().toISOString(),
  }));
}

export { logSuccess, logFailure };
