/**
 * @file        Test setup
 * @description Global test configuration for Vitest + Testing Library
 */

import '@testing-library/jest-dom';

// Mock CSS modules to return empty objects
vi.mock('*.module.css', () => new Proxy({}, { get: (_t, prop) => String(prop) }));

// Stub HTMLDialogElement methods for jsdom (which doesn't implement them)
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});
