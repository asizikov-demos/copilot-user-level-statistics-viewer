import { describe, it, expect } from 'vitest';
import { splitNdjsonLines } from '../ndjsonParser';

describe('splitNdjsonLines', () => {
  describe('line endings', () => {
    it('handles LF line endings', () => {
      const result = splitNdjsonLines('{"a":1}\n{"b":2}\n{"c":3}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
    });

    it('handles CRLF line endings', () => {
      const result = splitNdjsonLines('{"a":1}\r\n{"b":2}\r\n{"c":3}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
    });

    it('handles mixed LF and CRLF line endings', () => {
      const result = splitNdjsonLines('{"a":1}\r\n{"b":2}\n{"c":3}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
    });
  });

  describe('empty and whitespace lines', () => {
    it('skips empty lines', () => {
      const result = splitNdjsonLines('{"a":1}\n\n{"b":2}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}']);
    });

    it('skips whitespace-only lines', () => {
      const result = splitNdjsonLines('{"a":1}\n   \n{"b":2}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}']);
    });

    it('returns empty array for empty string', () => {
      expect(splitNdjsonLines('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(splitNdjsonLines('   \n  \n\t\n')).toEqual([]);
    });
  });

  describe('trailing newline handling', () => {
    it('handles file with trailing newline', () => {
      const result = splitNdjsonLines('{"a":1}\n{"b":2}\n');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}']);
    });

    it('handles file without trailing newline', () => {
      const result = splitNdjsonLines('{"a":1}\n{"b":2}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}']);
    });

    it('handles single line without trailing newline', () => {
      const result = splitNdjsonLines('{"a":1}');
      expect(result.map(r => r.line)).toEqual(['{"a":1}']);
    });
  });

  describe('line number tracking', () => {
    it('returns correct 1-based line numbers', () => {
      const result = splitNdjsonLines('{"a":1}\n{"b":2}\n{"c":3}');
      expect(result.map(r => r.lineNumber)).toEqual([1, 2, 3]);
    });

    it('line numbers account for skipped empty lines', () => {
      const result = splitNdjsonLines('{"a":1}\n\n{"c":3}');
      expect(result[0].lineNumber).toBe(1);
      expect(result[1].lineNumber).toBe(3);
    });

    it('line numbers account for skipped whitespace lines', () => {
      const result = splitNdjsonLines('\n{"b":2}\n\n{"d":4}');
      expect(result[0].lineNumber).toBe(2);
      expect(result[1].lineNumber).toBe(4);
    });
  });

  describe('line trimming', () => {
    it('trims leading and trailing whitespace from lines', () => {
      const result = splitNdjsonLines('  {"a":1}  \n\t{"b":2}\t');
      expect(result.map(r => r.line)).toEqual(['{"a":1}', '{"b":2}']);
    });
  });

  describe('single line input', () => {
    it('handles single non-JSON line', () => {
      const result = splitNdjsonLines('hello');
      expect(result).toEqual([{ line: 'hello', lineNumber: 1 }]);
    });
  });
});
