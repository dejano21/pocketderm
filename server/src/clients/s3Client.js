import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pocket-derm-images';

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/**
 * Creates a configured S3Client instance.
 * @param {{ region?: string }} options
 * @returns {S3Client}
 */
export function createS3Client({ region = process.env.AWS_REGION || 'us-east-1' } = {}) {
  return new S3Client({ region });
}

/**
 * Generates an S3 object key for a user's scan image.
 * @param {string} userId
 * @param {string} scanId
 * @param {string} mimeType - "image/jpeg" or "image/png"
 * @returns {string} S3 key in the format users/{userId}/scans/{scanId}.{ext}
 */
export function generateKey(userId, scanId, mimeType) {
  const ext = MIME_TO_EXT[mimeType] || 'jpg';
  return `users/${userId}/scans/${scanId}.${ext}`;
}

/**
 * Stores an image in S3 with server-side encryption.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} userId - User identifier
 * @param {string} scanId - Scan identifier (UUID)
 * @param {string} mimeType - "image/jpeg" or "image/png"
 * @param {{ client?: S3Client }} [options] - Injectable dependencies for testing
 * @returns {Promise<string>} The S3 key where the image was stored
 */
export async function storeImage(imageBuffer, userId, scanId, mimeType, options = {}) {
  const client = options.client || createS3Client();
  const key = generateKey(userId, scanId, mimeType);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
  });

  await client.send(command);
  return key;
}
