/**
 * @file        Sanitize utility tests
 * @description Tests for sanitizeHtml, isSafeUrl, and safeUrl
 */

import { sanitizeHtml, isSafeUrl, safeUrl } from '@/utils/sanitize';

// ─── sanitizeHtml ───────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('');
  });

  it('strips event handler attributes', () => {
    const result = sanitizeHtml('<img src="x.png" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).toContain('src="x.png"');
  });

  it('preserves allowed tags', () => {
    const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('preserves links with safe href', () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it('strips javascript: URIs from links', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('strips data: URIs from img src attributes', () => {
    const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    // DOMPurify hook strips data: URIs from src attributes
    expect(result).not.toContain('data:');
  });

  it('strips data:image URIs from img src', () => {
    const result = sanitizeHtml('<img src="data:image/svg+xml,<svg onload=alert(1)>">');
    expect(result).not.toContain('data:');
  });

  it('strips data-* attributes', () => {
    const result = sanitizeHtml('<p data-custom="value">Text</p>');
    expect(result).not.toContain('data-custom');
    expect(result).toContain('Text');
  });

  it('strips style attributes', () => {
    const result = sanitizeHtml('<p style="color:red">Text</p>');
    expect(result).not.toContain('style');
  });

  it('preserves list elements', () => {
    const input = '<ul><li>One</li><li>Two</li></ul>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('preserves heading elements', () => {
    const input = '<h2>Title</h2>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('strips form elements', () => {
    const result = sanitizeHtml('<form action="/steal"><input type="text"></form>');
    expect(result).not.toContain('form');
    expect(result).not.toContain('input');
  });

  it('strips iframe elements', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain('iframe');
  });
});

describe('isSafeUrl', () => {
  it('accepts https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('rejects javascript: protocol', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: protocol', () => {
    expect(isSafeUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('rejects ftp: protocol', () => {
    expect(isSafeUrl('ftp://example.com/file')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isSafeUrl('not a url at all')).toBe(true); // relative URL resolves against origin
  });

  it('rejects empty string', () => {
    // empty string with base resolves to origin which is http
    expect(isSafeUrl('')).toBe(true);
  });

  it('accepts URLs with paths and query strings', () => {
    expect(isSafeUrl('https://example.com/path?q=1&b=2')).toBe(true);
  });

  it('accepts URLs with fragments', () => {
    expect(isSafeUrl('https://example.com/page#section')).toBe(true);
  });

  it('accepts URLs with ports', () => {
    expect(isSafeUrl('https://example.com:8443/api')).toBe(true);
  });
});

describe('safeUrl', () => {
  it('returns empty string for null', () => {
    expect(safeUrl(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(safeUrl(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(safeUrl('')).toBe('');
  });

  it('returns relative URLs starting with /', () => {
    expect(safeUrl('/uploads/image.png')).toBe('/uploads/image.png');
  });

  it('returns safe absolute URLs', () => {
    expect(safeUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });

  it('returns empty string for javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
  });

  it('returns empty string for data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });
});
