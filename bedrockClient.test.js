/**
 * Unit tests for bedrockClient.js
 * Requirements: 3.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { BedrockError } from './errors.js';
import { invokeModel, setSleep } from './bedrockClient.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a fetch mock that returns the given status codes in sequence. */
function makeFetchMock(...statuses) {
  let call = 0;
  return vi.fn(async () => {
    const status = statuses[Math.min(call++, statuses.length - 1)];
    const ok = status >= 200 && status < 300;
    return {
      ok,
      status,
      json: async () => ({ content: [{ text: '{"result":"ok"}' }] }),
      text: async () => `Error ${status}`,
    };
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Replace sleep with a no-op to keep tests fast
  setSleep(() => Promise.resolve());
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore real sleep (not strictly needed but keeps state clean)
  setSleep((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('bedrockClient.invokeModel', () => {
  describe('non-retryable errors', () => {
    it.each([400, 401, 403])('throws BedrockError immediately on HTTP %i without retrying', async (statusCode) => {
      const fetchMock = makeFetchMock(statusCode);
      vi.stubGlobal('fetch', fetchMock);

      const err = await invokeModel({ modelId: 'test-model', body: { test: true }, requestId: 'req-001' })
        .catch(e => e);

      expect(err).toBeInstanceOf(BedrockError);
      expect(err.errorCode).toBe(String(statusCode));
      expect(err.attempts).toBe(1);
      // Only 1 fetch call — no retries
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry exhaustion', () => {
    it('retries up to 3 total attempts on retryable errors and throws BedrockError with attempts: 3', async () => {
      const fetchMock = makeFetchMock(429, 429, 429);
      vi.stubGlobal('fetch', fetchMock);

      const err = await invokeModel({ modelId: 'test-model', body: { test: true }, requestId: 'req-003' })
        .catch(e => e);

      expect(err).toBeInstanceOf(BedrockError);
      expect(err.attempts).toBe(3);
      expect(err.requestId).toBe('req-003');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it.each([500, 502, 503])('retries on HTTP %i and exhausts all 3 attempts', async (statusCode) => {
      const fetchMock = makeFetchMock(statusCode, statusCode, statusCode);
      vi.stubGlobal('fetch', fetchMock);

      const err = await invokeModel({ modelId: 'test-model', body: {}, requestId: 'req-004' })
        .catch(e => e);

      expect(err).toBeInstanceOf(BedrockError);
      expect(err.attempts).toBe(3);
      expect(err.errorCode).toBe(String(statusCode));
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('successful call', () => {
    it('returns parsed response data and calls logSuccess on success', async () => {
      const fetchMock = makeFetchMock(200);
      vi.stubGlobal('fetch', fetchMock);

      const result = await invokeModel({
        modelId: 'test-model',
        body: { anthropic_version: 'bedrock-2023-05-31', messages: [] },
        requestId: 'req-005',
      });

      expect(result).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"event":"bedrock_request_success"')
      );
    });

    it('succeeds on second attempt after one retryable error', async () => {
      const fetchMock = makeFetchMock(503, 200);
      vi.stubGlobal('fetch', fetchMock);

      const result = await invokeModel({
        modelId: 'test-model',
        body: {},
        requestId: 'req-006',
      });

      expect(result).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('logFailure on exhaustion', () => {
    it('calls logFailure after all retry attempts are exhausted', async () => {
      const fetchMock = makeFetchMock(500, 500, 500);
      vi.stubGlobal('fetch', fetchMock);

      await invokeModel({ modelId: 'test-model', body: {}, requestId: 'req-007' })
        .catch(() => {});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"event":"bedrock_request_failure"')
      );
    });
  });
});

// Feature: ai-mole-analysis, Property 4: Bedrock_Client retries exactly up to 3 times on retryable errors
// Validates: Requirements 3.4, 5.5
describe('Property 4: Bedrock_Client retries exactly up to 3 times on retryable errors', () => {
  const RETRYABLE_CODES = [429, 500, 502, 503];

  it('always makes exactly 3 attempts and throws BedrockError with attempts: 3 for any sequence of retryable errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of exactly 3 retryable status codes (one per attempt)
        fc.array(fc.constantFrom(...RETRYABLE_CODES), { minLength: 3, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (statusCodes, requestId) => {
          let callCount = 0;
          const fetchMock = vi.fn(async () => {
            const status = statusCodes[Math.min(callCount++, statusCodes.length - 1)];
            return {
              ok: false,
              status,
              json: async () => ({}),
              text: async () => `Error ${status}`,
            };
          });
          vi.stubGlobal('fetch', fetchMock);

          const err = await invokeModel({ modelId: 'test-model', body: {}, requestId })
            .catch(e => e);

          // Must throw a BedrockError
          expect(err).toBeInstanceOf(BedrockError);
          // Must have made exactly 3 attempts
          expect(fetchMock).toHaveBeenCalledTimes(3);
          // Error must report exactly 3 attempts
          expect(err.attempts).toBe(3);
          // requestId must be propagated
          expect(err.requestId).toBe(requestId);

          vi.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
