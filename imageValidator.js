/**
 * Image validation module for the AI Mole Analysis Pipeline.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates an uploaded file for MIME type, size, and decodability.
 *
 * @param {File} file
 * @returns {Promise<{ valid: true, file: File } | { valid: false, error: string }>}
 */
async function validateImage(file) {
  // Check 1: MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG and PNG files are supported.' };
  }

  // Check 2: File size
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File must be 10 MB or smaller.' };
  }

  // Check 3: Decodability via createImageBitmap
  try {
    await createImageBitmap(file);
  } catch {
    return { valid: false, error: 'The file could not be read as an image.' };
  }

  return { valid: true, file };
}

export { validateImage };
