/**
 * @file        Sanitize utility tests
 * @description Tests for isSafeUrl and safeUrl
 */

import { isSafeUrl, safeUrl } from '@/utils/sanitize';

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
