import { describe, it, expect, vi } from 'vitest';
import { postProcessExplanation, countWords, generateExplanation } from './explanationGenerator.js';

const DISCLAIMER =
  'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

describe('countWords', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('hello world foo bar')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });

  it('handles extra whitespace', () => {
    expect(countWords('  hello   world  ')).toBe(2);
  });
});

describe('postProcessExplanation', () => {
  function makeText(wordCount) {
    return Array.from({ length: wordCount }, (_, i) => `word${i}`).join(' ');
  }

  it('appends disclaimer to valid text', () => {
    const text = makeText(150);
    const result = postProcessExplanation(text);
    expect(result.explanation).toContain(DISCLAIMER);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });

  it('returns correct word count excluding disclaimer', () => {
    const text = makeText(150);
    const result = postProcessExplanation(text);
    expect(result.wordCount).toBe(150);
  });

  it('truncates text over 200 words to 200', () => {
    const text = makeText(250);
    const result = postProcessExplanation(text);
    expect(result.wordCount).toBe(200);
  });

  it('preserves text under 120 words (no padding)', () => {
    const text = makeText(50);
    const result = postProcessExplanation(text);
    expect(result.wordCount).toBe(50);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });

  it('strips disclaimer if Bedrock already included it', () => {
    const body = makeText(150);
    const textWithDisclaimer = `${body} ${DISCLAIMER}`;
    const result = postProcessExplanation(textWithDisclaimer);
    // The disclaimer should appear exactly once at the end
    const disclaimerCount = result.explanation.split(DISCLAIMER).length - 1;
    expect(disclaimerCount).toBe(1);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });

  it('throws on empty input', () => {
    expect(() => postProcessExplanation('')).toThrow('empty or not a string');
  });

  it('throws on null input', () => {
    expect(() => postProcessExplanation(null)).toThrow('empty or not a string');
  });

  it('throws on non-string input', () => {
    expect(() => postProcessExplanation(123)).toThrow('empty or not a string');
  });

  it('handles text at exactly 120 words', () => {
    const text = makeText(120);
    const result = postProcessExplanation(text);
    expect(result.wordCount).toBe(120);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });

  it('handles text at exactly 200 words', () => {
    const text = makeText(200);
    const result = postProcessExplanation(text);
    expect(result.wordCount).toBe(200);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });
});

describe('generateExplanation', () => {
  function makeBedrockResponse(text) {
    return {
      output: {
        message: {
          content: [{ text }],
        },
      },
    };
  }

  function makeText(wordCount) {
    return Array.from({ length: wordCount }, (_, i) => `word${i}`).join(' ');
  }

  const classification = { category: 'Common nevus', confidence: 0.85 };
  const metrics = {
    surfaceArea: { value: 25, unit: 'mm2', scaleAvailable: true },
    borderRegularity: 0.8,
    symmetry: 0.7,
    colorUniformity: 0.9,
    boundaryPoints: [],
  };

  it('returns explanation with disclaimer when word count is valid', async () => {
    const mockClient = {
      send: vi.fn().mockResolvedValue(makeBedrockResponse(makeText(150))),
    };

    const result = await generateExplanation(classification, metrics, { client: mockClient });
    expect(result.explanation).toContain(DISCLAIMER);
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });

  it('truncates explanation over 200 words', async () => {
    const mockClient = {
      send: vi.fn().mockResolvedValue(makeBedrockResponse(makeText(250))),
    };

    const result = await generateExplanation(classification, metrics, { client: mockClient });
    // Explanation body should be truncated to 200 words
    const bodyText = result.explanation.replace(`\n\n${DISCLAIMER}`, '');
    expect(countWords(bodyText)).toBe(200);
  });

  it('retries when word count is below 120', async () => {
    const mockClient = {
      send: vi
        .fn()
        .mockResolvedValueOnce(makeBedrockResponse(makeText(50)))
        .mockResolvedValueOnce(makeBedrockResponse(makeText(150))),
    };

    const result = await generateExplanation(classification, metrics, { client: mockClient });
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
    expect(mockClient.send).toHaveBeenCalledTimes(2);
  });

  it('returns short explanation after max retries', async () => {
    const mockClient = {
      send: vi.fn().mockResolvedValue(makeBedrockResponse(makeText(50))),
    };

    const result = await generateExplanation(classification, metrics, { client: mockClient });
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
    // 3 total attempts (initial + 2 retries)
    expect(mockClient.send).toHaveBeenCalledTimes(3);
  });

  it('throws when Bedrock returns no text content', async () => {
    const mockClient = {
      send: vi.fn().mockResolvedValue({ output: { message: { content: [] } } }),
    };

    await expect(
      generateExplanation(classification, metrics, { client: mockClient })
    ).rejects.toThrow('no text content');
  });

  it('handles metrics without scale reference', async () => {
    const noScaleMetrics = {
      ...metrics,
      surfaceArea: { value: null, unit: 'mm2', scaleAvailable: false },
    };
    const mockClient = {
      send: vi.fn().mockResolvedValue(makeBedrockResponse(makeText(150))),
    };

    const result = await generateExplanation(classification, noScaleMetrics, { client: mockClient });
    expect(result.explanation.endsWith(DISCLAIMER)).toBe(true);
  });
});
