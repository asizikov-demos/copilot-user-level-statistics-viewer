import { TextEncoder } from 'node:util';
import { vi } from 'vitest';

// Vitest port of the browser polyfills in @primer/react/test-helpers, which uses jest.fn().
// DOM-only polyfills are guarded so node-environment tests keep their globals untouched.

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}

if (typeof document !== 'undefined') {
  globalThis.ResizeObserver = vi.fn(function ResizeObserver() {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }) as unknown as typeof ResizeObserver;

  globalThis.CSS = {
    ...globalThis.CSS,
    escape: vi.fn((value: string) => value),
    supports: vi.fn(() => false),
  } as unknown as typeof CSS;

  // JSDOM does not implement <dialog> modal APIs: https://github.com/jsdom/jsdom/issues/3294
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.open = false;
  });

  // Primer tooltips apply @oddbird/popover-polyfill, which needs adoptedStyleSheets (missing in JSDOM).
  for (const proto of [Document.prototype, ShadowRoot.prototype]) {
    if (!('adoptedStyleSheets' in proto)) {
      Object.defineProperty(proto, 'adoptedStyleSheets', { value: [], writable: true, configurable: true });
    }
  }

  if (typeof Element.prototype.scrollIntoView === 'undefined') {
    Element.prototype.scrollIntoView = vi.fn();
  }
}
