/**
 * @file        HTML Sanitization Service
 * @module      Services/Sanitizer
 * @description Sanitize user-provided HTML content to prevent XSS
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const { window } = new JSDOM('');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

/**
 * Allowed HTML tags for rich text content (question prompts, feedback)
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div',
];

/**
 * Allowed HTML attributes
 */
const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'style',
  'colspan', 'rowspan',
];

/**
 * Sanitize HTML content, removing dangerous tags and attributes
 */
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

/**
 * Sanitize plain text - strips all HTML tags
 */
export function sanitizePlainText(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize question option text (limited formatting)
 */
export function sanitizeOptionText(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['strong', 'em', 'u', 'sub', 'sup', 'code', 'br', 'img'],
    ALLOWED_ATTR: ['src', 'alt', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });
}
