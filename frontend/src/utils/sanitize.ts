/**
 * @file        HTML sanitization utility
 * @description Client-side sanitization using DOMPurify for defense-in-depth
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'sub', 'sup', 'span', 'div', 'img',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'class'];

/** Only allow http, https, and mailto URI schemes */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

// Strip data: URIs from src attributes (DOMPurify's URI regexp only targets href)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('src')) {
    const src = node.getAttribute('src') || '';
    if (/^data:/i.test(src)) {
      node.removeAttribute('src');
    }
  }
});

/** Sanitize HTML for safe rendering via dangerouslySetInnerHTML */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP,
  });
}

/** Validate that a URL is safe (http/https only) */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Return the URL if safe, otherwise empty string */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Allow relative URLs (starting with /)
  if (url.startsWith('/')) return url;
  return isSafeUrl(url) ? url : '';
}
