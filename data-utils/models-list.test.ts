import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNdjsonLines } from './models-list';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('parseNdjsonLines', () => {
  describe('line endings', () => {
    it('parses LF-delimited NDJSON', () => {
      const result = parseNdjsonLines('{"a":1}\n{"b":2}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('parses CRLF-delimited NDJSON', () => {
      const result = parseNdjsonLines('{"a":1}\r\n{"b":2}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('parses mixed LF and CRLF line endings', () => {
      const result = parseNdjsonLines('{"a":1}\r\n{"b":2}\n{"c":3}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    });
  });

  describe('blank lines', () => {
    it('skips blank lines between records', () => {
      const result = parseNdjsonLines('{"a":1}\n\n{"b":2}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('skips whitespace-only lines', () => {
      const result = parseNdjsonLines('{"a":1}\n   \n{"b":2}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('returns empty array for whitespace-only content', () => {
      expect(parseNdjsonLines('   \n  ', 'test.ndjson')).toEqual([]);
    });
  });

  describe('missing terminal newline', () => {
    it('parses file without trailing newline', () => {
      const result = parseNdjsonLines('{"a":1}\n{"b":2}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('parses single-line file without trailing newline', () => {
      const result = parseNdjsonLines('{"a":1}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }]);
    });
  });

  describe('invalid JSON diagnostics', () => {
    it('warns with correct 1-based line number for invalid JSON', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      parseNdjsonLines('{"a":1}\nNOT_JSON', 'test.ndjson');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('line 2'),
      );
    });

    it('reports original line number when blank lines precede the invalid line', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      // blank line 2, invalid JSON on original line 3
      parseNdjsonLines('{"a":1}\n\nNOT_JSON', 'test.ndjson');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('line 3'),
      );
    });

    it('skips invalid lines and continues parsing', () => {
      const result = parseNdjsonLines('{"a":1}\nNOT_JSON\n{"c":3}', 'test.ndjson');
      expect(result).toEqual([{ a: 1 }, { c: 3 }]);
    });

    it('includes the file name in the warning message', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      parseNdjsonLines('NOT_JSON', 'my-report.ndjson');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-report.ndjson'),
      );
    });
  });
});
