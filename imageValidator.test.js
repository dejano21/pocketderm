import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { validateImage } from './imageValidator.js';

// Mock createImageBitmap globally since it's a browser API not available in jsdom
const mockCreateImageBitmap = vi.fn();
vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);

/**
 * Helper to create a minimal File-like object.
 * @param {{ type?: string, size?: number }} options
 */
function makeFile({ type = 'image/jpeg', size = 1024 } = {}) {
  // File constructor: new File([content], name, options)
  // We use a Uint8Array of the desired size to avoid large allocations in tests
  const content = new Uint8Array(size);
  return new File([content], 'test-image', { type });
}

describe('validateImage', () => {
  beforeEach(() => {
    mockCreateImageBitmap.mockReset();
  });

  // Requirements: 1.1, 1.3 — wrong MIME type rejection
  it('rejects a file with an unsupported MIME type', async () => {
    const file = makeFile({ type: 'image/gif' });
    const result = await validateImage(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only JPEG and PNG files are supported.');
    expect(mockCreateImageBitmap).not.toHaveBeenCalled();
  });

  it('rejects a PDF file', async () => {
    const file = makeFile({ type: 'application/pdf' });
    const result = await validateImage(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only JPEG and PNG files are supported.');
  });

  // Requirements: 1.2 — oversized file rejection
  it('rejects a file that exceeds 10 MB', async () => {
    const file = makeFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 });
    const result = await validateImage(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File must be 10 MB or smaller.');
    expect(mockCreateImageBitmap).not.toHaveBeenCalled();
  });

  it('accepts a file that is exactly 10 MB', async () => {
    mockCreateImageBitmap.mockResolvedValue({});
    const file = makeFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 });
    const result = await validateImage(file);

    expect(result.valid).toBe(true);
  });

  // Requirements: 1.4 — corrupted/undecodable file rejection
  it('rejects a file that cannot be decoded as an image', async () => {
    mockCreateImageBitmap.mockRejectedValue(new Error('Failed to decode'));
    const file = makeFile({ type: 'image/jpeg', size: 512 });
    const result = await validateImage(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('The file could not be read as an image.');
  });

  // Requirements: 1.1 — happy path JPEG
  it('accepts a valid JPEG file', async () => {
    mockCreateImageBitmap.mockResolvedValue({});
    const file = makeFile({ type: 'image/jpeg', size: 2048 });
    const result = await validateImage(file);

    expect(result.valid).toBe(true);
    expect(result.file).toBe(file);
  });

  // Requirements: 1.1 — happy path PNG
  it('accepts a valid PNG file', async () => {
    mockCreateImageBitmap.mockResolvedValue({});
    const file = makeFile({ type: 'image/png', size: 4096 });
    const result = await validateImage(file);

    expect(result.valid).toBe(true);
    expect(result.file).toBe(file);
  });
});

// Feature: ai-mole-analysis, Property 1: Image validation accepts only valid MIME types and sizes
describe('Property 1: Image validation accepts only valid MIME types and sizes', () => {
  // Validates: Requirements 1.1, 1.2, 1.3, 1.5

  const MAX_SIZE = 10 * 1024 * 1024;
  const VALID_MIME_TYPES = ['image/jpeg', 'image/png'];

  // Arbitrary MIME type generator — mix of valid and arbitrary strings
  const mimeTypeArb = fc.oneof(
    fc.constantFrom(...VALID_MIME_TYPES),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.length > 0)
  );

  // Arbitrary file size: 0 to 15 MB (covers both sides of the 10 MB boundary)
  const fileSizeArb = fc.integer({ min: 0, max: 15 * 1024 * 1024 });

  it('accepts a file iff MIME is image/jpeg or image/png AND size <= 10 MB', async () => {
    // createImageBitmap resolves for all files in this property (we test MIME/size only, not decode)
    mockCreateImageBitmap.mockResolvedValue({});

    await fc.assert(
      fc.asyncProperty(mimeTypeArb, fileSizeArb, async (mimeType, size) => {
        const content = new Uint8Array(Math.min(size, 1024)); // avoid huge allocations
        const file = new File([content], 'test.img', { type: mimeType });
        // Override size since File constructor uses actual content length
        Object.defineProperty(file, 'size', { value: size, configurable: true });

        const result = await validateImage(file);

        const isValidMime = VALID_MIME_TYPES.includes(mimeType);
        const isValidSize = size <= MAX_SIZE;

        if (isValidMime && isValidSize) {
          // Accepted: must return { valid: true, file }
          expect(result.valid).toBe(true);
          expect(result.file).toBe(file);
        } else {
          // Rejected: must return { valid: false, error: string }
          expect(result.valid).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejected files always return a non-empty error string', async () => {
    mockCreateImageBitmap.mockResolvedValue({});

    // Only generate files that are definitely invalid (wrong MIME or oversized)
    const invalidMimeArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
      s => !VALID_MIME_TYPES.includes(s)
    );
    const oversizedArb = fc.integer({ min: MAX_SIZE + 1, max: 15 * 1024 * 1024 });

    // Invalid MIME type
    await fc.assert(
      fc.asyncProperty(invalidMimeArb, fc.integer({ min: 0, max: MAX_SIZE }), async (mimeType, size) => {
        const content = new Uint8Array(Math.min(size, 1024));
        const file = new File([content], 'test.img', { type: mimeType });
        Object.defineProperty(file, 'size', { value: size, configurable: true });

        const result = await validateImage(file);
        expect(result.valid).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );

    // Oversized file with valid MIME
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...VALID_MIME_TYPES), oversizedArb, async (mimeType, size) => {
        const content = new Uint8Array(1024);
        const file = new File([content], 'test.img', { type: mimeType });
        Object.defineProperty(file, 'size', { value: size, configurable: true });

        const result = await validateImage(file);
        expect(result.valid).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
