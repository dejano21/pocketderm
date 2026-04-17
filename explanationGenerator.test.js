/**
 * Unit tests for explanationGenerator.js
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateExplanation, DISCLAIMER } from './explanationGenerator.js';

vi.mock('./bedrockClient.js', () => ({
  invokeModel: vi.fn(),
}));

import { invokeModel } from './bedrockClient.js';

/** Build a mock Bedrock response with the given text */
function mockResponse(text) {
  return { content: [{ text }] };
}

/** Generate a string of exactly n words */
function makeWords(n) {
  return Array(n).fill('word').join(' ');
}

/**
 * Build a valid explanation of exactly n words that ends with the Disclaimer.
 * The disclaimer is 24 words, so body = n - 24 words + space.
 */
function makeExplanation(wordCount) {
  const disclaimerWords = DISCLAIMER.split(/\s+/).length; // 24
  const bodyCount = wordCount - disclaimerWords;
  if (bodyCount <= 0) return DISCLAIMER;
  const body = makeWords(bodyCount);
  return `${body} ${DISCLAIMER}`;
}

const sampleClassification = { category: 'common nevus', confidence: 0.85 };
const sampleFeatures = {
  borderRegularity: 0.8,
  symmetryScore: 0.75,
  colorUniformity: 0.9,
  boundaryPoints: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
  estimatedAreaMm2: 12.5,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Disclaimer tests ─────────────────────────────────────────────────────────

describe('Disclaimer handling', () => {
  it('returns explanation ending with the Disclaimer when model includes it', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    expect(result.endsWith(DISCLAIMER)).toBe(true);
  });

  it('appends Disclaimer when model omits it', async () => {
    // 150 words without disclaimer — after appending disclaimer it will be ~174 words
    const bodyOnly = makeWords(150);
    invokeModel.mockResolvedValueOnce(mockResponse(bodyOnly));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    expect(result.endsWith(DISCLAIMER)).toBe(true);
  });

  it('does not duplicate Disclaimer when model already ends with it', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    // Count occurrences of DISCLAIMER
    const occurrences = result.split(DISCLAIMER).length - 1;
    expect(occurrences).toBe(1);
  });
});

// ─── ABCDE criteria tests ─────────────────────────────────────────────────────

describe('ABCDE criteria presence', () => {
  const abcdeTerms = ['Asymmetry', 'Border', 'Color', 'Diameter', 'Evolution'];

  it('passes through an explanation that contains all five ABCDE terms', async () => {
    const abcdeBody = `Asymmetry is noted in the lesion shape. Border irregularity is present. Color variation is observed. Diameter appears within normal range. Evolution over time should be monitored. ${makeWords(80)}`;
    const explanation = `${abcdeBody} ${DISCLAIMER}`;
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    for (const term of abcdeTerms) {
      expect(result).toContain(term);
    }
  });

  it('prompt instructs model to reference all five ABCDE criteria', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    await generateExplanation(sampleClassification, sampleFeatures);

    const promptText = invokeModel.mock.calls[0][0].body.messages[0].content[0].text;
    for (const term of abcdeTerms) {
      expect(promptText).toContain(term);
    }
  });
});

// ─── Word count validation and retry logic ────────────────────────────────────

describe('Word count validation and retry', () => {
  it('returns first attempt result when word count is in range (120–200)', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    expect(invokeModel).toHaveBeenCalledTimes(1);
    expect(result).toBe(explanation);
  });

  it('retries when first attempt word count is too low', async () => {
    // First attempt: too short (50 words + disclaimer = ~74 words)
    const shortExplanation = makeExplanation(74);
    // Second attempt: valid (150 words)
    const validExplanation = makeExplanation(150);

    invokeModel
      .mockResolvedValueOnce(mockResponse(shortExplanation))
      .mockResolvedValueOnce(mockResponse(validExplanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    expect(invokeModel).toHaveBeenCalledTimes(2);
    expect(result).toBe(validExplanation);
  });

  it('retries when first attempt word count is too high', async () => {
    // First attempt: too long (250 words)
    const longExplanation = makeExplanation(250);
    // Second attempt: valid (160 words)
    const validExplanation = makeExplanation(160);

    invokeModel
      .mockResolvedValueOnce(mockResponse(longExplanation))
      .mockResolvedValueOnce(mockResponse(validExplanation));

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    expect(invokeModel).toHaveBeenCalledTimes(2);
    expect(result).toBe(validExplanation);
  });

  it('uses stricter prompt on retry', async () => {
    const shortExplanation = makeExplanation(74);
    const validExplanation = makeExplanation(150);

    invokeModel
      .mockResolvedValueOnce(mockResponse(shortExplanation))
      .mockResolvedValueOnce(mockResponse(validExplanation));

    await generateExplanation(sampleClassification, sampleFeatures);

    const firstPrompt = invokeModel.mock.calls[0][0].body.messages[0].content[0].text;
    const secondPrompt = invokeModel.mock.calls[1][0].body.messages[0].content[0].text;

    // Second prompt should contain stricter language
    expect(secondPrompt).toContain('CRITICAL');
    expect(firstPrompt).not.toContain('CRITICAL');
  });
});

// ─── Both attempts fail — truncate/pad and log warning ───────────────────────

describe('Both attempts fail word count', () => {
  it('truncates to MAX_WORDS when both attempts return too many words', async () => {
    const tooLong = makeExplanation(300);

    invokeModel
      .mockResolvedValueOnce(mockResponse(tooLong))
      .mockResolvedValueOnce(mockResponse(tooLong));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    const wordCount = result.trim().split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(200);
    expect(result.endsWith(DISCLAIMER)).toBe(true);

    warnSpy.mockRestore();
  });

  it('pads to MIN_WORDS when both attempts return too few words', async () => {
    const tooShort = makeExplanation(50);

    invokeModel
      .mockResolvedValueOnce(mockResponse(tooShort))
      .mockResolvedValueOnce(mockResponse(tooShort));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await generateExplanation(sampleClassification, sampleFeatures);

    const wordCount = result.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(120);
    expect(result.endsWith(DISCLAIMER)).toBe(true);

    warnSpy.mockRestore();
  });

  it('logs a warning when both attempts fail word count', async () => {
    const tooLong = makeExplanation(300);

    invokeModel
      .mockResolvedValueOnce(mockResponse(tooLong))
      .mockResolvedValueOnce(mockResponse(tooLong));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await generateExplanation(sampleClassification, sampleFeatures);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('Word count out of range');

    warnSpy.mockRestore();
  });
});

// ─── Model uses correct model ID ──────────────────────────────────────────────

describe('Model configuration', () => {
  it('calls invokeModel with the correct model ID', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    await generateExplanation(sampleClassification, sampleFeatures);

    expect(invokeModel.mock.calls[0][0].modelId).toBe(
      'anthropic.claude-3-5-sonnet-20241022-v2:0'
    );
  });

  it('includes classification category and confidence in the prompt', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    await generateExplanation(sampleClassification, sampleFeatures);

    const promptText = invokeModel.mock.calls[0][0].body.messages[0].content[0].text;
    expect(promptText).toContain('common nevus');
    expect(promptText).toContain('85%');
  });

  it('includes all feature metrics in the prompt', async () => {
    const explanation = makeExplanation(150);
    invokeModel.mockResolvedValueOnce(mockResponse(explanation));

    await generateExplanation(sampleClassification, sampleFeatures);

    const promptText = invokeModel.mock.calls[0][0].body.messages[0].content[0].text;
    expect(promptText).toContain('0.80'); // borderRegularity
    expect(promptText).toContain('0.75'); // symmetryScore
    expect(promptText).toContain('0.90'); // colorUniformity
  });
});
