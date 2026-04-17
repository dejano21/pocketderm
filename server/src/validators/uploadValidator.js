const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const MAGIC_BYTES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
};

/**
 * Validates an uploaded image file.
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimeType - Declared MIME type from multipart header
 * @param {number} fileSize - File size in bytes
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUpload(fileBuffer, mimeType, fileSize) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: 'File type not supported. Only JPEG and PNG are accepted.' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 10 MB.' };
  }

  const expected = MAGIC_BYTES[mimeType];
  if (!fileBuffer || fileBuffer.length < expected.length) {
    return { valid: false, error: 'File is corrupted or not a valid image.' };
  }

  for (let i = 0; i < expected.length; i++) {
    if (fileBuffer[i] !== expected[i]) {
      return { valid: false, error: 'File is corrupted or not a valid image.' };
    }
  }

  return { valid: true };
}
