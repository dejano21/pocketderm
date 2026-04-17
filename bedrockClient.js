/**
 * Bedrock Client — wraps AWS Bedrock invocations with exponential backoff retry and logging.
 * Requirements: 3.4, 5.5, 11.1, 11.4
 */

import { logSuccess, logFailure } from './requestLogger.js';
import { BedrockError } from './errors.js';

const BEDROCK_CONFIG = {
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
};

/** Retryable HTTP status codes */
const RETRYABLE_CODES = new Set([429, 500, 502, 503]);

/** Non-retryable HTTP status codes — throw immediately */
const NON_RETRYABLE_CODES = new Set([400, 401, 403]);

/** Exponential backoff delays in ms for attempts 1, 2, 3 */
const RETRY_DELAYS_MS = [1000, 2000, 4000];

const MAX_ATTEMPTS = 3;

/**
 * Internal sleep implementation — swappable for tests.
 * @type {(ms: number) => Promise<void>}
 */
let _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exposed for testing — replace to avoid real delays.
 * @param {number} ms
 */
export function sleep(ms) {
  return _sleep(ms);
}

/**
 * Override the sleep implementation (for tests).
 * @param {(ms: number) => Promise<void>} fn
 */
export function setSleep(fn) {
  _sleep = fn;
}

// ─── AWS Signature V4 helpers (copied from bedrock.js) ───────────────────────

async function buildSignedHeaders({ method, host, path, region, service, accessKeyId, secretAccessKey, amzDate, dateStamp, body }) {
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    'Content-Type': 'application/json',
    'X-Amz-Date': amzDate,
    'Authorization': authorizationHeader,
  };
}

async function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = await hmacRaw('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, service);
  return hmacRaw(kService, 'aws4_request');
}

async function hmacRaw(key, message) {
  const keyMaterial = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? new Uint8Array(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key, message) {
  const raw = await hmacRaw(key, message);
  return bufToHex(raw);
}

async function sha256Hex(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return bufToHex(buf);
}

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Core invocation ──────────────────────────────────────────────────────────

/**
 * Makes a single signed HTTP call to Bedrock Runtime.
 * @param {{ modelId: string, body: object, region: string, accessKeyId: string, secretAccessKey: string }} params
 * @returns {Promise<{ status: number, data: object | null }>}
 */
async function callBedrock({ modelId, body, region, accessKeyId, secretAccessKey }) {
  const requestBody = JSON.stringify(body);
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const path = `/model/${encodeURIComponent(modelId)}/invoke`;
  const url = `https://${host}${path}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const headers = await buildSignedHeaders({
    method: 'POST',
    host,
    path,
    region,
    service: 'bedrock',
    accessKeyId,
    secretAccessKey,
    amzDate,
    dateStamp,
    body: requestBody,
  });

  const response = await fetch(url, { method: 'POST', headers, body: requestBody });
  const status = response.status;

  if (!response.ok) {
    return { status, data: null };
  }

  const data = await response.json();
  return { status, data };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Invokes a Bedrock model with exponential backoff retry.
 *
 * @param {{ modelId: string, body: object, requestId: string }} params
 * @returns {Promise<object>} parsed response data
 * @throws {BedrockError} after max retries or on non-retryable error
 */
export async function invokeModel({ modelId, body, requestId }) {
  const { region, accessKeyId, secretAccessKey } = BEDROCK_CONFIG;
  const startTime = Date.now();
  let lastStatus = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { status, data } = await callBedrock({ modelId, body, region, accessKeyId, secretAccessKey });

    if (status >= 200 && status < 300) {
      const durationMs = Date.now() - startTime;
      logSuccess({ requestId, durationMs, modelId });
      return data;
    }

    lastStatus = status;

    if (NON_RETRYABLE_CODES.has(status)) {
      throw new BedrockError(`Bedrock request failed with status ${status}`, {
        requestId,
        errorCode: String(status),
        attempts: attempt + 1,
      });
    }

    if (RETRYABLE_CODES.has(status)) {
      if (attempt < MAX_ATTEMPTS - 1) {
        await _sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      // Last attempt exhausted for retryable error — fall through to post-loop
    } else {
      // Unknown non-success status — treat as non-retryable, throw immediately
      throw new BedrockError(`Bedrock request failed with status ${status}`, {
        requestId,
        errorCode: String(status),
        attempts: attempt + 1,
      });
    }
  }

  // All retryable attempts exhausted
  logFailure({ requestId, errorCode: String(lastStatus), modelId });
  throw new BedrockError(`Bedrock request failed after ${MAX_ATTEMPTS} attempts`, {
    requestId,
    errorCode: String(lastStatus),
    attempts: MAX_ATTEMPTS,
  });
}
