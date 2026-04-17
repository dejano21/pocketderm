/**
 * Unit tests for s3Store.js
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage } from './s3Store.js';

// Helper to create a minimal File-like object
function makeFile(name = 'mole.jpg', size = 1024, type = 'image/jpeg') {
  const bytes = new Uint8Array(size).fill(0);
  return new File([bytes], name, { type });
}

describe('s3Store.uploadImage', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an S3 key starting with the userId prefix', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const userId = 'user-abc-123';
    const file = makeFile('scan.jpg');
    const key = await uploadImage(file, userId);

    expect(key.startsWith(`${userId}/`)).toBe(true);
  });

  it('returns a key matching the format {userId}/{timestamp}-{filename}', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const userId = 'user-xyz-456';
    const filename = 'lesion.png';
    const file = makeFile(filename);

    const before = Date.now();
    const key = await uploadImage(file, userId);
    const after = Date.now();

    // Key format: {userId}/{timestamp}-{filename}
    const pattern = new RegExp(`^${userId}/(\\d+)-${filename}$`);
    expect(key).toMatch(pattern);

    // Timestamp should be within the test window
    const match = key.match(/\/(\d+)-/);
    const ts = parseInt(match[1], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('throws immediately on S3 upload failure without making further calls', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const file = makeFile('scan.jpg');
    await expect(uploadImage(file, 'user-fail')).rejects.toThrow('S3 upload failed with status 500');

    // fetch should have been called exactly once — no retries
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on network error (fetch rejects)', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const file = makeFile('scan.jpg');
    await expect(uploadImage(file, 'user-net')).rejects.toThrow('Network error');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the x-amz-server-side-encryption header with value AES256', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const file = makeFile('scan.jpg');
    await uploadImage(file, 'user-sse');

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers;

    expect(headers['X-Amz-Server-Side-Encryption']).toBe('AES256');
  });

  it('uses PUT method for the S3 upload', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const file = makeFile('scan.jpg');
    await uploadImage(file, 'user-method');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('PUT');
  });
});
