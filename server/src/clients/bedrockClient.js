import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Custom error thrown after all Bedrock retry attempts are exhausted.
 */
export class BedrockCallError extends Error {
  constructor(message, { statusCode, requestId, attempts } = {}) {
    super(message);
    this.name = 'BedrockCallError';
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.attempts = attempts;
  }
}

/**
 * Creates a configured BedrockRuntimeClient instance.
 * @param {{ region?: string }} options
 * @returns {BedrockRuntimeClient}
 */
export function createBedrockClient({ region = process.env.AWS_REGION || 'us-east-1' } = {}) {
  return new BedrockRuntimeClient({ region });
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

/**
 * Determines whether an error's HTTP status code is retryable.
 * Retries on 429 (throttling) and 5xx (server errors).
 * Fails immediately on other 4xx client errors.
 */
function isRetryable(statusCode) {
  if (statusCode === 429) return true;
  if (statusCode >= 500 && statusCode < 600) return true;
  return false;
}

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Invokes a Bedrock model via the Converse API with exponential backoff retry.
 *
 * @param {string} modelId - Bedrock model identifier
 * @param {Array} messages - Converse API message array
 * @param {object} [inferenceConfig] - Optional temperature, maxTokens, etc.
 * @param {{ client?: BedrockRuntimeClient, sleepFn?: Function }} [options] - Injectable dependencies for testing
 * @returns {Promise<object>} - Parsed model response
 * @throws {BedrockCallError} - After max retries exhausted or on non-retryable error
 */
export async function invokeWithRetry(modelId, messages, inferenceConfig, options = {}) {
  const client = options.client || createBedrockClient();
  const sleepFn = options.sleepFn || sleep;

  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const startTime = Date.now();
    try {
      const command = new ConverseCommand({
        modelId,
        messages,
        ...(inferenceConfig ? { inferenceConfig } : {}),
      });

      const response = await client.send(command);
      const elapsed = Date.now() - startTime;

      console.log(JSON.stringify({
        event: 'bedrock_call_success',
        modelId,
        attempt: attempt + 1,
        responseTimeMs: elapsed,
        requestId: response.$metadata?.requestId,
      }));

      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const statusCode = error.$metadata?.httpStatusCode || error.statusCode;
      const requestId = error.$metadata?.requestId;

      console.log(JSON.stringify({
        event: 'bedrock_call_error',
        modelId,
        attempt: attempt + 1,
        responseTimeMs: elapsed,
        requestId,
        statusCode,
        errorName: error.name,
        errorMessage: error.message,
      }));

      lastError = error;

      // Fail immediately on non-retryable errors (4xx except 429)
      if (statusCode && !isRetryable(statusCode)) {
        throw new BedrockCallError(
          `Bedrock call failed with non-retryable status ${statusCode}: ${error.message}`,
          { statusCode, requestId, attempts: attempt + 1 }
        );
      }

      // If we have more attempts, wait with exponential backoff
      if (attempt < MAX_ATTEMPTS - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleepFn(delay);
      }
    }
  }

  // All retries exhausted
  const statusCode = lastError?.$metadata?.httpStatusCode || lastError?.statusCode;
  const requestId = lastError?.$metadata?.requestId;

  throw new BedrockCallError(
    `Bedrock call failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`,
    { statusCode, requestId, attempts: MAX_ATTEMPTS }
  );
}
