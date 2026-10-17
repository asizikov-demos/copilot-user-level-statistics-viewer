// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// Covers guardJsdomEmptySpecificity in setup.ts.
describe('jsdom getComputedStyle', () => {
  it('survives the selector cache state left by an invalid selector', () => {
    document.body.innerHTML = '<div><button type="button">Close</button><span popover="auto">Close</span></div>';
    const elements = [...document.body.querySelectorAll('button, span')];
    const readDisplay = (element: Element) => window.getComputedStyle(element).display;
    elements.forEach(readDisplay);

    expect(() => document.querySelector('!!invalid')).toThrow();
    document.body.append(document.createElement('i'));

    for (const element of elements) {
      expect(() => readDisplay(element)).not.toThrow();
    }
  });
});
