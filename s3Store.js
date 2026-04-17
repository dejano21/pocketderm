/**
 * S3 Store — uploads images to S3 with per-user key prefix and server-side encryption.
 * Requirements: 2.1, 2.2, 2.3
 */

const S3_BUCKET = 'pocketderm-scans';
const S3_REGION = 'us-east-1';

const S3_CONFIG = {
  accessKeyId: '',
  secretAccessKey: '',
};

// ─── AWS Signature V4 helpers ─────────────────────────────────────────────────

async function buildSignedHeaders({ method, host, path, region, service, accessKeyId, secretAccessKey, amzDate, dateStamp, body, extraHeaders }) {
  const payloadHash = await sha256Hex(body);

  // Build canonical headers (sorted alphabetically by header name)
  const allHeaders = {
    'content-type': 'application/octet-stream',
    'host': host,
    'x-amz-date': amzDate,
    'x-amz-server-side-encryption': 'AES256',
    ...extraHeaders,
  };

  const sortedKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${allHeaders[k]}`).join('\n') + '\n';
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/octet-stream',
    'X-Amz-Date': amzDate,
    'X-Amz-Server-Side-Encryption': 'AES256',
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
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bufToHex(buf);
}

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Uploads an image file to S3 under a per-user key prefix with server-side encryption.
 *
 * Key format: `{userId}/{timestamp}-{filename}`
 *
 * @param {File} file - the image file to upload
 * @param {string} userId - the authenticated user's unique identifier
 * @returns {Promise<string>} the S3 key of the uploaded object
 * @throws {Error} immediately on upload failure (pipeline should abort)
 */
export async function uploadImage(file, userId) {
  const timestamp = Date.now();
  const s3Key = `${userId}/${timestamp}-${file.name}`;

  const { accessKeyId, secretAccessKey } = S3_CONFIG;

  const host = `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
  const path = `/${s3Key}`;
  const url = `https://${host}${path}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const bodyBytes = await file.arrayBuffer();

  const headers = await buildSignedHeaders({
    method: 'PUT',
    host,
    path,
    region: S3_REGION,
    service: 's3',
    accessKeyId,
    secretAccessKey,
    amzDate,
    dateStamp,
    body: bodyBytes,
  });

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: bodyBytes,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`S3 upload failed with status ${response.status}: ${errText}`);
  }

  return s3Key;
}
