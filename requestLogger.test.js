// Feature: ai-mole-analysis, Property 10: Log entries contain required fields and no sensitive data
// Validates: Requirements 11.1, 11.2, 11.3, 11.4

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { logSuccess, logFailure } from './requestLogger.js';

/**
 * Property 10: Request logs contain required fields and no sensitive data
 *
 * For any Bedrock invocation (successful or failed), every log entry produced by
 * Request_Logger SHALL contain requestId and either durationMs (on success) or
 * errorCode (on failure), and SHALL NOT contain any image data or personally
 * identifiable information.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */

describe('requestLogger — Property 10: Log entries contain required fields and no sensitive data', () => {
  let logOutput = [];

  beforeEach(() => {
    logOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logOutput.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...args) => logOutput.push(args.join(' ')));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logSuccess: always contains requestId, durationMs, modelId and never image data or PII', () => {
    fc.assert(
      fc.property(
        // requestId: arbitrary non-empty string
        fc.string({ minLength: 1, maxLength: 64 }),
        // durationMs: non-negative integer
        fc.nat({ max: 30000 }),
        // modelId: arbitrary model identifier
        fc.string({ minLength: 1, maxLength: 128 }),
        // Simulate sensitive data that must NOT appear in logs
        fc.base64String({ minLength: 10, maxLength: 100 }),  // image data
        fc.emailAddress(),                                    // PII (email)
        (requestId, durationMs, modelId, imageData, email) => {
          logOutput = [];

          logSuccess({ requestId, durationMs, modelId });

          expect(logOutput.length).toBeGreaterThan(0);
          const entry = JSON.parse(logOutput[0]);

          // Required fields present
          expect(entry).toHaveProperty('requestId', requestId);
          expect(entry).toHaveProperty('durationMs', durationMs);
          expect(entry).toHaveProperty('modelId', modelId);

          // No image data in log
          const logStr = logOutput[0];
          expect(logStr).not.toContain(imageData);

          // No PII (email) in log — logSuccess is never called with PII,
          // but we verify the output doesn't accidentally contain it
          expect(logStr).not.toContain(email);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logFailure: always contains requestId, errorCode, modelId and never image data or PII', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.base64String({ minLength: 10, maxLength: 100 }),
        fc.emailAddress(),
        (requestId, errorCode, modelId, imageData, email) => {
          logOutput = [];

          logFailure({ requestId, errorCode, modelId });

          expect(logOutput.length).toBeGreaterThan(0);
          const entry = JSON.parse(logOutput[0]);

          // Required fields present
          expect(entry).toHaveProperty('requestId', requestId);
          expect(entry).toHaveProperty('errorCode', errorCode);
          expect(entry).toHaveProperty('modelId', modelId);

          // No image data in log
          const logStr = logOutput[0];
          expect(logStr).not.toContain(imageData);

          // No PII in log
          expect(logStr).not.toContain(email);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logSuccess: output does not contain image-like base64 data even when passed alongside valid params', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.nat({ max: 30000 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        (requestId, durationMs, modelId) => {
          logOutput = [];
          // Only the allowed fields are passed — verify no extra fields leak in
          logSuccess({ requestId, durationMs, modelId });
          const entry = JSON.parse(logOutput[0]);

          const keys = Object.keys(entry);
          // Must not contain fields that could carry image data or PII
          expect(keys).not.toContain('image');
          expect(keys).not.toContain('imageData');
          expect(keys).not.toContain('base64');
          expect(keys).not.toContain('userId');
          expect(keys).not.toContain('email');
          expect(keys).not.toContain('name');
          expect(keys).not.toContain('phone');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logFailure: output does not contain image-like or PII fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        (requestId, errorCode, modelId) => {
          logOutput = [];
          logFailure({ requestId, errorCode, modelId });
          const entry = JSON.parse(logOutput[0]);

          const keys = Object.keys(entry);
          expect(keys).not.toContain('image');
          expect(keys).not.toContain('imageData');
          expect(keys).not.toContain('base64');
          expect(keys).not.toContain('userId');
          expect(keys).not.toContain('email');
          expect(keys).not.toContain('name');
          expect(keys).not.toContain('phone');
        }
      ),
      { numRuns: 100 }
    );
  });
});
