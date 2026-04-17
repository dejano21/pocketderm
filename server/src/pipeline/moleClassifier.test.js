import { describe, it, expect } from 'vitest';
import { parseClassificationResponse } from './moleClassifier.js';

describe('parseClassificationResponse', () => {
  it('parses a valid classification response', () => {
    const response = {
      output: {
        message: {
          content: [
            { text: '{"category": "Common nevus", "confidence": 0.85}' },
          ],
        },
      },
    };
    const result = parseClassificationResponse(response);
    expect(result).toEqual({ category: 'Common nevus', confidence: 0.85 });
  });

  it('parses all valid categories', () => {
    const categories = [
      'Common nevus',
      'Atypical nevus',
      'Seborrheic keratosis',
      'Melanoma-suspicious',
      'Other',
    ];
    for (const category of categories) {
      const response = {
        output: {
          message: {
            content: [
              { text: JSON.stringify({ category, confidence: 0.5 }) },
            ],
          },
        },
      };
      const result = parseClassificationResponse(response);
      expect(result.category).toBe(category);
    }
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const response = {
      output: {
        message: {
          content: [
            { text: '```json\n{"category": "Other", "confidence": 0.3}\n```' },
          ],
        },
      },
    };
    const result = parseClassificationResponse(response);
    expect(result).toEqual({ category: 'Other', confidence: 0.3 });
  });

  it('accepts confidence at boundaries (0 and 1)', () => {
    for (const confidence of [0, 1]) {
      const response = {
        output: {
          message: {
            content: [
              { text: JSON.stringify({ category: 'Common nevus', confidence }) },
            ],
          },
        },
      };
      const result = parseClassificationResponse(response);
      expect(result.confidence).toBe(confidence);
    }
  });

  it('throws on missing text content', () => {
    expect(() => parseClassificationResponse({ output: { message: { content: [] } } }))
      .toThrow('no text content');
  });

  it('throws on invalid JSON', () => {
    const response = {
      output: { message: { content: [{ text: 'not json at all' }] } },
    };
    expect(() => parseClassificationResponse(response)).toThrow('does not contain valid JSON');
  });

  it('throws on invalid category', () => {
    const response = {
      output: {
        message: {
          content: [
            { text: '{"category": "Unknown type", "confidence": 0.5}' },
          ],
        },
      },
    };
    expect(() => parseClassificationResponse(response)).toThrow('Invalid category');
  });

  it('throws on confidence out of range', () => {
    for (const confidence of [-0.1, 1.1, 2]) {
      const response = {
        output: {
          message: {
            content: [
              { text: JSON.stringify({ category: 'Other', confidence }) },
            ],
          },
        },
      };
      expect(() => parseClassificationResponse(response)).toThrow('Invalid confidence');
    }
  });

  it('throws on non-numeric confidence', () => {
    const response = {
      output: {
        message: {
          content: [
            { text: '{"category": "Other", "confidence": "high"}' },
          ],
        },
      },
    };
    expect(() => parseClassificationResponse(response)).toThrow('Invalid confidence');
  });

  it('throws on null response', () => {
    expect(() => parseClassificationResponse(null)).toThrow();
  });
});
