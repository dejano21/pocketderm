// ─── AWS Bedrock Skin Analysis ────────────────────────────────────────────────
// Configure your AWS credentials and region here.
// For production, use AWS Cognito Identity Pool or a backend proxy instead of
// embedding credentials in the browser.

const BEDROCK_CONFIG = {
  region: 'us-east-1',           // e.g. 'us-east-1'
  accessKeyId: '',               // AWS Access Key ID
  secretAccessKey: '',           // AWS Secret Access Key
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
};

const ANALYSIS_PROMPT = `You are a dermatology AI screening assistant. Analyze this skin lesion image and respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON.

Return this exact structure:
{
  "label": "Benign Nevus" | "Atypical Nevus" | "Suspicious Lesion",
  "risk": "low" | "moderate" | "high",
  "confidence": <number between 0.0 and 1.0>,
  "description": "<one sentence summary>",
  "explanation": "<2-3 paragraph HTML explanation using <strong> and <em> tags where appropriate>",
  "dermSummary": "<clinical one-paragraph summary for a dermatologist>",
  "nextSteps": [
    { "type": "green" | "yellow" | "red", "icon": "<emoji>", "text": "<action text>" }
  ],
  "metrics": {
    "estimatedAreaMm2": <number>,
    "borderRegularity": "Regular" | "Mildly Irregular" | "Irregular",
    "symmetryScore": <number between 0.0 and 1.0>,
    "colorUniformity": "Uniform" | "Mild variation" | "Multi-tonal"
  }
}

Base your analysis on visible ABCDE criteria: Asymmetry, Border, Color, Diameter (estimate), Evolution indicators.
Always include a disclaimer that this is a screening aid, not a medical diagnosis, in the explanation field.`;

/**
 * Converts a base64 data URL to a plain base64 string and extracts media type.
 */
function parseDataURL(dataURL) {
  const match = dataURL.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');
  return { mediaType: match[1], base64: match[2] };
}

/**
 * Signs and sends a request to AWS Bedrock using AWS Signature Version 4.
 * @param {string} imageDataURL - base64 data URL of the uploaded image
 * @returns {Promise<object>} parsed analysis result
 */
async function analyzeWithBedrock(imageDataURL) {
  const { region, accessKeyId, secretAccessKey, modelId } = BEDROCK_CONFIG;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Set accessKeyId and secretAccessKey in bedrock.js');
  }

  const { mediaType, base64 } = parseDataURL(imageDataURL);

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });

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

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Bedrock API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text ?? '';

  // Strip any accidental markdown code fences
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── AWS Signature V4 helpers ─────────────────────────────────────────────────

async function buildSignedHeaders({ method, host, path, region, service, accessKeyId, secretAccessKey, amzDate, dateStamp, body }) {
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';

  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

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
