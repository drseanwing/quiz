/**
 * Tests for HTML sanitization service
 */
import { sanitizeHtml, sanitizePlainText, sanitizeOptionText } from '../services/sanitizer';

describe('sanitizeHtml', () => {
  it('preserves allowed tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
  });

  it('strips onerror handlers', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).toContain('<img src="x">');
  });

  it('strips event handlers from divs', () => {
    expect(sanitizeHtml('<div onmouseover="alert(1)">text</div>')).toBe('<div>text</div>');
  });

  it('preserves allowed attributes', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    expect(sanitizeHtml(html)).toContain('href="https://example.com"');
  });

  it('strips data attributes', () => {
    expect(sanitizeHtml('<div data-custom="val">text</div>')).toBe('<div>text</div>');
  });

  it('strips style attributes', () => {
    const result = sanitizeHtml('<p style="color:red">text</p>');
    expect(result).not.toContain('style');
  });

  it('preserves img tags with safe attributes', () => {
    const html = '<img src="/uploads/test.png" alt="test" width="200" height="100">';
    const result = sanitizeHtml(html);
    expect(result).toContain('src="/uploads/test.png"');
    expect(result).toContain('alt="test"');
  });

  it('preserves table markup', () => {
    const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
    expect(sanitizeHtml(html)).toContain('<table>');
    expect(sanitizeHtml(html)).toContain('<th>');
  });

  it('strips iframe tags', () => {
    expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
  });

  it('strips form elements', () => {
    expect(sanitizeHtml('<form action="/"><input></form>')).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('preserves class attribute', () => {
    expect(sanitizeHtml('<span class="highlight">text</span>')).toContain('class="highlight"');
  });
});

describe('sanitizePlainText', () => {
  it('strips all HTML tags', () => {
    expect(sanitizePlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('strips images', () => {
    expect(sanitizePlainText('<img src="test.png">')).toBe('');
  });

  it('strips links but preserves text', () => {
    expect(sanitizePlainText('<a href="http://example.com">click</a>')).toBe('click');
  });

  it('handles empty string', () => {
    expect(sanitizePlainText('')).toBe('');
  });
});

describe('sanitizeOptionText', () => {
  it('preserves basic formatting', () => {
    expect(sanitizeOptionText('<strong>bold</strong>')).toBe('<strong>bold</strong>');
    expect(sanitizeOptionText('<em>italic</em>')).toBe('<em>italic</em>');
    expect(sanitizeOptionText('<code>code</code>')).toBe('<code>code</code>');
  });

  it('strips paragraph tags', () => {
    expect(sanitizeOptionText('<p>text</p>')).toBe('text');
  });

  it('strips div tags', () => {
    expect(sanitizeOptionText('<div>text</div>')).toBe('text');
  });

  it('preserves img with safe attributes', () => {
    const result = sanitizeOptionText('<img src="/test.png" alt="test">');
    expect(result).toContain('src="/test.png"');
  });

  it('strips anchor tags', () => {
    expect(sanitizeOptionText('<a href="http://evil.com">link</a>')).toBe('link');
  });
});
