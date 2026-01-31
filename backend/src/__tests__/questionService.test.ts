/**
 * @file        Question Service Tests
 * @description Tests for sanitizeOptions and validateReferenceLink
 */

import { QuestionType } from '@prisma/client';
import { sanitizeOptions, validateReferenceLink } from '@/services/questionService';

// ─── sanitizeOptions ─────────────────────────────────────────────────────────

describe('sanitizeOptions', () => {
  describe('null / primitive inputs', () => {
    it('returns null for null input', () => {
      expect(sanitizeOptions(null, QuestionType.MULTIPLE_CHOICE_SINGLE)).toBeNull();
    });

    it('returns undefined for undefined input', () => {
      expect(sanitizeOptions(undefined, QuestionType.TRUE_FALSE)).toBeUndefined();
    });

    it('returns primitive value unchanged', () => {
      expect(sanitizeOptions('string', QuestionType.SLIDER)).toBe('string');
    });
  });

  describe('array-based options (MC, TF, DRAG_ORDER)', () => {
    it('sanitizes text fields in option objects', () => {
      const options = [
        { id: '1', text: '<script>alert("xss")</script>Safe text' },
        { id: '2', text: 'Normal text' },
      ];
      const result = sanitizeOptions(options, QuestionType.MULTIPLE_CHOICE_SINGLE) as typeof options;
      expect(result).toHaveLength(2);
      expect(result[0].text).not.toContain('<script>');
      expect(result[0].text).toContain('Safe text');
      expect(result[1].text).toBe('Normal text');
    });

    it('preserves non-text properties in option objects', () => {
      const options = [
        { id: '1', text: 'Option A', image: '/img.png' },
      ];
      const result = sanitizeOptions(options, QuestionType.MULTIPLE_CHOICE_MULTI) as typeof options;
      expect(result[0].id).toBe('1');
      expect((result[0] as Record<string, unknown>).image).toBe('/img.png');
    });

    it('passes through array items without text field unchanged', () => {
      const options = [42, 'str', { value: 100 }];
      const result = sanitizeOptions(options, QuestionType.DRAG_ORDER) as unknown[];
      expect(result[0]).toBe(42);
      expect(result[1]).toBe('str');
      expect(result[2]).toEqual({ value: 100 });
    });

    it('handles empty array', () => {
      const result = sanitizeOptions([], QuestionType.TRUE_FALSE);
      expect(result).toEqual([]);
    });
  });

  describe('SLIDER options', () => {
    it('sanitizes the unit field', () => {
      const options = { min: 0, max: 100, step: 1, unit: '<b>kg</b>' };
      const result = sanitizeOptions(options, QuestionType.SLIDER) as Record<string, unknown>;
      expect(result.unit).not.toContain('<b>');
      expect(result.min).toBe(0);
      expect(result.max).toBe(100);
    });

    it('preserves slider options without unit', () => {
      const options = { min: 0, max: 100, step: 5 };
      const result = sanitizeOptions(options, QuestionType.SLIDER) as Record<string, unknown>;
      expect(result.min).toBe(0);
      expect(result.max).toBe(100);
      expect(result.step).toBe(5);
    });

    it('does not add unit if not a string', () => {
      const options = { min: 0, max: 100, unit: 42 };
      const result = sanitizeOptions(options, QuestionType.SLIDER) as Record<string, unknown>;
      expect(result.unit).toBe(42);
    });
  });

  describe('IMAGE_MAP options', () => {
    it('returns image map options unchanged (no text to sanitize)', () => {
      const options = { imageUrl: '/map.png', regions: [{ x: 10, y: 20, r: 30 }] };
      const result = sanitizeOptions(options, QuestionType.IMAGE_MAP);
      expect(result).toEqual(options);
    });
  });
});

// ─── validateReferenceLink ───────────────────────────────────────────────────

describe('validateReferenceLink', () => {
  it('returns null for null input', () => {
    expect(validateReferenceLink(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(validateReferenceLink(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(validateReferenceLink('')).toBeNull();
  });

  it('accepts valid https URL', () => {
    expect(validateReferenceLink('https://example.com/page')).toBe('https://example.com/page');
  });

  it('accepts valid http URL', () => {
    expect(validateReferenceLink('http://example.com')).toBe('http://example.com');
  });

  it('rejects javascript: protocol', () => {
    expect(validateReferenceLink('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: protocol', () => {
    expect(validateReferenceLink('data:text/html,<h1>Hi</h1>')).toBeNull();
  });

  it('rejects ftp: protocol', () => {
    expect(validateReferenceLink('ftp://files.example.com')).toBeNull();
  });

  it('rejects invalid URL', () => {
    expect(validateReferenceLink('not a url')).toBeNull();
  });

  it('accepts URL with query params and fragments', () => {
    const url = 'https://example.com/page?q=test#section';
    expect(validateReferenceLink(url)).toBe(url);
  });
});
